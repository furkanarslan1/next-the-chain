-- Grup sahibi için: henüz yanıtlanmamış davetler. Sahibinden başkasına boş döner.
create function public.group_pending_invites(p_group_id uuid)
returns table (
  member_id uuid,
  member_username text
)
language sql
stable
security definer
set search_path = ''
as $$
  select m.user_id, p.username
  from public.chain_group_members m
  join public.chain_groups g on g.id = m.group_id
  join public.profiles p on p.id = m.user_id
  where m.group_id = p_group_id
    and m.status = 'invited'
    and g.owner_id = auth.uid()
  order by p.username;
$$;

revoke execute on function public.group_pending_invites(uuid) from public, anon;
grant execute on function public.group_pending_invites(uuid) to authenticated;
