-- Cila: arşivden geri alırken plan limiti ve grup davetini iptal etme.

-- ---------------------------------------------------------------------------
-- Arşivden geri alma da plan limitine tabi (yoksa arşivle-geri al ile aşılırdı).
-- ---------------------------------------------------------------------------
create function public.enforce_chain_restore_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text;
begin
  if old.archived_at is not null and new.archived_at is null then
    select plan into v_plan from public.profiles where id = new.owner_id for update;
    if (
      select count(*) from public.chains
      where owner_id = new.owner_id and archived_at is null and id <> new.id
    ) >= public.plan_chain_limit(v_plan) then
      raise exception 'chain_limit';
    end if;
  end if;
  return new;
end;
$$;

create trigger chains_restore_limit
  before update of archived_at on public.chains
  for each row execute function public.enforce_chain_restore_limit();

-- ---------------------------------------------------------------------------
-- Grup sahibi, henüz yanıtlanmamış bir daveti iptal edebilir.
-- ---------------------------------------------------------------------------
create function public.cancel_group_invite(p_group_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.chain_groups where id = p_group_id and owner_id = auth.uid()
  ) then
    raise exception 'group_not_found';
  end if;

  delete from public.chain_group_members
  where group_id = p_group_id and user_id = p_user_id and status = 'invited';
end;
$$;

revoke execute on function
  public.enforce_chain_restore_limit(), public.cancel_group_invite(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_group_invite(uuid, uuid) to authenticated;
