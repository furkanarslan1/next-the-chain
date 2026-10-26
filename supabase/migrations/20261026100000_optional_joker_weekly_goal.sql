-- İsteğe bağlı joker ve haftalık hedefli zincir.
--
-- 1) Joker hakkı zincir başına 0, 1 ya da 2 seçilebilir (varsayılan 2). Hakkı azaltmak anında,
--    artırmak bir sonraki Pazartesi'den geçerli olur (kaçırılan güne geriye dönük hak verilmez).
--    Ortak zincirde hak grup kurulurken tek değer olarak seçilir ve sonradan değişmez.
-- 2) Haftalık hedefli zincir: "haftada N gün" (1-6). Hafta (Pzt-Paz) bitince o haftada en az N
--    halka eklenmemişse zincir kırılır. Bu zincirlerde joker yoktur. Zincirin ilk (kısmi) haftasında
--    hedef, kalan gün sayısını aşamaz.

-- ---------------------------------------------------------------------------
-- Şema
-- ---------------------------------------------------------------------------
alter table public.chain_groups
  add column weekly_jokers smallint not null default 2 check (weekly_jokers between 0 and 2);

alter table public.chains
  add column pending_weekly_jokers smallint check (pending_weekly_jokers between 0 and 2),
  -- Bekleyen artışın geçerli olacağı ilk gün (kullanıcının yerel Pazartesi'si).
  add column pending_jokers_from date,
  add column goal_per_week smallint check (goal_per_week between 1 and 6),
  -- Güncel serinin ilk halka günü (haftalık zincirde ilk haftanın kısmi hedefi için).
  add column streak_started_on date,
  add constraint chains_pending_jokers_pair
    check ((pending_weekly_jokers is null) = (pending_jokers_from is null)),
  add constraint chains_weekly_goal_rules
    check (goal_per_week is null or (weekly_jokers = 0 and pending_weekly_jokers is null and group_id is null));

-- Haftalık hedefli zincirde joker her zaman 0'dır; istemci ayrıca göndermek zorunda kalmaz.
create function public.normalize_weekly_goal_chain()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.goal_per_week is not null then
    new.weekly_jokers := 0;
    new.pending_weekly_jokers := null;
    new.pending_jokers_from := null;
  end if;
  return new;
end;
$$;

create trigger chains_normalize_weekly_goal
  before insert on public.chains
  for each row execute function public.normalize_weekly_goal_chain();

-- İstemci yeni zincirde joker ve hedefi seçebilir (sayaçlar hâlâ yazılamaz).
grant insert (weekly_jokers, goal_per_week) on public.chains to authenticated;

drop policy chains_insert on public.chains;
create policy chains_insert on public.chains
  for insert to authenticated
  with check (
    owner_id = auth.uid()
    and weekly_jokers between 0 and 2
    and (goal_per_week is null or goal_per_week between 1 and 6)
  );

-- ---------------------------------------------------------------------------
-- settle_chain_for: bekleyen joker artışı ve haftalık hedef
-- ---------------------------------------------------------------------------
create or replace function public.settle_chain_for(p_chain_id uuid, p_user uuid)
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
  cur_week date;
  used integer;
  allowed integer;
  required integer;
  n_done integer;
begin
  select * into c from public.chains
  where id = p_chain_id and owner_id = p_user
  for update;
  if not found then
    raise exception 'chain not found';
  end if;

  today := public.user_today(p_user);

  -- Haftalık hedef: biten her hafta için en az hedef kadar halka olmalı. Son halkanın haftasından
  -- başlanır (öncesi o halka eklenirken zaten doğrulanmıştır); tamamen boş bir hafta hemen kırar.
  if c.goal_per_week is not null then
    if c.current_length = 0 or c.last_day is null then
      return c;
    end if;

    cur_week := date_trunc('week', today)::date;
    week_start := date_trunc('week', c.last_day)::date;
    while week_start < cur_week loop
      required := least(
        c.goal_per_week,
        7 - greatest(coalesce(c.streak_started_on, week_start) - week_start, 0)
      );
      select count(*) into n_done from public.check_ins
      where chain_id = c.id and not is_joker
        and day >= week_start and day < week_start + 7;

      if n_done < required then
        update public.chains
        set current_length = 0, last_day = null, streak_started_on = null,
            break_count = break_count + 1
        where id = c.id
        returning * into c;
        return c;
      end if;
      week_start := week_start + 7;
    end loop;
    return c;
  end if;

  -- Günlük zincir: kaçırılan günler jokerle kapanır, hak bittiyse zincir kırılır.
  if c.last_day is not null and c.current_length > 0 and c.last_day < today - 1 then
    d := c.last_day + 1;
    while d < today loop
      week_start := date_trunc('week', d)::date;
      -- Bekleyen artış, geçerli olacağı günden önceki günlere uygulanmaz.
      allowed := case
        when c.pending_jokers_from is not null and d >= c.pending_jokers_from
          then c.pending_weekly_jokers
        else c.weekly_jokers
      end;
      select count(*) into used from public.check_ins
      where chain_id = c.id and is_joker
        and day >= week_start and day < week_start + 7;

      if used < allowed then
        insert into public.check_ins (chain_id, user_id, day, is_joker)
        values (c.id, c.owner_id, d, true);
        c.last_day := d;
        d := d + 1;
      else
        update public.chains
        set current_length = 0, last_day = null, streak_started_on = null,
            break_count = break_count + 1
        where id = c.id
        returning * into c;
        exit;
      end if;
    end loop;

    if c.current_length > 0 then
      update public.chains set last_day = c.last_day where id = c.id returning * into c;
    end if;
  end if;

  -- Bekleyen artış geçerli olduysa uygula.
  if c.pending_jokers_from is not null and c.pending_jokers_from <= today then
    update public.chains
    set weekly_jokers = pending_weekly_jokers,
        pending_weekly_jokers = null,
        pending_jokers_from = null
    where id = c.id
    returning * into c;
  end if;

  return c;
end;
$$;

-- ---------------------------------------------------------------------------
-- check_in: seri başlangıç gününü yazar (haftalık hedefin ilk haftası için)
-- ---------------------------------------------------------------------------
create or replace function public.check_in(p_chain_id uuid)
returns public.chains
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.chains;
  today date;
  first_of_day boolean;
begin
  c := public.settle_chain(p_chain_id);
  if c.archived_at is not null then
    raise exception 'chain is archived';
  end if;

  today := public.user_today(auth.uid());

  -- Bugün (ya da saat dilimi değişmişse daha ilerideki bir gün) zaten işlenmişse tekrar sayma.
  if c.last_day is not null and c.last_day >= today then
    return c;
  end if;

  -- Bugün başka bir zincirde halka eklenmediyse bu, günün ilk halkasıdır.
  first_of_day := not exists (
    select 1 from public.check_ins
    where user_id = auth.uid() and day = today and not is_joker
  );

  insert into public.check_ins (chain_id, user_id, day, is_joker)
  values (c.id, c.owner_id, today, false);

  update public.chains
  set current_length = current_length + 1,
      best_length = greatest(best_length, current_length + 1),
      total_completed = total_completed + 1,
      streak_started_on = case when current_length = 0 then today else streak_started_on end,
      last_day = today
  where id = c.id
  returning * into c;

  -- Rozet kontrolünü bir sonraki açılışta hemen yaptır.
  update public.profiles
  set total_completed = total_completed + 1,
      active_days = active_days + case when first_of_day then 1 else 0 end,
      badges_synced_at = null
  where id = auth.uid();

  -- 60 günden eski günleri sıkıştır (yoksa sadece bir indeks bakışı).
  if exists (
    select 1 from public.check_ins where chain_id = c.id and day < today - 60
  ) then
    perform public.compact_chain(c.id, today - 60);
  end if;

  return c;
end;
$$;

-- ---------------------------------------------------------------------------
-- Joker hakkını değiştir: azaltma anında, artırma sonraki Pazartesi'den
-- ---------------------------------------------------------------------------
create function public.set_chain_jokers(p_chain_id uuid, p_value smallint)
returns public.chains
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  c public.chains;
  today date;
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;
  if p_value is null or p_value not between 0 and 2 then
    raise exception 'invalid_jokers';
  end if;

  select * into c from public.chains where id = p_chain_id and owner_id = me for update;
  if not found then
    raise exception 'chain not found';
  end if;
  if c.group_id is not null then
    raise exception 'group_jokers_fixed';
  end if;
  if c.goal_per_week is not null then
    raise exception 'weekly_goal_no_jokers';
  end if;

  -- Önce kaçırılan günleri eski hakla kapat; yeni değer sadece bugünden sonrasını etkiler.
  c := public.settle_chain_for(p_chain_id, me);
  today := public.user_today(me);

  if p_value < c.weekly_jokers then
    update public.chains
    set weekly_jokers = p_value, pending_weekly_jokers = null, pending_jokers_from = null
    where id = c.id
    returning * into c;
  elsif p_value > c.weekly_jokers then
    update public.chains
    set pending_weekly_jokers = p_value,
        pending_jokers_from = date_trunc('week', today)::date + 7
    where id = c.id
    returning * into c;
  else
    update public.chains
    set pending_weekly_jokers = null, pending_jokers_from = null
    where id = c.id
    returning * into c;
  end if;

  return c;
end;
$$;

revoke execute on function public.set_chain_jokers(uuid, smallint) from public, anon;
grant execute on function public.set_chain_jokers(uuid, smallint) to authenticated;

-- ---------------------------------------------------------------------------
-- Ortak zincir: joker hakkı grup kurulurken seçilir
-- ---------------------------------------------------------------------------
drop function public.create_chain_group(text, text, text, uuid[]);

create function public.create_chain_group(
  p_title text,
  p_color text,
  p_kind text,
  p_friend_ids uuid[] default '{}',
  p_weekly_jokers smallint default 2
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  friends uuid[];
  gid uuid;
  cid uuid;
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;
  if p_weekly_jokers is null or p_weekly_jokers not between 0 and 2 then
    raise exception 'invalid_jokers';
  end if;

  friends := public.group_friend_ids(me, p_friend_ids);
  if cardinality(friends) > 19 then
    raise exception 'group_too_big';
  end if;
  if (select count(*) from public.chain_groups where owner_id = me) >= 10 then
    raise exception 'group_limit';
  end if;

  insert into public.chain_groups (owner_id, title, color, kind, weekly_jokers)
  values (me, btrim(p_title), p_color, p_kind, p_weekly_jokers)
  returning id into gid;

  -- Sahibin kendi zinciri; plan limiti burada da uygulanır.
  insert into public.chains (owner_id, title, color, kind, group_id, weekly_jokers)
  values (me, btrim(p_title), p_color, p_kind, gid, p_weekly_jokers)
  returning id into cid;

  insert into public.chain_group_members (group_id, user_id, status, chain_id)
  values (gid, me, 'member', cid);

  insert into public.chain_group_members (group_id, user_id)
  select gid, f from unnest(friends) as f;

  return gid;
end;
$$;

revoke execute on function public.create_chain_group(text, text, text, uuid[], smallint)
  from public, anon;
grant execute on function public.create_chain_group(text, text, text, uuid[], smallint)
  to authenticated;

-- Daveti kabul eden üyenin zinciri grubun joker hakkıyla açılır.
create or replace function public.respond_group_invite(p_group_id uuid, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  g public.chain_groups;
  cid uuid;
begin
  perform 1 from public.chain_group_members
  where group_id = p_group_id and user_id = me and status = 'invited'
  for update;
  if not found then
    raise exception 'invite_not_found';
  end if;

  if not p_accept then
    delete from public.chain_group_members where group_id = p_group_id and user_id = me;
    return;
  end if;

  select * into g from public.chain_groups where id = p_group_id;

  insert into public.chains (owner_id, title, color, kind, group_id, weekly_jokers)
  values (me, g.title, g.color, g.kind, g.id, g.weekly_jokers)
  returning id into cid;

  update public.chain_group_members
  set status = 'member', chain_id = cid
  where group_id = p_group_id and user_id = me;
end;
$$;

-- ---------------------------------------------------------------------------
-- Bildirimler: haftalık hedefli zincirler günlük sayılmaz
-- ---------------------------------------------------------------------------
-- Günlük hatırlatma: haftalık zincir, o haftanın hedefi tamamlandıysa hatırlatmaz.
create or replace function public.users_to_remind(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns table (
  user_id uuid,
  pending_count integer,
  longest_streak integer,
  local_day date
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    count(c.id)::int,
    coalesce(max(c.current_length), 0)::int,
    (p_now at time zone p.timezone)::date
  from public.profiles p
  join public.chains c on c.owner_id = p.id and c.archived_at is null
  where p.reminders_enabled
    and extract(hour from p_now at time zone p.timezone)::int = p.reminder_hour
    and (p.last_reminded_on is null or p.last_reminded_on < (p_now at time zone p.timezone)::date)
    and (c.last_day is null or c.last_day < (p_now at time zone p.timezone)::date)
    and (
      c.goal_per_week is null
      or (
        select count(*) from public.check_ins ci
        where ci.chain_id = c.id and not ci.is_joker
          and ci.day >= date_trunc('week', (p_now at time zone p.timezone)::date)::date
      ) < c.goal_per_week
    )
    and exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
  group by p.id, p.timezone
  limit greatest(p_limit, 1);
$$;

-- Kırılma uyarısı: haftalık hedefli zincirler günlük kırılmaz, kapsam dışı.
create or replace function public.users_at_risk(
  p_now timestamptz default now(),
  p_limit integer default 500
)
returns table (
  user_id uuid,
  at_risk_count integer,
  longest_streak integer,
  local_day date
)
language sql
stable
security definer
set search_path = ''
as $$
  with u as (
    select p.id, (p_now at time zone p.timezone)::date as d
    from public.profiles p
    where p.risk_reminders_enabled
      and extract(hour from p_now at time zone p.timezone)::int = 22
      and exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
  )
  select
    u.id,
    count(c.id)::int,
    max(c.current_length)::int,
    u.d
  from u
  join public.profiles p on p.id = u.id
  join public.chains c on c.owner_id = u.id and c.archived_at is null
  where (p.last_risk_reminded_on is null or p.last_risk_reminded_on < u.d)
    and c.goal_per_week is null
    and c.current_length >= 3
    -- zincir canlı: dün (ya da jokerle) korunmuş, bugün henüz tamamlanmamış
    and c.last_day is not null
    and c.last_day = u.d - 1
    -- bu hafta (Pazartesi başlangıçlı) joker hakkı bitmiş
    and (
      select count(*) from public.check_ins ci
      where ci.chain_id = c.id and ci.is_joker
        and ci.day >= u.d - (extract(isodow from u.d)::int - 1)
        and ci.day <= u.d
    ) >= c.weekly_jokers
  group by u.id, u.d
  limit greatest(p_limit, 1);
$$;

revoke execute on function
  public.users_to_remind(timestamptz, integer), public.users_at_risk(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function
  public.users_to_remind(timestamptz, integer), public.users_at_risk(timestamptz, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Lig puanı: haftalık hedefli zincirin beklentisi min(hedef, geçen gün) olur
-- ---------------------------------------------------------------------------
create or replace function public.league_score(p_user uuid, p_week date, p_asof timestamptz)
returns table (score integer, done integer, expected integer)
language sql
stable
security definer
set search_path = ''
as $$
  with tz as (
    select timezone as name from public.profiles where id = p_user
  ),
  span as (
    select
      c.id,
      c.goal_per_week as goal,
      greatest(p_week, (c.created_at at time zone tz.name)::date) as s,
      least(
        p_week + 6,
        (p_asof at time zone tz.name)::date,
        coalesce((c.archived_at at time zone tz.name)::date, p_week + 6)
      ) as e
    from public.chains c, tz
    where c.owner_id = p_user
  ),
  per_chain as (
    select
      x.goal,
      case when x.goal is null then x.e - x.s + 1 else least(x.goal::int, x.e - x.s + 1) end as days,
      (select count(*) from public.check_ins ci
        where ci.chain_id = x.id and ci.day between x.s and x.e and not ci.is_joker)::int as dn,
      (select count(*) from public.check_ins ci
        where ci.chain_id = x.id and ci.day between x.s and x.e and ci.is_joker)::int as jk
    from span x
    where x.e >= x.s
  ),
  agg as (
    select
      coalesce(sum(days), 0)::int as days,
      coalesce(sum(case when goal is null then dn else least(dn, days) end), 0)::int as done,
      coalesce(sum(jk), 0)::int as jokers
    from per_chain
  ),
  deleted as (
    select coalesce(sum(done), 0)::int as done, coalesce(sum(expected), 0)::int as expected
    from public.league_deleted_stats
    where user_id = p_user and week_start = p_week
  )
  select
    case when (agg.days - agg.jokers + deleted.expected) > 0
      then least(100, round(100.0 * (agg.done + deleted.done) / (agg.days - agg.jokers + deleted.expected)))::int
    end,
    agg.done + deleted.done,
    agg.days - agg.jokers + deleted.expected
  from agg, deleted;
$$;

create or replace function public.snapshot_deleted_chain()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  w date;
  tz text;
  s date;
  e date;
  dn integer;
  jk integer;
  expected integer;
begin
  select timezone into tz from public.profiles where id = old.owner_id;
  if tz is null then
    return old;
  end if;

  foreach w in array array[public.league_week_start(), public.league_week_start() - 7] loop
    if exists (select 1 from public.league_results where week_start = w) then
      continue;
    end if;
    if not exists (
      select 1 from public.league_members where week_start = w and user_id = old.owner_id
    ) then
      continue;
    end if;

    s := greatest(w, (old.created_at at time zone tz)::date);
    e := least(
      w + 6,
      (now() at time zone tz)::date,
      coalesce((old.archived_at at time zone tz)::date, w + 6)
    );
    if e < s then
      continue;
    end if;

    select
      count(*) filter (where not is_joker),
      count(*) filter (where is_joker)
    into dn, jk
    from public.check_ins
    where chain_id = old.id and day between s and e;

    if old.goal_per_week is null then
      expected := (e - s + 1) - jk;
    else
      expected := least(old.goal_per_week::int, e - s + 1);
      dn := least(dn, expected);
    end if;

    insert into public.league_deleted_stats (user_id, week_start, done, expected)
    values (old.owner_id, w, dn, expected)
    on conflict (user_id, week_start) do update
      set done = public.league_deleted_stats.done + excluded.done,
          expected = public.league_deleted_stats.expected + excluded.expected;
  end loop;

  return old;
end;
$$;
