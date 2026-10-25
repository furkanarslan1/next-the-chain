-- Tanıtım turu ilerlemesi ve PWA yükleme ölçümü.
--  tour_stage: 0 = tur görülmedi, 1 = genel tur bitti (zincir turu bekliyor), 2 = tamamlandı/atlandı
--  pwa_installed_at: uygulama ana ekrandan (standalone) ilk açıldığı an

alter table public.profiles
  add column tour_stage smallint not null default 0 check (tour_stage between 0 and 2),
  add column pwa_installed_at timestamptz;

-- Tur aşaması sadece ilerler (istemci geri alamaz); sıfırlamak için reset_tour().
create function public.set_tour_stage(p_stage smallint)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set tour_stage = p_stage
  where id = auth.uid() and p_stage between 0 and 2 and p_stage > tour_stage;
$$;

create function public.reset_tour()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles set tour_stage = 0 where id = auth.uid();
$$;

create function public.mark_pwa_installed()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.profiles
  set pwa_installed_at = coalesce(pwa_installed_at, now())
  where id = auth.uid();
$$;

revoke execute on function
  public.set_tour_stage(smallint), public.reset_tour(), public.mark_pwa_installed()
  from public, anon;
grant execute on function
  public.set_tour_stage(smallint), public.reset_tour(), public.mark_pwa_installed()
  to authenticated;
