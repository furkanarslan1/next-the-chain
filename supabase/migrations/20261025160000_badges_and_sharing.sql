-- Rozetler ve paylaşım kartı verisi.
-- Rozetler tembel hesaplanır: kullanıcı uygulamayı açtığında koşullar kontrol edilir,
-- sağlananlar bir kez kaydedilir (sonradan zincir silinse bile rozet kalır).

-- ---------------------------------------------------------------------------
-- Kazanılan rozetler
-- ---------------------------------------------------------------------------
create table public.user_badges (
  user_id uuid not null references public.profiles (id) on delete cascade,
  badge text not null check (badge in (
    'first_link', 'streak_7', 'streak_30', 'streak_100', 'streak_365',
    'total_100', 'total_500', 'total_1000',
    'first_friend', 'first_group', 'comeback', 'first_promotion', 'perfect_week'
  )),
  earned_at timestamptz not null default now(),
  -- Kullanıcı "yeni rozet" ekranını görünce dolar.
  seen_at timestamptz,
  primary key (user_id, badge)
);

alter table public.user_badges enable row level security;
revoke all on public.user_badges from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Kuralları kontrol edip yeni kazanılanları kaydeder
-- ---------------------------------------------------------------------------
create function public.sync_badges(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer;
  best integer;
begin
  select coalesce(total_completed, 0) into total from public.profiles where id = p_user;
  select coalesce(max(best_length), 0) into best from public.chains where owner_id = p_user;

  insert into public.user_badges (user_id, badge)
  select p_user, b.badge
  from (
    select 'first_link'::text as badge where total >= 1
    union all select 'total_100' where total >= 100
    union all select 'total_500' where total >= 500
    union all select 'total_1000' where total >= 1000
    union all select 'streak_7' where best >= 7
    union all select 'streak_30' where best >= 30
    union all select 'streak_100' where best >= 100
    union all select 'streak_365' where best >= 365
    union all select 'first_friend' where exists (
      select 1 from public.friendships f
      where f.status = 'accepted' and p_user in (f.requester_id, f.addressee_id)
    )
    union all select 'first_group' where exists (
      -- en az iki kişinin üye olduğu bir grup
      select 1 from public.chain_group_members m
      where m.user_id = p_user and m.status = 'member'
        and (select count(*) from public.chain_group_members x
             where x.group_id = m.group_id and x.status = 'member') >= 2
    )
    union all select 'comeback' where exists (
      select 1 from public.chains c
      where c.owner_id = p_user and c.break_count >= 1 and c.current_length >= 7
    )
    union all select 'first_promotion' where exists (
      select 1 from public.league_results r where r.user_id = p_user and r.outcome = 'promoted'
    )
    union all select 'perfect_week' where exists (
      select 1 from public.league_results r where r.user_id = p_user and r.score = 100
    )
  ) b
  on conflict do nothing;
end;
$$;

-- Kullanıcının rozetleri (önce kontrol edilir). bd_is_new: henüz görülmedi.
create function public.my_badges()
returns table (bd_badge text, bd_earned_at timestamptz, bd_is_new boolean)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'unauthenticated';
  end if;
  perform public.sync_badges(auth.uid());

  return query
  select ub.badge, ub.earned_at, ub.seen_at is null
  from public.user_badges ub
  where ub.user_id = auth.uid()
  order by ub.earned_at desc, ub.badge;
end;
$$;

create function public.mark_badges_seen()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.user_badges set seen_at = now()
  where user_id = auth.uid() and seen_at is null;
$$;

-- ---------------------------------------------------------------------------
-- Paylaşım kartı verisi (sadece kendi zincirin/rozetin; saatte en fazla 60 istek)
-- ---------------------------------------------------------------------------
create function public.share_chain_data(p_chain_id uuid)
returns table (
  sh_title text,
  sh_color text,
  sh_length integer,
  sh_best integer,
  sh_total integer,
  sh_kind text,
  sh_username text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_rate_limit('share', 60, interval '1 hour');

  return query
  select c.title, c.color, c.current_length, c.best_length, c.total_completed, c.kind, p.username
  from public.chains c
  join public.profiles p on p.id = c.owner_id
  where c.id = p_chain_id and c.owner_id = auth.uid();
end;
$$;

create function public.share_badge_data(p_badge text)
returns table (sh_earned_at timestamptz, sh_username text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_rate_limit('share', 60, interval '1 hour');

  return query
  select ub.earned_at, p.username
  from public.user_badges ub
  join public.profiles p on p.id = ub.user_id
  where ub.user_id = auth.uid() and ub.badge = p_badge;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.sync_badges(uuid), public.my_badges(), public.mark_badges_seen(),
  public.share_chain_data(uuid), public.share_badge_data(text)
  from public, anon, authenticated;

grant execute on function
  public.my_badges(), public.mark_badges_seen(),
  public.share_chain_data(uuid), public.share_badge_data(text)
  to authenticated;
