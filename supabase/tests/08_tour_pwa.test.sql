-- Tanıtım turu aşaması (sadece ilerler, sıfırlanabilir) ve PWA yükleme kaydı.
do $$
declare
  u uuid := gen_random_uuid();
  st int; t1 timestamptz; t2 timestamptz;
begin
  insert into auth.users (id, email, aud, role) values (u, 'tt_a@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'tt_a' where id = u;
  perform set_config('request.jwt.claim.sub', u::text, true);

  select tour_stage into st from public.profiles where id = u;
  if st <> 0 then raise exception 'FAIL: baslangic asamasi=% (0)', st; end if;
  perform public.set_tour_stage(1::smallint);
  perform public.set_tour_stage(0::smallint);
  select tour_stage into st from public.profiles where id = u;
  if st <> 1 then raise exception 'FAIL: asama geri alindi (%)', st; end if;
  perform public.set_tour_stage(2::smallint);
  perform public.set_tour_stage(5::smallint);
  select tour_stage into st from public.profiles where id = u;
  if st <> 2 then raise exception 'FAIL: gecersiz asama kabul edildi (%)', st; end if;
  perform public.reset_tour();
  select tour_stage into st from public.profiles where id = u;
  if st <> 0 then raise exception 'FAIL: reset_tour calismadi (%)', st; end if;

  perform public.mark_pwa_installed();
  select pwa_installed_at into t1 from public.profiles where id = u;
  perform public.mark_pwa_installed();
  select pwa_installed_at into t2 from public.profiles where id = u;
  if t1 is null or t1 is distinct from t2 then raise exception 'FAIL: pwa kaydi degisti ya da yok'; end if;

  raise exception 'TEST_PASSED';
end $$;
