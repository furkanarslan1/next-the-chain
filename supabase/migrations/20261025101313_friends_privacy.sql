-- Görünürlük ayarı: kapalıysa kullanıcı aramada çıkmaz ve yeni istek alamaz.
-- Mevcut arkadaşlar ve zaten gönderilmiş istekler etkilenmez.
alter table public.profiles add column discoverable boolean not null default true;
grant update (discoverable) on public.profiles to authenticated;

create or replace function public.search_users(p_query text)
returns table (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  relation text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.username,
    p.display_name,
    p.avatar_url,
    case
      when f.id is null then 'none'
      when f.status = 'accepted' then 'friends'
      when f.requester_id = auth.uid() then 'outgoing'
      else 'incoming'
    end
  from public.profiles p
  left join public.friendships f
    on (f.requester_id = auth.uid() and f.addressee_id = p.id)
    or (f.addressee_id = auth.uid() and f.requester_id = p.id)
  where length(trim(p_query)) >= 2
    and p.username is not null
    and p.id <> auth.uid()
    -- Gizli kullanıcılar sadece aramızda zaten bir ilişki varsa görünür.
    and (p.discoverable or f.id is not null)
    and p.username like
      replace(replace(replace(lower(trim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by p.username
  limit 10;
$$;

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
    -- Karşı taraf zaten bana istek göndermişse (gizli olsa da) kabul et.
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    raise exception 'already_exists';
  end if;

  -- Gizli kullanıcı yeni istek alamaz; varlığını da belli etmeyiz.
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
