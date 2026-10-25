-- Haftalık ligler: Bronz → Gümüş → Altın → Platin → Elmas (tier 1-5).
-- Puan: hafta boyunca "yapman gereken halkaların" yüzde kaçını tamamladığın
-- (joker günleri mazeretli, zincir sayısı avantaj sağlamaz). Hafta Pazartesi
-- (UTC) başlar; sonuçlar Pazartesi 12:00 UTC'de, dünyada kimsenin pazarı açık
-- kalmayacak şekilde hesaplanır. Gruplar en fazla 30 kişi; kalabalıklaştıkça
-- yeni gruplar açılır. Tablolara istemci erişimi yok, her şey RPC üzerinden.

-- ---------------------------------------------------------------------------
-- Profil alanları
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column league_tier smallint not null default 1 check (league_tier between 1 and 5),
  -- Kapalıysa ligde yabancılara "Gizli oyuncu" olarak görünür (yarışmaya devam eder).
  add column league_visible boolean not null default true;

grant update (league_visible) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------------
create table public.league_members (
  week_start date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier smallint not null,
  cohort smallint not null,
  primary key (week_start, user_id)
);
create index league_members_cohort_idx on public.league_members (week_start, tier, cohort);

create table public.league_results (
  week_start date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  tier smallint not null,
  cohort smallint not null,
  place integer not null,
  score integer,
  outcome text not null check (outcome in ('promoted', 'demoted', 'stayed')),
  primary key (week_start, user_id)
);
create index league_results_user_idx on public.league_results (user_id, week_start desc);

-- Silinen zincirlerin haftalık katkısı. Zincir silinince o haftanın "yapılan / yapılması
-- gereken" sayıları buraya eklenir; böylece başarısız bir zinciri silip oranı
-- yükseltmek mümkün olmaz. Hafta kapanınca satırlar silinir.
create table public.league_deleted_stats (
  user_id uuid not null references public.profiles (id) on delete cascade,
  week_start date not null,
  done integer not null default 0,
  expected integer not null default 0,
  primary key (user_id, week_start)
);

alter table public.league_members enable row level security;
alter table public.league_results enable row level security;
alter table public.league_deleted_stats enable row level security;
revoke all on public.league_members, public.league_results, public.league_deleted_stats
  from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Yardımcılar
-- ---------------------------------------------------------------------------
-- Lig haftasının başlangıcı (Pazartesi, UTC).
create function public.league_week_start(p_ts timestamptz default now())
returns date
language sql
stable
set search_path = ''
as $$
  select date_trunc('week', p_ts at time zone 'UTC')::date;
$$;

-- Bir kullanıcının haftalık puanı: tamamlanan / yapılması gereken halka (%).
-- Yapılması gereken: zincirin var olduğu, bugüne (ya da hafta sonuna / arşive) kadarki
-- günler; joker günleri çıkarılır. Hiç zincir günü yoksa score null (yarışmıyor).
create function public.league_score(p_user uuid, p_week date, p_asof timestamptz)
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
      greatest(p_week, (c.created_at at time zone tz.name)::date) as s,
      least(
        p_week + 6,
        (p_asof at time zone tz.name)::date,
        coalesce((c.archived_at at time zone tz.name)::date, p_week + 6)
      ) as e
    from public.chains c, tz
    where c.owner_id = p_user
  ),
  span_ok as (select id, s, e from span where e >= s),
  agg as (
    select
      coalesce(sum(e - s + 1), 0)::int as days,
      (select count(*) from public.check_ins ci
        join span_ok x on x.id = ci.chain_id and ci.day between x.s and x.e
        where not ci.is_joker)::int as done,
      (select count(*) from public.check_ins ci
        join span_ok x on x.id = ci.chain_id and ci.day between x.s and x.e
        where ci.is_joker)::int as jokers
    from span_ok
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

-- Zincir silinmeden önce, henüz kapanmamış lig haftalarındaki katkısını kaydeder.
-- (Hesap silinirken profil zaten gittiği için atlanır.)
create function public.snapshot_deleted_chain()
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

    insert into public.league_deleted_stats (user_id, week_start, done, expected)
    values (old.owner_id, w, dn, (e - s + 1) - jk)
    on conflict (user_id, week_start) do update
      set done = public.league_deleted_stats.done + excluded.done,
          expected = public.league_deleted_stats.expected + excluded.expected;
  end loop;

  return old;
end;
$$;

create trigger chains_snapshot_for_league
  before delete on public.chains
  for each row execute function public.snapshot_deleted_chain();

-- Kullanıcıyı haftanın grubuna yerleştirir: aynı ligde 30'dan az kişisi olan
-- ilk grup, yoksa yeni grup.
create function public.league_enroll(p_user uuid, p_week date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  t smallint;
  c smallint;
begin
  if exists (
    select 1 from public.league_members where week_start = p_week and user_id = p_user
  ) then
    return;
  end if;

  select league_tier into t from public.profiles where id = p_user;

  select cohort into c from (
    select cohort, count(*) as cnt
    from public.league_members
    where week_start = p_week and tier = t
    group by cohort
    having count(*) < 30
    order by cohort
    limit 1
  ) open_cohort;

  if c is null then
    select coalesce(max(cohort) + 1, 0) into c
    from public.league_members where week_start = p_week and tier = t;
  end if;

  insert into public.league_members (week_start, user_id, tier, cohort)
  values (p_week, p_user, t, c)
  on conflict do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: grup sıralaması (çağıran kullanıcının grubu)
-- ---------------------------------------------------------------------------
-- Aktif zinciri olmayan kullanıcı için boş döner. Gizli oyuncuların adı
-- (kendisi hariç) null gelir.
create function public.league_standings()
returns table (
  lg_user_id uuid,
  lg_username text,
  lg_is_me boolean,
  lg_score integer,
  lg_done integer,
  lg_expected integer,
  lg_place integer,
  lg_tier smallint,
  lg_week_start date,
  lg_promote integer,
  lg_demote integer,
  lg_size integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  w date := public.league_week_start();
  m public.league_members;
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;
  if not exists (
    select 1 from public.chains where owner_id = me and archived_at is null
  ) then
    return;
  end if;

  perform public.league_enroll(me, w);
  select * into m from public.league_members where week_start = w and user_id = me;

  return query
  with scored as (
    select lm.user_id, p.username, p.league_visible, s.score, s.done, s.expected
    from public.league_members lm
    join public.profiles p on p.id = lm.user_id
    cross join lateral public.league_score(lm.user_id, w, now()) s
    where lm.week_start = w and lm.tier = m.tier and lm.cohort = m.cohort
  ),
  ranked as (
    select
      sc.*,
      row_number() over (order by sc.score desc nulls last, sc.done desc, sc.user_id) as rn,
      count(*) filter (where sc.score is not null) over () as n
    from scored sc
  )
  select
    r.user_id,
    case when r.user_id = me or r.league_visible then r.username end,
    r.user_id = me,
    r.score,
    r.done,
    r.expected,
    r.rn::int,
    m.tier,
    w,
    least(5, (r.n / 4))::int,
    least(5, (r.n / 4))::int,
    (count(*) over ())::int
  from ranked r
  order by r.rn;
end;
$$;

-- Son haftaların sonuçları (terfi/düşme bildirimi için).
create function public.my_league_history()
returns table (
  week_start date,
  tier smallint,
  place integer,
  score integer,
  outcome text
)
language sql
stable
security definer
set search_path = ''
as $$
  select r.week_start, r.tier, r.place, r.score, r.outcome
  from public.league_results r
  where r.user_id = auth.uid()
  order by r.week_start desc
  limit 8;
$$;

-- ---------------------------------------------------------------------------
-- Haftalık kapanış (pg_cron çağırır): geçen haftayı hesaplar, terfi/düşme uygular.
-- Yeniden çalıştırılırsa bir şey yapmaz.
-- Kuralı: grupta puanı olan n kişiden ilk n/4 (en çok 5) kişi ve puanı >= 50
-- ise terfi; son n/4 (en çok 5) kişi ve puanı < 30 ise düşer.
-- ---------------------------------------------------------------------------
create function public.settle_leagues(p_now timestamptz default now())
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  w date := public.league_week_start(p_now) - 7;
  c record;
begin
  if exists (select 1 from public.league_results where week_start = w) then
    return;
  end if;

  -- Kaçırılan günler joker/kırılma olarak işlensin ki puanlar doğru çıksın.
  for c in
    select ch.id, ch.owner_id
    from public.chains ch
    join public.league_members lm on lm.user_id = ch.owner_id and lm.week_start = w
    where ch.archived_at is null
  loop
    perform public.settle_chain_for(c.id, c.owner_id);
  end loop;

  insert into public.league_results (week_start, user_id, tier, cohort, place, score, outcome)
  with scored as (
    select lm.user_id, lm.tier, lm.cohort, s.score, s.done
    from public.league_members lm
    cross join lateral public.league_score(lm.user_id, w, p_now) s
    where lm.week_start = w
  ),
  ranked as (
    select
      sc.*,
      row_number() over (
        partition by sc.tier, sc.cohort
        order by sc.score desc nulls last, sc.done desc, sc.user_id
      ) as rn,
      count(*) filter (where sc.score is not null) over (partition by sc.tier, sc.cohort) as n
    from scored sc
  )
  select
    w, r.user_id, r.tier, r.cohort, r.rn::int, r.score,
    case
      when r.score is not null and r.tier < 5
        and r.rn <= least(5, r.n / 4) and r.score >= 50 then 'promoted'
      when r.score is not null and r.tier > 1
        and r.rn > r.n - least(5, r.n / 4) and r.score < 30 then 'demoted'
      else 'stayed'
    end
  from ranked r;

  update public.profiles p
  set league_tier = case lr.outcome
    when 'promoted' then p.league_tier + 1
    else p.league_tier - 1
  end
  from public.league_results lr
  where lr.week_start = w and lr.user_id = p.id and lr.outcome <> 'stayed';

  -- Kapanan haftanın silinmiş zincir kayıtları artık gereksiz.
  delete from public.league_deleted_stats where week_start <= w;

  -- Eski haftaları temizle (~11 hafta sakla).
  delete from public.league_members where week_start < w - 77;
  delete from public.league_results where week_start < w - 77;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.league_week_start(timestamptz), public.league_score(uuid, date, timestamptz),
  public.league_enroll(uuid, date), public.league_standings(),
  public.my_league_history(), public.settle_leagues(timestamptz),
  public.snapshot_deleted_chain()
  from public, anon, authenticated;

grant execute on function public.league_standings(), public.my_league_history()
  to authenticated;

-- ---------------------------------------------------------------------------
-- Zamanlayıcı: her Pazartesi 12:00 UTC (pg_cron kuruluysa).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('league-weekly', '0 12 * * 1', 'select public.settle_leagues()');
  end if;
end;
$$;
