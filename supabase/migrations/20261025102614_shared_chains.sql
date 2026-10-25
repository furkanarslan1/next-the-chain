-- Ortak zincirler: her üyenin KENDİ zinciri vardır, hepsi bir gruba bağlıdır.
-- Biri kırarsa sadece kendi zinciri sıfırlanır; grup sıralaması üyelerin kendi
-- zincir uzunluklarının karşılaştırmasıdır. Tüm yazma/okuma RPC'ler üzerinden;
-- tablolara istemci erişimi yoktur (RLS açık, politika yok).

-- ---------------------------------------------------------------------------
-- Tablolar
-- ---------------------------------------------------------------------------
create table public.chain_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 60),
  color text not null check (color ~ '^#[0-9a-fA-F]{6}$'),
  kind text not null check (kind in ('build', 'quit')),
  created_at timestamptz not null default now()
);
create index chain_groups_owner_idx on public.chain_groups (owner_id);

create table public.chain_group_members (
  group_id uuid not null references public.chain_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited' check (status in ('invited', 'member')),
  -- Üyenin gruba bağlı zinciri; zincir silinirse üyelik de düşer.
  chain_id uuid references public.chains (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id),
  check ((status = 'member') = (chain_id is not null))
);
create index chain_group_members_user_idx on public.chain_group_members (user_id);

alter table public.chains
  add column group_id uuid references public.chain_groups (id) on delete set null;
create index chains_group_idx on public.chains (group_id) where group_id is not null;

alter table public.chain_groups enable row level security;
alter table public.chain_group_members enable row level security;
revoke all on public.chain_groups, public.chain_group_members from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tetikleyiciler
-- ---------------------------------------------------------------------------
-- Grubun sahibi kendi zincirini silerse grup dağılır (üyelerin zincirleri normal kalır).
create function public.cleanup_group_on_owner_chain_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.chain_groups where id = old.group_id and owner_id = old.owner_id;
  return old;
end;
$$;

create trigger chains_group_cleanup
  after delete on public.chains
  for each row when (old.group_id is not null)
  execute function public.cleanup_group_on_owner_chain_delete();

-- Ortak zincir arşivlenemez; çıkmak için gruptan ayrılmak gerekir.
create function public.block_group_chain_archive()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.archived_at is not null and old.archived_at is null and old.group_id is not null then
    raise exception 'group_chain_archive';
  end if;
  return new;
end;
$$;

create trigger chains_block_group_archive
  before update of archived_at on public.chains
  for each row execute function public.block_group_chain_archive();

-- ---------------------------------------------------------------------------
-- settle_chain: aynı mantık, kullanıcı parametreli (grup sıralaması için)
-- ---------------------------------------------------------------------------
create function public.settle_chain_for(p_chain_id uuid, p_user uuid)
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
  used integer;
begin
  select * into c from public.chains
  where id = p_chain_id and owner_id = p_user
  for update;
  if not found then
    raise exception 'chain not found';
  end if;

  today := public.user_today(p_user);

  if c.last_day is null or c.current_length = 0 or c.last_day >= today - 1 then
    return c;
  end if;

  d := c.last_day + 1;
  while d < today loop
    week_start := date_trunc('week', d)::date;
    select count(*) into used from public.check_ins
    where chain_id = c.id and is_joker
      and day >= week_start and day < week_start + 7;

    if used < c.weekly_jokers then
      insert into public.check_ins (chain_id, user_id, day, is_joker)
      values (c.id, c.owner_id, d, true);
      c.last_day := d;
      d := d + 1;
    else
      update public.chains
      set current_length = 0, last_day = null, break_count = break_count + 1
      where id = c.id
      returning * into c;
      return c;
    end if;
  end loop;

  update public.chains set last_day = c.last_day where id = c.id returning * into c;
  return c;
end;
$$;

create or replace function public.settle_chain(p_chain_id uuid)
returns public.chains
language plpgsql
security definer
set search_path = ''
as $$
begin
  return public.settle_chain_for(p_chain_id, auth.uid());
end;
$$;

-- ---------------------------------------------------------------------------
-- Yardımcı: davet edilecek kişiler (yalnızca kabul edilmiş arkadaşlar)
-- ---------------------------------------------------------------------------
create function public.group_friend_ids(p_me uuid, p_ids uuid[])
returns uuid[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids uuid[];
  fid uuid;
begin
  select coalesce(array_agg(distinct f), '{}'::uuid[]) into ids
  from unnest(p_ids) as f
  where f is not null and f <> p_me;

  foreach fid in array ids loop
    if not public.are_friends(p_me, fid) then
      raise exception 'not_friends';
    end if;
  end loop;
  return ids;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC'ler
-- ---------------------------------------------------------------------------
create function public.create_chain_group(
  p_title text,
  p_color text,
  p_kind text,
  p_friend_ids uuid[] default '{}'
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

  friends := public.group_friend_ids(me, p_friend_ids);
  if cardinality(friends) > 19 then
    raise exception 'group_too_big';
  end if;
  if (select count(*) from public.chain_groups where owner_id = me) >= 10 then
    raise exception 'group_limit';
  end if;

  insert into public.chain_groups (owner_id, title, color, kind)
  values (me, btrim(p_title), p_color, p_kind)
  returning id into gid;

  -- Sahibin kendi zinciri; plan limiti burada da uygulanır.
  insert into public.chains (owner_id, title, color, kind, group_id)
  values (me, btrim(p_title), p_color, p_kind, gid)
  returning id into cid;

  insert into public.chain_group_members (group_id, user_id, status, chain_id)
  values (gid, me, 'member', cid);

  insert into public.chain_group_members (group_id, user_id)
  select gid, f from unnest(friends) as f;

  return gid;
end;
$$;

create function public.invite_to_group(p_group_id uuid, p_friend_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  friends uuid[];
begin
  if not exists (
    select 1 from public.chain_groups where id = p_group_id and owner_id = me
  ) then
    raise exception 'group_not_found';
  end if;

  friends := public.group_friend_ids(me, p_friend_ids);

  insert into public.chain_group_members (group_id, user_id)
  select p_group_id, f from unnest(friends) as f
  on conflict do nothing;

  if (
    select count(*) from public.chain_group_members where group_id = p_group_id
  ) > 20 then
    raise exception 'group_too_big';
  end if;
end;
$$;

-- Daveti kabul edince üyenin kendi zinciri (aynı ad, renk, tür) açılır.
create function public.respond_group_invite(p_group_id uuid, p_accept boolean)
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

  insert into public.chains (owner_id, title, color, kind, group_id)
  values (me, g.title, g.color, g.kind, g.id)
  returning id into cid;

  update public.chain_group_members
  set status = 'member', chain_id = cid
  where group_id = p_group_id and user_id = me;
end;
$$;

-- Üye gruptan çıkar; zinciri normal bir zincir olarak kalır.
create function public.leave_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  m public.chain_group_members;
begin
  select * into m from public.chain_group_members
  where group_id = p_group_id and user_id = me and status = 'member'
  for update;
  if not found then
    raise exception 'group_not_found';
  end if;
  if exists (select 1 from public.chain_groups where id = p_group_id and owner_id = me) then
    raise exception 'owner_cannot_leave';
  end if;

  update public.chains set group_id = null where id = m.chain_id;
  delete from public.chain_group_members where group_id = p_group_id and user_id = me;
end;
$$;

-- Sahibi grubu siler; üyelerin zincirleri normal zincir olarak kalır.
create function public.delete_group(p_group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.chain_groups where id = p_group_id and owner_id = auth.uid();
  if not found then
    raise exception 'group_not_found';
  end if;
end;
$$;

create function public.my_groups()
returns table (
  group_id uuid,
  title text,
  color text,
  kind text,
  is_owner boolean,
  member_count integer,
  chain_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.title,
    g.color,
    g.kind,
    g.owner_id = auth.uid(),
    (select count(*)::int from public.chain_group_members x
      where x.group_id = g.id and x.status = 'member'),
    m.chain_id
  from public.chain_group_members m
  join public.chain_groups g on g.id = m.group_id
  where m.user_id = auth.uid() and m.status = 'member'
  order by g.created_at desc;
$$;

create function public.group_invites()
returns table (
  group_id uuid,
  title text,
  color text,
  kind text,
  owner_username text,
  member_count integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.title,
    g.color,
    g.kind,
    o.username,
    (select count(*)::int from public.chain_group_members x
      where x.group_id = g.id and x.status = 'member')
  from public.chain_group_members m
  join public.chain_groups g on g.id = m.group_id
  join public.profiles o on o.id = g.owner_id
  where m.user_id = auth.uid() and m.status = 'invited'
  order by g.created_at desc;
$$;

-- Grup sıralaması: önce tüm üyelerin zincirleri güncellenir (kırılanlar görünsün),
-- sonra zincir uzunluğuna göre sıralanır. Sadece grup üyeleri görebilir.
create function public.group_standings(p_group_id uuid)
returns table (
  member_id uuid,
  member_username text,
  member_display_name text,
  chain_length integer,
  best_chain_length integer,
  state text
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
    end
  from public.chain_group_members m
  join public.chains c on c.id = m.chain_id
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id and m.status = 'member'
  order by c.current_length desc, p.username;
end;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function
  public.cleanup_group_on_owner_chain_delete(), public.block_group_chain_archive(),
  public.settle_chain_for(uuid, uuid), public.group_friend_ids(uuid, uuid[]),
  public.create_chain_group(text, text, text, uuid[]), public.invite_to_group(uuid, uuid[]),
  public.respond_group_invite(uuid, boolean), public.leave_group(uuid),
  public.delete_group(uuid), public.my_groups(), public.group_invites(),
  public.group_standings(uuid)
  from public, anon, authenticated;

grant execute on function
  public.create_chain_group(text, text, text, uuid[]), public.invite_to_group(uuid, uuid[]),
  public.respond_group_invite(uuid, boolean), public.leave_group(uuid),
  public.delete_group(uuid), public.my_groups(), public.group_invites(),
  public.group_standings(uuid)
  to authenticated;
