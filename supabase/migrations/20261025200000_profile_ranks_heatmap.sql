-- Profil: aktif gün sayacı (rütbe), ısı haritası verisi ve listelerde rütbe göstermek için gerekli alanlar.
--
-- Rütbe, "aktif gün" sayısından hesaplanır (günde en az bir halka eklenen gün sayısı; günde bir kez
-- sayılır, yani plan ve zincir sayısından bağımsızdır). Eşikler ve adlar uygulama kodundadır
-- (lib/ranks.ts); veritabanı sadece sayacı tutar, böylece eşikler değişse bile veri kaymaz.

alter table public.profiles
  add column active_days integer not null default 0 check (active_days >= 0),
  -- Kullanıcının kutlamasını gördüğü en yüksek rütbe sırası (rütbe atlayınca bir kez gösterilir).
  add column rank_seen smallint not null default 0 check (rank_seen >= 0);

-- Mevcut kullanıcılar için geçmişi yaklaşık hesapla: saklı günler (son ~60 gün) + sıkıştırılmış
-- aylık özetlerde herhangi bir zincirin tamamlandığı günler (aylık maskelerin birleşimi).
update public.profiles p
set active_days =
  coalesce((
    select count(distinct ci.day) from public.check_ins ci
    where ci.user_id = p.id and not ci.is_joker
  ), 0)
  + coalesce((
    select sum(bit_count(m.dm::bit(32)))::int
    from (
      select ch.month, bit_or(ch.done_mask) as dm
      from public.chain_history ch
      join public.chains c on c.id = ch.chain_id
      where c.owner_id = p.id
      group by ch.month
    ) m
  ), 0);

-- ---------------------------------------------------------------------------
-- check_in: o günün ilk halkasıysa aktif günü bir artırır
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
-- Rütbe kutlaması: görülen en yüksek rütbe sadece ilerler
-- ---------------------------------------------------------------------------
create function public.set_rank_seen(p_rank smallint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set rank_seen = p_rank
  where id = auth.uid() and p_rank between 0 and 50 and p_rank > rank_seen;
$$;

-- ---------------------------------------------------------------------------
-- Isı haritası: son p_days gün için günlük tamamlanan zincir sayısı
-- ---------------------------------------------------------------------------
-- Son ~60 gün günlük kayıtlardan, daha eskisi aylık özet maskelerinden gelir
-- (eski günler için sayı bilinmez: tamamlanan gün 1 sayılır). Joker günleri ayrı döner.
create function public.my_heatmap(p_days integer default 112)
returns table (hm_day date, hm_done integer, hm_joker integer)
language sql
stable
security definer
set search_path = ''
as $$
  with params as (
    select public.user_today(auth.uid()) as today, least(greatest(p_days, 1), 400) as span
  ),
  recent as (
    select
      ci.day,
      (count(*) filter (where not ci.is_joker))::int as done,
      (count(*) filter (where ci.is_joker))::int as joker
    from public.check_ins ci, params
    where ci.user_id = auth.uid() and ci.day > params.today - params.span
    group by ci.day
  ),
  months as (
    select ch.month, bit_or(ch.done_mask) as dm, bit_or(ch.joker_mask) as jm
    from public.chain_history ch
    join public.chains c on c.id = ch.chain_id
    where c.owner_id = auth.uid()
    group by ch.month
  ),
  old as (
    select
      (mo.month + (g.d - 1))::date as day,
      case when ((mo.dm >> (g.d - 1)) & 1) = 1 then 1 else 0 end as done,
      case when ((mo.jm >> (g.d - 1)) & 1) = 1 then 1 else 0 end as joker
    from months mo
    cross join generate_series(1, 31) as g(d)
    where ((mo.dm >> (g.d - 1)) & 1) = 1 or ((mo.jm >> (g.d - 1)) & 1) = 1
  )
  select r.day, r.done, r.joker from recent r
  union all
  select o.day, o.done, o.joker from old o, params
  where o.day > params.today - params.span
  order by 1;
$$;

-- ---------------------------------------------------------------------------
-- Listelerde rütbe göstermek için: dönüş tiplerine aktif gün eklenir
-- (dönüş tipi değiştiği için fonksiyonlar silinip yeniden oluşturulur)
-- ---------------------------------------------------------------------------
drop function public.friends_leaderboard(date);
create function public.friends_leaderboard(p_from date)
returns table (
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  completed bigint,
  active_days integer
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
  select p.id, p.username, p.display_name, p.avatar_url, count(ci.day) as completed, p.active_days
  from members m
  join public.profiles p on p.id = m.id
  left join public.check_ins ci
    on ci.user_id = p.id and not ci.is_joker and ci.day >= p_from
  group by p.id
  order by completed desc, p.username;
$$;

drop function public.group_standings(uuid);
create function public.group_standings(p_group_id uuid)
returns table (
  member_id uuid,
  member_username text,
  member_display_name text,
  chain_length integer,
  best_chain_length integer,
  state text,
  member_active_days integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if not exists (
    select 1 from public.chain_group_members
    where group_id = p_group_id and user_id = auth.uid() and status = 'member'
  ) then
    raise exception 'group_not_found';
  end if;

  for r in
    select m.user_id, m.chain_id from public.chain_group_members m
    where m.group_id = p_group_id and m.status = 'member'
  loop
    perform public.settle_chain_for(r.chain_id, r.user_id);
  end loop;

  -- state: done (bugün tamamladı), pending (bugün bekliyor), broken (zinciri kırıldı)
  return query
  select
    m.user_id,
    p.username,
    p.display_name,
    c.current_length,
    c.best_length,
    case
      when c.current_length > 0
        and c.last_day >= (now() at time zone p.timezone)::date then 'done'
      when c.current_length = 0 and c.break_count > 0 then 'broken'
      else 'pending'
    end,
    p.active_days
  from public.chain_group_members m
  join public.chains c on c.id = m.chain_id
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id and m.status = 'member'
  order by c.current_length desc, p.username;
end;
$$;


drop function public.league_standings();
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
  lg_size integer,
  lg_active_days integer
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
    jsonb_array_length(snap.rows),
    p.active_days
  from jsonb_array_elements(snap.rows) e
  join public.profiles p on p.id = (e ->> 'user_id')::uuid
  order by (e ->> 'place')::int;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.set_rank_seen(smallint), public.my_heatmap(integer),
  public.friends_leaderboard(date), public.group_standings(uuid), public.league_standings()
  from public, anon;
grant execute on function
  public.set_rank_seen(smallint), public.my_heatmap(integer),
  public.friends_leaderboard(date), public.group_standings(uuid), public.league_standings()
  to authenticated;
