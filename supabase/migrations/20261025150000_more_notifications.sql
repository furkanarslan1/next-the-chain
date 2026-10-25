-- Ek bildirimler:
--  * kırılma uyarısı: yerel saat 22:00'de, joker hakkı kalmamış ve bugün tamamlanmamış
--    (en az 3 halkalık) zincirler için ikinci hatırlatma
--  * sosyal: arkadaşlık isteği, kabul edildi, gruba davet
--  * lig sonucu: terfi / düşüş
-- Olay bildirimleri bir "gelen kutusu" (notifications) tablosuna yazılır; cron rotası
-- (/api/cron/reminders) 10 dakikada bir tabloyu boşaltıp push olarak gönderir.

-- ---------------------------------------------------------------------------
-- Tercihler
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column risk_reminders_enabled boolean not null default true,
  add column notify_social boolean not null default true,
  add column notify_league boolean not null default true,
  add column last_risk_reminded_on date;

grant update (risk_reminders_enabled, notify_social, notify_league) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Gelen kutusu
-- ---------------------------------------------------------------------------
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('friend_request', 'friend_accepted', 'group_invite', 'league_result')),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notifications_pending_idx on public.notifications (id) where sent_at is null;

alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Olaylar -> gelen kutusu (tetikleyiciler)
-- ---------------------------------------------------------------------------
create function public.notify_friendship_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.status = 'pending' then
    insert into public.notifications (user_id, kind, data)
    values (
      new.addressee_id, 'friend_request',
      jsonb_build_object('from', (select username from public.profiles where id = new.requester_id))
    );
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status = 'accepted' then
    insert into public.notifications (user_id, kind, data)
    values (
      new.requester_id, 'friend_accepted',
      jsonb_build_object('from', (select username from public.profiles where id = new.addressee_id))
    );
  end if;
  return new;
end;
$$;

create trigger friendships_notify
  after insert or update of status on public.friendships
  for each row execute function public.notify_friendship_change();

create function public.notify_group_invite()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'invited' then
    insert into public.notifications (user_id, kind, data)
    select
      new.user_id, 'group_invite',
      jsonb_build_object('title', g.title, 'owner', o.username)
    from public.chain_groups g
    join public.profiles o on o.id = g.owner_id
    where g.id = new.group_id;
  end if;
  return new;
end;
$$;

create trigger chain_group_members_notify
  after insert on public.chain_group_members
  for each row execute function public.notify_group_invite();

-- ---------------------------------------------------------------------------
-- Lig kapanışı: terfi/düşüş bildirimi ekler (settle_leagues güncellendi)
-- ---------------------------------------------------------------------------
create or replace function public.settle_leagues(p_now timestamptz default now())
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

  -- Terfi/düşüşü bildir (yeni lig + geçen haftaki sıra).
  insert into public.notifications (user_id, kind, data)
  select
    lr.user_id, 'league_result',
    jsonb_build_object('outcome', lr.outcome, 'place', lr.place, 'tier', p.league_tier)
  from public.league_results lr
  join public.profiles p on p.id = lr.user_id
  where lr.week_start = w and lr.outcome <> 'stayed';

  delete from public.league_deleted_stats where week_start <= w;

  delete from public.league_members where week_start < w - 77;
  delete from public.league_results where week_start < w - 77;
end;
$$;

-- ---------------------------------------------------------------------------
-- Gelen kutusunu boşaltma (cron rotası çağırır; sadece service_role)
-- ---------------------------------------------------------------------------
-- Satırları "gönderildi" olarak işaretleyip döndürür; eşzamanlı çalıştırmalar
-- aynı satırı iki kez almaz. Eski kayıtlar temizlenir.
create function public.claim_notifications(p_limit integer default 100)
returns table (id bigint, user_id uuid, kind text, data jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications n where n.created_at < now() - interval '3 days';

  return query
  update public.notifications n
  set sent_at = now()
  where n.id in (
    select x.id from public.notifications x
    where x.sent_at is null
    order by x.id
    limit greatest(p_limit, 1)
    for update skip locked
  )
  returning n.id, n.user_id, n.kind, n.data;
end;
$$;

-- İşlenemeyen satırları geri bırakır (süre bütçesi dolduysa).
create function public.release_notifications(p_ids bigint[])
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set sent_at = null where id = any(p_ids);
$$;

-- ---------------------------------------------------------------------------
-- Kırılma uyarısı: yerel saat 22:00, bugün tamamlanmamış, en az 3 halkalık,
-- bu hafta joker hakkı kalmamış (yani atlanırsa gerçekten kırılacak) zincirler.
-- Sadece service_role çağırır.
-- ---------------------------------------------------------------------------
create function public.users_at_risk(
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

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.notify_friendship_change(), public.notify_group_invite(),
  public.claim_notifications(integer), public.release_notifications(bigint[]),
  public.users_at_risk(timestamptz, integer)
  from public, anon, authenticated;

grant execute on function
  public.claim_notifications(integer), public.release_notifications(bigint[]),
  public.users_at_risk(timestamptz, integer)
  to service_role;
