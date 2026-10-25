-- Planlar ve zincir limitleri, depolama tasarrufu, tek çağrıda zincir hesabı
-- ve check-in tarafında bir saat dilimi açığının kapatılması.

-- ---------------------------------------------------------------------------
-- 1) Planlar: free 2, pro 5, max 10 aktif zincir
-- ---------------------------------------------------------------------------
-- plan sütunu profiles için verilen sütun bazlı UPDATE yetkilerinde yok;
-- istemci kendi planını değiştiremez, sadece sunucu (service role) değiştirir.
alter table public.profiles
  add column plan text not null default 'free' check (plan in ('free', 'pro', 'max'));

create function public.plan_chain_limit(p_plan text)
returns integer
language sql
immutable
set search_path = ''
as $$
  select case p_plan when 'max' then 10 when 'pro' then 5 else 2 end;
$$;

create function public.enforce_chain_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
begin
  -- Aynı kullanıcının eşzamanlı eklemelerini sıraya sokar.
  select plan into v_plan from public.profiles where id = new.owner_id for update;

  if (
    select count(*) from public.chains
    where owner_id = new.owner_id and archived_at is null
  ) >= public.plan_chain_limit(v_plan) then
    raise exception 'chain_limit';
  end if;

  -- Arşivle-yeniden-oluştur ile sınırsız satır üretilmesini engeller.
  if (select count(*) from public.chains where owner_id = new.owner_id) >= 50 then
    raise exception 'chain_total_limit';
  end if;

  return new;
end;
$$;

create trigger chains_limit
  before insert on public.chains
  for each row execute function public.enforce_chain_limit();

-- ---------------------------------------------------------------------------
-- 2) Geçersiz saat dilimi kabul edilmez (user_today hata vermesin)
-- ---------------------------------------------------------------------------
create function public.validate_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1 from pg_catalog.pg_timezone_names where name = new.timezone
  ) then
    raise exception 'invalid_timezone';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_timezone
  before insert or update of timezone on public.profiles
  for each row execute function public.validate_timezone();

-- ---------------------------------------------------------------------------
-- 3) check_ins: daha küçük satır, tek indeks
-- ---------------------------------------------------------------------------
alter table public.check_ins add column is_joker boolean not null default false;
update public.check_ins set is_joker = (kind = 'joker');

drop index public.check_ins_user_day_idx;
alter table public.check_ins
  drop constraint check_ins_pkey,
  drop constraint if exists check_ins_chain_id_day_key,
  drop column id,
  drop column created_at,
  drop column kind;
alter table public.check_ins add primary key (chain_id, day);

-- Sıralama sorguları (kullanıcı + tarih, sadece tamamlananlar).
create index check_ins_user_day_idx on public.check_ins (user_id, day) where not is_joker;

-- ---------------------------------------------------------------------------
-- 4) chain_history: 60 günden eski günler aylık bit maskesine sıkıştırılır
-- ---------------------------------------------------------------------------
-- Ayın d. günü, (d - 1). bit. Yılda zincir başına ~365 yerine 12 satır.
create table public.chain_history (
  chain_id uuid not null references public.chains (id) on delete cascade,
  month date not null,
  done_mask integer not null default 0,
  joker_mask integer not null default 0,
  primary key (chain_id, month)
);

alter table public.chain_history enable row level security;
revoke all on public.chain_history from anon, authenticated;
grant select on public.chain_history to authenticated;
-- Zincirini görebilen (sahibi ya da arkadaşı) geçmişini de görür; chains RLS'i uygulanır.
create policy chain_history_select on public.chain_history
  for select to authenticated
  using (exists (select 1 from public.chains c where c.id = chain_history.chain_id));

create function public.compact_chain(p_chain_id uuid, p_before date)
returns void
language sql
security definer
set search_path = ''
as $$
  with moved as (
    delete from public.check_ins
    where chain_id = p_chain_id and day < p_before
    returning day, is_joker
  )
  insert into public.chain_history (chain_id, month, done_mask, joker_mask)
  select
    p_chain_id,
    date_trunc('month', day)::date,
    coalesce(bit_or(case when not is_joker then 1 << (extract(day from day)::int - 1) end), 0),
    coalesce(bit_or(case when is_joker then 1 << (extract(day from day)::int - 1) end), 0)
  from moved
  group by date_trunc('month', day)::date
  on conflict (chain_id, month) do update
    set done_mask = public.chain_history.done_mask | excluded.done_mask,
        joker_mask = public.chain_history.joker_mask | excluded.joker_mask;
$$;

-- ---------------------------------------------------------------------------
-- 5) RPC'ler (yeni şemaya göre)
-- ---------------------------------------------------------------------------
create or replace function public.settle_chain(p_chain_id uuid)
returns public.chains
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chains;
  today date;
  d date;
  week_start date;
  used integer;
begin
  select * into c from public.chains
  where id = p_chain_id and owner_id = auth.uid()
  for update;
  if not found then
    raise exception 'chain not found';
  end if;

  today := public.user_today(auth.uid());

  -- Kaçırılan gün yoksa hiçbir şey yazma.
  if c.last_day is null or c.current_length = 0 or c.last_day >= today - 1 then
    return c;
  end if;

  d := c.last_day + 1;
  while d < today loop
    week_start := date_trunc('week', d)::date;
    select count(*) into used from public.check_ins
    where chain_id = c.id and is_joker
      and day >= week_start and day < week_start + 7;

    if used < c.weekly_jokers then
      insert into public.check_ins (chain_id, user_id, day, is_joker)
      values (c.id, c.owner_id, d, true);
      c.last_day := d;
      d := d + 1;
    else
      update public.chains
      set current_length = 0, last_day = null, break_count = break_count + 1
      where id = c.id
      returning * into c;
      return c;
    end if;
  end loop;

  update public.chains set last_day = c.last_day where id = c.id returning * into c;
  return c;
end;
$$;

-- Kullanıcının tüm aktif zincirlerini tek çağrıda hesaplar.
create function public.settle_my_chains()
returns setof public.chains
language plpgsql
security definer
set search_path = ''
as $$
declare
  r uuid;
  c public.chains;
begin
  for r in
    select id from public.chains
    where owner_id = auth.uid() and archived_at is null
    order by created_at
  loop
    c := public.settle_chain(r);
    return next c;
  end loop;
  return;
end;
$$;

create or replace function public.check_in(p_chain_id uuid)
returns public.chains
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chains;
  today date;
begin
  c := public.settle_chain(p_chain_id);
  if c.archived_at is not null then
    raise exception 'chain is archived';
  end if;

  today := public.user_today(auth.uid());

  -- Bugün (ya da saat dilimi değişmişse daha ilerideki bir gün) zaten işlenmişse tekrar sayma.
  -- Saat dilimini ileri-geri değiştirerek aynı gün iki halka kazanmayı engeller.
  if c.last_day is not null and c.last_day >= today then
    return c;
  end if;

  insert into public.check_ins (chain_id, user_id, day, is_joker)
  values (c.id, c.owner_id, today, false);

  update public.chains
  set current_length = current_length + 1,
      best_length = greatest(best_length, current_length + 1),
      total_completed = total_completed + 1,
      last_day = today
  where id = c.id
  returning * into c;

  update public.profiles set total_completed = total_completed + 1 where id = auth.uid();

  -- 60 günden eski günleri sıkıştır (yoksa sadece bir indeks bakışı).
  if exists (
    select 1 from public.check_ins where chain_id = c.id and day < today - 60
  ) then
    perform public.compact_chain(c.id, today - 60);
  end if;

  return c;
end;
$$;

-- Not: sıralama sadece son 60 günü kapsar (haftalık/aylık lig için yeterli).
create or replace function public.friends_leaderboard(p_from date)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  completed bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with members as (
    select auth.uid() as id
    union
    select case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
    from public.friendships f
    where f.status = 'accepted'
      and auth.uid() in (f.requester_id, f.addressee_id)
  )
  select p.id, p.username, p.display_name, p.avatar_url, count(ci.day) as completed
  from members m
  join public.profiles p on p.id = m.id
  left join public.check_ins ci
    on ci.user_id = p.id and not ci.is_joker and ci.day >= p_from
  group by p.id
  order by completed desc, p.username;
$$;

-- ---------------------------------------------------------------------------
-- 6) Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.plan_chain_limit(text), public.compact_chain(uuid, date), public.settle_my_chains()
  from public, anon, authenticated;
grant execute on function public.settle_my_chains() to authenticated;
