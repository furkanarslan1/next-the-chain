-- Performans: ana sayfa her açıldığında yapılan pahalı hesapları seyrelt.
--  * lig sıralaması grup başına tek kez (en fazla 6 saatte bir) hesaplanıp paylaşılır
--  * rozet kontrolü en fazla 30 dakikada bir (check-in sonrası hemen)

-- ---------------------------------------------------------------------------
-- Lig sıralaması anlık görüntüsü
-- ---------------------------------------------------------------------------
-- Sıralama grubun 30 üyesi için aynıdır; her açılışta herkes için yeniden hesaplamak yerine
-- bir kişi hesaplar, 6 saat boyunca grubun tamamı aynı kaydı okur. Kullanıcı adı ve
-- gizlilik (league_visible) okuma anında uygulanır, yani gizlilik değişikliği hemen yansır.
create table public.league_snapshots (
  week_start date not null,
  tier smallint not null,
  cohort smallint not null,
  computed_at timestamptz not null default now(),
  rows jsonb not null,
  primary key (week_start, tier, cohort)
);
alter table public.league_snapshots enable row level security;
revoke all on public.league_snapshots from anon, authenticated;

create or replace function public.league_standings()
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
  snap public.league_snapshots;
  fresh boolean := false;
  new_rows jsonb;
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

  select * into snap from public.league_snapshots
  where week_start = w and tier = m.tier and cohort = m.cohort;

  -- Taze sayılır: 6 saatten yeni ve ben de içindeyim (yeni katılan hemen görünsün).
  if found
     and snap.computed_at > now() - interval '6 hours'
     and exists (
       select 1 from jsonb_array_elements(snap.rows) e where (e ->> 'user_id')::uuid = me
     ) then
    fresh := true;
  end if;

  if not fresh then
    with scored as (
      select lm.user_id, s.score, s.done, s.expected
      from public.league_members lm
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
    select jsonb_agg(
      jsonb_build_object(
        'user_id', r.user_id, 'score', r.score, 'done', r.done,
        'expected', r.expected, 'place', r.rn, 'n', r.n
      ) order by r.rn
    ) into new_rows from ranked r;

    insert into public.league_snapshots (week_start, tier, cohort, computed_at, rows)
    values (w, m.tier, m.cohort, now(), coalesce(new_rows, '[]'::jsonb))
    on conflict (week_start, tier, cohort)
    do update set computed_at = excluded.computed_at, rows = excluded.rows;

    delete from public.league_snapshots where week_start < w - 14;

    select * into snap from public.league_snapshots
    where week_start = w and tier = m.tier and cohort = m.cohort;
  end if;

  return query
  select
    (e ->> 'user_id')::uuid,
    case when (e ->> 'user_id')::uuid = me or p.league_visible then p.username end,
    (e ->> 'user_id')::uuid = me,
    (e ->> 'score')::int,
    (e ->> 'done')::int,
    (e ->> 'expected')::int,
    (e ->> 'place')::int,
    m.tier,
    w,
    least(5, ((e ->> 'n')::int / 4)),
    least(5, ((e ->> 'n')::int / 4)),
    jsonb_array_length(snap.rows)
  from jsonb_array_elements(snap.rows) e
  join public.profiles p on p.id = (e ->> 'user_id')::uuid
  order by (e ->> 'place')::int;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rozet kontrolünü seyrelt
-- ---------------------------------------------------------------------------
-- my_badges() her ana sayfa açılışında 13 koşulu yeniden sorguluyordu. Artık en fazla
-- 30 dakikada bir kontrol eder; check_in() zamanlayıcıyı sıfırlar (en sık rozet sebebi
-- halka eklemek olduğu için yeni rozet hemen görünür).
alter table public.profiles add column badges_synced_at timestamptz;

create or replace function public.my_badges()
returns table (bd_badge text, bd_earned_at timestamptz, bd_is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  synced timestamptz;
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;

  select badges_synced_at into synced from public.profiles where id = auth.uid();
  if synced is null or synced < now() - interval '30 minutes' then
    perform public.sync_badges(auth.uid());
    update public.profiles set badges_synced_at = now() where id = auth.uid();
  end if;

  return query
  select ub.badge, ub.earned_at, ub.seen_at is null
  from public.user_badges ub
  where ub.user_id = auth.uid()
  order by ub.earned_at desc, ub.badge;
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

  -- Rozet kontrolünü bir sonraki açılışta hemen yaptır.
  update public.profiles
  set total_completed = total_completed + 1, badges_synced_at = null
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
