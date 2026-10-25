-- Kötüye kullanım korumaları: yasaklı adlar, saat dilimi sınırı, oran sınırı, bildirme.
do $$
declare
  u1 uuid := gen_random_uuid();
  u2 uuid := gen_random_uuid();
  n int;
begin
  insert into auth.users (id, email, aud, role) values
    (u1, 'tg1@test.invalid', 'authenticated', 'authenticated'),
    (u2, 'tg2@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'tg_one' where id = u1;
  update public.profiles set username = 'tg_two' where id = u2;

  -- Yasaklı kelimeler: kaçışlar yakalanır, masum adlar geçer.
  if public.normalize_username('F_u_c_k') <> 'fuck' then raise exception 'FAIL: normalize_username'; end if;
  if public.username_allowed('thechain_x') then raise exception 'FAIL: thechain_x engellenmedi'; end if;
  if public.username_allowed('4dm1n_ali') then raise exception 'FAIL: 4dm1n_ali engellenmedi'; end if;
  if public.username_allowed('support') then raise exception 'FAIL: support (exact) engellenmedi'; end if;
  if public.username_allowed('b1tch99') then raise exception 'FAIL: b1tch99 engellenmedi'; end if;
  begin
    if not public.username_allowed('kaan_35') then raise exception 'FAIL: kaan_35 engellendi'; end if;
    if not public.username_allowed('sibel_yilmaz') then raise exception 'FAIL: sibel_yilmaz engellendi'; end if;
    if not public.username_allowed('sikke_toplayici') then raise exception 'FAIL: sikke_toplayici engellendi'; end if;
  end;

  begin
    update public.profiles set username = 'orospu_x' where id = u1;
    raise exception 'FAIL: yasakli ad kabul edildi';
  exception when others then
    if sqlerrm !~ 'username_blocked' then raise exception 'FAIL: yasakli ad -> %', sqlerrm; end if;
  end;

  -- Saat dilimi: ilk değişiklik serbest, 24 saat içinde ikincisi reddedilir.
  update public.profiles set timezone = 'Europe/London' where id = u1;
  begin
    update public.profiles set timezone = 'Asia/Tokyo' where id = u1;
    raise exception 'FAIL: ikinci saat dilimi degisikligi kabul edildi';
  exception when others then
    if sqlerrm !~ 'timezone_cooldown' then raise exception 'FAIL: saat dilimi -> %', sqlerrm; end if;
  end;
  begin
    update public.profiles set timezone = 'Mars/Olympus' where id = u2;
    raise exception 'FAIL: gecersiz saat dilimi kabul edildi';
  exception when others then
    if sqlerrm !~ 'invalid_timezone' then raise exception 'FAIL: gecersiz dilim -> %', sqlerrm; end if;
  end;

  -- Oran sınırı: limit 3, 5 deneme -> 2 ret (sayaç limitte kalır).
  perform set_config('request.jwt.claim.sub', u1::text, true);
  n := 0;
  for i in 1..5 loop
    begin
      perform public.check_rate_limit('test_guard', 3, interval '1 minute');
    exception when others then
      if sqlerrm ~ 'rate_limited' then n := n + 1; else raise; end if;
    end;
  end loop;
  if n <> 2 then raise exception 'FAIL: oran siniri reddedilen=% (beklenen 2)', n; end if;

  -- Bildirme: aynı kişiyi aynı nedenle iki kez bildirmek tek kayıt bırakır, kendini bildirmek reddedilir.
  perform public.report_user(u2, 'username', 'ilk');
  perform public.report_user(u2, 'username', 'tekrar');
  select count(*) into n from public.reports where reporter_id = u1 and reported_id = u2;
  if n <> 1 then raise exception 'FAIL: bildirim sayisi=% (beklenen 1)', n; end if;
  begin
    perform public.report_user(u1, 'abuse', null);
    raise exception 'FAIL: kendini bildirmek kabul edildi';
  exception when others then
    if sqlerrm !~ 'self_request' then raise exception 'FAIL: kendini bildirme -> %', sqlerrm; end if;
  end;

  raise exception 'TEST_PASSED';
end $$;
