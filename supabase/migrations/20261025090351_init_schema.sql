-- The Chain: çekirdek şema (profiller, zincirler, check-in'ler, arkadaşlık).
-- Ortak zincirler Faz 2'de ayrı bir migration ile eklenecek.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique check (username ~ '^[a-z0-9_]{3,20}$'),
  display_name text,
  avatar_url text,
  timezone text not null default 'UTC',
  -- Ömür boyu tamamlanan halka sayısı; zincir kırılınca düşmez.
  total_completed integer not null default 0,
  created_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- chains
-- ---------------------------------------------------------------------------
create table public.chains (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  color text not null default '#f97316' check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- build: bir şeyi yap, quit: bir şeyi bırak (günlük "temiz kaldım" onayı)
  kind text not null default 'build' check (kind in ('build', 'quit')),
  visibility text not null default 'private' check (visibility in ('private', 'friends')),
  weekly_jokers smallint not null default 2 check (weekly_jokers between 0 and 7),
  -- Sayaçlar yalnızca RPC'ler tarafından güncellenir.
  current_length integer not null default 0,
  best_length integer not null default 0,
  total_completed integer not null default 0,
  break_count integer not null default 0,
  -- Zincirin korunduğu son gün (done veya joker); kullanıcının saat dilimine göre.
  last_day date,
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index chains_owner_idx on public.chains (owner_id) where archived_at is null;

-- ---------------------------------------------------------------------------
-- check_ins
-- ---------------------------------------------------------------------------
create table public.check_ins (
  id bigint generated always as identity primary key,
  chain_id uuid not null references public.chains (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('done', 'joker')),
  created_at timestamptz not null default now(),
  unique (chain_id, day)
);

create index check_ins_user_day_idx on public.check_ins (user_id, day) where kind = 'done';

-- ---------------------------------------------------------------------------
-- friendships
-- ---------------------------------------------------------------------------
create table public.friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  check (requester_id <> addressee_id)
);

create unique index friendships_pair_idx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index friendships_addressee_idx on public.friendships (addressee_id);

create function public.are_friends(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b)
        or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS ve yetkiler
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.chains enable row level security;
alter table public.check_ins enable row level security;
alter table public.friendships enable row level security;

revoke all on public.profiles, public.chains, public.check_ins, public.friendships
  from anon, authenticated;

-- profiles: giriş yapan herkes okuyabilir (kullanıcı adı ile arkadaş arama), sadece kendi satırını düzenler.
grant select on public.profiles to authenticated;
grant update (username, display_name, avatar_url, timezone) on public.profiles to authenticated;
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- chains: sayaçlar istemciden yazılamaz.
grant select, delete on public.chains to authenticated;
grant insert (owner_id, title, color, kind, visibility) on public.chains to authenticated;
grant update (title, color, visibility, archived_at) on public.chains to authenticated;
create policy chains_select on public.chains
  for select to authenticated
  using (
    owner_id = auth.uid()
    or (visibility = 'friends' and public.are_friends(auth.uid(), owner_id))
  );
create policy chains_insert on public.chains
  for insert to authenticated with check (owner_id = auth.uid());
create policy chains_update on public.chains
  for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy chains_delete on public.chains
  for delete to authenticated using (owner_id = auth.uid());

-- check_ins: sadece okunur; yazma check_in() RPC'si ile.
grant select on public.check_ins to authenticated;
create policy check_ins_select on public.check_ins
  for select to authenticated
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.chains c
      where c.id = chain_id
        and c.visibility = 'friends'
        and public.are_friends(auth.uid(), c.owner_id)
    )
  );

-- friendships
grant select, delete on public.friendships to authenticated;
grant insert (requester_id, addressee_id) on public.friendships to authenticated;
grant update (status) on public.friendships to authenticated;
create policy friendships_select on public.friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy friendships_insert on public.friendships
  for insert to authenticated with check (requester_id = auth.uid());
create policy friendships_accept on public.friendships
  for update to authenticated
  using (addressee_id = auth.uid() and status = 'pending')
  with check (addressee_id = auth.uid());
create policy friendships_delete on public.friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ---------------------------------------------------------------------------
-- RPC: zincir mantığı
-- ---------------------------------------------------------------------------

-- Kullanıcının saat dilimine göre bugün.
create function public.user_today(p_user_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select (now() at time zone coalesce(
    (select timezone from public.profiles where id = p_user_id), 'UTC'))::date;
$$;

-- Kaçırılan günleri haftalık joker hakkıyla kapatır; hak yoksa aktif zinciri sıfırlar.
-- Cron yok: zincir açılırken ve check-in sırasında tembel (lazy) hesaplanır.
create function public.settle_chain(p_chain_id uuid)
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
  if c.last_day is null or c.current_length = 0 then
    return c;
  end if;

  d := c.last_day + 1;
  while d < today loop
    week_start := date_trunc('week', d)::date;
    select count(*) into used from public.check_ins
    where chain_id = c.id and kind = 'joker'
      and day >= week_start and day < week_start + 7;

    if used < c.weekly_jokers then
      insert into public.check_ins (chain_id, user_id, day, kind)
      values (c.id, c.owner_id, d, 'joker');
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

-- Bugünün halkasını tamamlar (quit zincirlerinde "bugün temiz kaldım").
create function public.check_in(p_chain_id uuid)
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
  if exists (
    select 1 from public.check_ins
    where chain_id = c.id and day = today and kind = 'done'
  ) then
    return c;
  end if;

  insert into public.check_ins (chain_id, user_id, day, kind)
  values (c.id, c.owner_id, today, 'done');

  update public.chains
  set current_length = current_length + 1,
      best_length = greatest(best_length, current_length + 1),
      total_completed = total_completed + 1,
      last_day = today
  where id = c.id
  returning * into c;

  update public.profiles set total_completed = total_completed + 1 where id = auth.uid();

  return c;
end;
$$;

-- quit zincirlerinde nüks: aktif zincir sıfırlanır, ömür boyu toplam düşmez.
create function public.report_relapse(p_chain_id uuid)
returns public.chains
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chains;
begin
  update public.chains
  set current_length = 0, last_day = null, break_count = break_count + 1
  where id = p_chain_id and owner_id = auth.uid() and kind = 'quit'
  returning * into c;
  if not found then
    raise exception 'chain not found';
  end if;
  return c;
end;
$$;

-- Arkadaş sıralaması: ben + kabul edilmiş arkadaşlar, p_from tarihinden beri tamamlanan halkalar.
create function public.friends_leaderboard(p_from date)
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
  select p.id, p.username, p.display_name, p.avatar_url, count(ci.id) as completed
  from members m
  join public.profiles p on p.id = m.id
  left join public.check_ins ci
    on ci.user_id = p.id and ci.kind = 'done' and ci.day >= p_from
  group by p.id
  order by completed desc, p.username;
$$;

-- RPC'ler yalnızca giriş yapmış kullanıcılar için.
revoke execute on function
  public.settle_chain(uuid), public.check_in(uuid), public.report_relapse(uuid),
  public.friends_leaderboard(date), public.user_today(uuid), public.are_friends(uuid, uuid)
  from public, anon;
grant execute on function
  public.settle_chain(uuid), public.check_in(uuid), public.report_relapse(uuid),
  public.friends_leaderboard(date), public.are_friends(uuid, uuid)
  to authenticated;
