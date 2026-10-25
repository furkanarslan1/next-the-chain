-- Arkadaşlık: gizlilik sıkılaştırma, kullanıcı arama ve istek gönderme RPC'leri.

-- ---------------------------------------------------------------------------
-- 1) Profiller artık herkese açık değil: sadece kendisi ve arkadaşlık
--    ilişkisi (bekleyen dahil) olanlar birbirinin profilini okuyabilir.
--    Arama, aşağıdaki search_users() ile yalnızca asgari alanları döndürür.
-- ---------------------------------------------------------------------------
drop policy profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1 from public.friendships f
      where (f.requester_id = auth.uid() and f.addressee_id = profiles.id)
         or (f.addressee_id = auth.uid() and f.requester_id = profiles.id)
    )
  );

-- Önek aramasını indeksli yapar.
create index profiles_username_prefix_idx on public.profiles (username text_pattern_ops);

-- ---------------------------------------------------------------------------
-- 2) Kullanıcı arama (önek, en az 2 karakter, en fazla 10 sonuç)
-- ---------------------------------------------------------------------------
create function public.search_users(p_query text)
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
    and p.username like
      replace(replace(replace(lower(trim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  order by p.username
  limit 10;
$$;

-- ---------------------------------------------------------------------------
-- 3) Arkadaşlık isteği yalnızca RPC ile: limitler ve karşılıklı istekte
--    otomatik kabul burada uygulanır.
-- ---------------------------------------------------------------------------
revoke insert on public.friendships from authenticated;
drop policy friendships_insert on public.friendships;

create function public.send_friend_request(p_addressee uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  existing public.friendships;
begin
  if me is null then
    raise exception 'unauthenticated';
  end if;
  if p_addressee = me then
    raise exception 'self_request';
  end if;
  if not exists (
    select 1 from public.profiles where id = p_addressee and username is not null
  ) then
    raise exception 'user_not_found';
  end if;

  select * into existing from public.friendships
  where (requester_id = me and addressee_id = p_addressee)
     or (requester_id = p_addressee and addressee_id = me);

  if found then
    -- Karşı taraf zaten bana istek göndermişse isteği kabul et.
    if existing.status = 'pending' and existing.addressee_id = me then
      update public.friendships set status = 'accepted' where id = existing.id;
      return 'accepted';
    end if;
    raise exception 'already_exists';
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

revoke execute on function public.search_users(text), public.send_friend_request(uuid)
  from public, anon;
grant execute on function public.search_users(text), public.send_friend_request(uuid)
  to authenticated;
