-- Rütbe ve haftalık özet paylaşım kartlarının verisi (sadece kendi profilin; saatte en fazla 60 istek,
-- zincir ve rozet kartlarıyla aynı sınır).
create function public.share_profile_data()
returns table (
  sh_username text,
  sh_active_days integer,
  sh_total integer,
  sh_timezone text
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.check_rate_limit('share', 60, interval '1 hour');

  return query
  select p.username, p.active_days, p.total_completed, p.timezone
  from public.profiles p
  where p.id = auth.uid();
end;
$$;

revoke execute on function public.share_profile_data() from public, anon;
grant execute on function public.share_profile_data() to authenticated;
