-- Kötüye kullanım korumaları:
--  1) Saat dilimi değişikliği 24 saatte bir (günü uzatma hilesi)
--  2) Yasaklı kullanıcı adları (taklit ve küfür), listesi tabloda
--  3) Oran sınırlama (arama, arkadaşlık isteği, bildirme)
--  4) Kullanıcı bildirme

-- ---------------------------------------------------------------------------
-- 1) Saat dilimi: 24 saatte en fazla bir değişiklik
-- ---------------------------------------------------------------------------
-- Saat dilimini batıya alıp "bugün"ü uzatarak zinciri kırmamak mümkündü.
-- İlk değişiklik (varsayılan UTC'den cihazın dilimine) serbest.
alter table public.profiles add column timezone_changed_at timestamptz;

create function public.limit_timezone_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.timezone is distinct from old.timezone then
    if old.timezone_changed_at is not null
       and old.timezone_changed_at > now() - interval '24 hours' then
      raise exception 'timezone_cooldown';
    end if;
    new.timezone_changed_at := now();
  end if;
  return new;
end;
$$;

create trigger profiles_limit_timezone
  before update of timezone on public.profiles
  for each row execute function public.limit_timezone_changes();

-- ---------------------------------------------------------------------------
-- 2) Yasaklı kullanıcı adları
-- ---------------------------------------------------------------------------
-- Liste tabloda tutulur; yeni kelime eklemek için migration gerekmez
-- (Supabase panelinden blocked_words tablosuna satır eklenir).
-- mode: 'contains' (adın içinde geçerse) ya da 'exact' (ad tam eşleşirse).
create table public.blocked_words (
  word text primary key check (word = lower(word) and word ~ '^[a-z0-9]+$'),
  mode text not null default 'contains' check (mode in ('contains', 'exact'))
);
alter table public.blocked_words enable row level security;
revoke all on public.blocked_words from anon, authenticated;

insert into public.blocked_words (word, mode) values
  -- taklit
  ('admin', 'contains'), ('moderator', 'contains'), ('thechain', 'contains'),
  ('official', 'contains'), ('support', 'exact'), ('destek', 'exact'),
  ('anonymous', 'exact'), ('system', 'exact'), ('null', 'exact'), ('undefined', 'exact'),
  -- küfür (net olanlar; yanlış eşleşme riski olanlar bilerek listede yok, tabloya ekleyebilirsin)
  ('orospu', 'contains'), ('siktir', 'contains'), ('amcik', 'contains'),
  ('yarrak', 'contains'), ('fuck', 'contains'), ('bitch', 'contains'),
  ('nigga', 'contains'), ('nigger', 'contains');

-- Küçük harfe çevirir, Türkçe karakterleri ve yaygın rakam ikamelerini sadeleştirir,
-- alt çizgileri atar ("f_u_c_k", "orosp4" gibi kaçışları yakalar).
create function public.normalize_username(p_username text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(lower(p_username), 'çğıöşü0134578@$', 'cgiosuoieastbas'),
    '[^a-z]', '', 'g'
  );
$$;

create function public.username_allowed(p_username text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.blocked_words b
    where (b.mode = 'exact' and (
            b.word = lower(p_username) or b.word = public.normalize_username(p_username)))
       or (b.mode = 'contains' and position(b.word in public.normalize_username(p_username)) > 0)
  );
$$;

create function public.enforce_username_allowed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.username is not null
     and new.username is distinct from old.username
     and not public.username_allowed(new.username) then
    raise exception 'username_blocked';
  end if;
  return new;
end;
$$;

-- Sadece değişiklikte kontrol edilir; mevcut kullanıcı adlarına dokunmaz.
create trigger profiles_username_allowed
  before update of username on public.profiles
  for each row execute function public.enforce_username_allowed();

-- ---------------------------------------------------------------------------
-- 3) Oran sınırlama
-- ---------------------------------------------------------------------------
-- Kullanıcı ve eylem başına tek satır (pencere başlangıcı + sayaç); tablo büyümez.
create table public.rate_limits (
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null,
  window_start timestamptz not null default now(),
  count integer not null default 0,
  primary key (user_id, action)
);
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;

-- Limit aşılırsa 'rate_limited' hatası verir. Hata, o çağrının artışını da geri
-- alır, yani sayaç limitte kalır ve pencere dolana kadar istek reddedilir.
create function public.check_rate_limit(p_action text, p_max integer, p_window interval)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  c integer;
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;

  insert into public.rate_limits (user_id, action, window_start, count)
  values (me, p_action, now(), 1)
  on conflict (user_id, action) do update
    set count = case
          when public.rate_limits.window_start < now() - p_window then 1
          else public.rate_limits.count + 1
        end,
        window_start = case
          when public.rate_limits.window_start < now() - p_window then now()
          else public.rate_limits.window_start
        end
  returning count into c;

  if c > p_max then
    raise exception 'rate_limited';
  end if;
end;
$$;

-- Arama: dakikada en fazla 30 (kullanıcı adı listesini toplu çekmeyi zorlaştırır).
alter function public.search_users(text) rename to search_users_impl;

create function public.search_users(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  relation text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_rate_limit('search', 30, interval '1 minute');
  return query select * from public.search_users_impl(p_query);
end;
$$;

-- Arkadaşlık isteği: saatte en fazla 20 (bekleyen 30 sınırına ek olarak).
create or replace function public.send_friend_request(p_addressee uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  target public.profiles;
  existing public.friendships;
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;
  perform public.check_rate_limit('friend_request', 20, interval '1 hour');

  if p_addressee = me then
    raise exception 'self_request';
  end if;

  select * into target from public.profiles where id = p_addressee and username is not null;
  if not found then
    raise exception 'user_not_found';
  end if;

  select * into existing from public.friendships
  where (requester_id = me and addressee_id = p_addressee)
     or (requester_id = p_addressee and addressee_id = me);

  if found then
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    raise exception 'already_exists';
  end if;

  if not target.discoverable then
    raise exception 'user_not_found';
  end if;

  if (
    select count(*) from public.friendships
    where requester_id = me and status = 'pending'
  ) >= 30 then
    raise exception 'too_many_requests';
  end if;

  if (
    select count(*) from public.friendships
    where status = 'accepted' and me in (requester_id, addressee_id)
  ) >= 100 then
    raise exception 'friend_limit';
  end if;

  insert into public.friendships (requester_id, addressee_id) values (me, p_addressee);
  return 'sent';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4) Kullanıcı bildirme
-- ---------------------------------------------------------------------------
-- Bildirimleri Supabase panelinden (reports tablosu) okursun; istemci okuyamaz.
create table public.reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_id uuid not null references public.profiles (id) on delete cascade,
  reason text not null check (reason in ('username', 'abuse', 'other')),
  note text check (char_length(note) <= 300),
  created_at timestamptz not null default now(),
  unique (reporter_id, reported_id, reason)
);
alter table public.reports enable row level security;
revoke all on public.reports from anon, authenticated;

create function public.report_user(p_user_id uuid, p_reason text, p_note text default null)
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
  if p_user_id = me then
    raise exception 'self_request';
  end if;
  perform public.check_rate_limit('report', 20, interval '1 day');

  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception 'user_not_found';
  end if;

  insert into public.reports (reporter_id, reported_id, reason, note)
  values (me, p_user_id, p_reason, nullif(btrim(p_note), ''))
  on conflict (reporter_id, reported_id, reason) do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.limit_timezone_changes(), public.normalize_username(text),
  public.username_allowed(text), public.enforce_username_allowed(),
  public.check_rate_limit(text, integer, interval), public.search_users_impl(text),
  public.search_users(text), public.report_user(uuid, text, text)
  from public, anon, authenticated;

grant execute on function public.search_users(text), public.report_user(uuid, text, text)
  to authenticated;
