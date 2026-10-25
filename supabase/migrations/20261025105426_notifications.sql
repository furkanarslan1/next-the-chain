-- Hatırlatma bildirimleri (Web Push): abonelikler, kullanıcı ayarları ve
-- "kimlere hatırlatma gitmeli" sorgusu.

-- ---------------------------------------------------------------------------
-- Kullanıcı ayarları
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column reminders_enabled boolean not null default true,
  -- Yerel saatle hangi saatte hatırlatılsın (0-23).
  add column reminder_hour smallint not null default 20 check (reminder_hour between 0 and 23),
  -- Aynı gün iki kez hatırlatma gitmesin.
  add column last_reminded_on date;

grant update (reminders_enabled, reminder_hour) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Abonelikler (bir cihaz/tarayıcı = bir satır)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;

-- Kullanıcı kendi aboneliklerini görüp silebilir; kaydetme RPC ile (aşağıda).
grant select, delete on public.push_subscriptions to authenticated;
create policy push_subscriptions_select on public.push_subscriptions
  for select to authenticated using (user_id = auth.uid());
create policy push_subscriptions_delete on public.push_subscriptions
  for delete to authenticated using (user_id = auth.uid());

-- Aynı cihaz başka bir hesaba geçtiyse eski hesabın aboneliği silinir
-- (bildirimler yanlış kişiye gitmesin). Kullanıcı başına en fazla 5 cihaz.
create function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;
  if char_length(p_endpoint) > 2048 or char_length(p_p256dh) > 256 or char_length(p_auth) > 256 then
    raise exception 'invalid_subscription';
  end if;

  delete from public.push_subscriptions where endpoint = p_endpoint and user_id <> me;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (me, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update
    set p256dh = excluded.p256dh, auth = excluded.auth;

  delete from public.push_subscriptions
  where user_id = me
    and id not in (
      select id from public.push_subscriptions
      where user_id = me order by id desc limit 5
    );
end;
$$;

revoke execute on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Hatırlatılacak kullanıcılar: yerel saati hatırlatma saatine denk gelen,
-- bugün tamamlanmamış aktif zinciri olan, aboneliği olan ve bugün henüz
-- hatırlatılmamış kullanıcılar. Sadece sunucu (service_role) çağırabilir.
-- ---------------------------------------------------------------------------
create function public.users_to_remind(
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
    and exists (select 1 from public.push_subscriptions s where s.user_id = p.id)
  group by p.id, p.timezone
  limit greatest(p_limit, 1);
$$;

revoke execute on function public.users_to_remind(timestamptz, integer)
  from public, anon, authenticated;
grant execute on function public.users_to_remind(timestamptz, integer) to service_role;
