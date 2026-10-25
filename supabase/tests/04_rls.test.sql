-- Satır düzeyi güvenlik: kullanıcı yalnızca izin verilenleri okur/yazar.
-- `authenticated` rolüne geçip gerçek bir kullanıcı gibi denenir.
do $$
declare
  a uuid := gen_random_uuid();
  b uuid := gen_random_uuid();
  c uuid := gen_random_uuid();
  ca uuid; cb uuid;
  n int;
begin
  insert into auth.users (id, email, aud, role) values
    (a, 'tr_a@test.invalid', 'authenticated', 'authenticated'),
    (b, 'tr_b@test.invalid', 'authenticated', 'authenticated'),
    (c, 'tr_c@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'tr_a' where id = a;
  update public.profiles set username = 'tr_b' where id = b;
  update public.profiles set username = 'tr_c' where id = c;
  insert into public.chains (owner_id, title, color, kind, visibility) values (a, 'a-ozel', '#ff6a3d', 'build', 'private') returning id into ca;
  insert into public.chains (owner_id, title, color, kind, visibility) values (b, 'b-ozel', '#ff6a3d', 'build', 'private') returning id into cb;
  insert into public.chains (owner_id, title, color, kind, visibility) values (b, 'b-arkadas', '#ff6a3d', 'build', 'friends');
  insert into public.check_ins (chain_id, user_id, day, is_joker) values (cb, b, (now() at time zone 'UTC')::date, false);
  insert into public.friendships (requester_id, addressee_id, status) values (a, b, 'accepted');

  perform set_config('request.jwt.claim.sub', a::text, true);
  set local role authenticated;

  -- Profiller: kendini ve arkadaşını okur, yabancıyı okuyamaz.
  select count(*) into n from public.profiles where id in (a, b);
  if n <> 2 then raise exception 'FAIL: kendi ve arkadas profili okunamadi (%)', n; end if;
  select count(*) into n from public.profiles where id = c;
  if n <> 0 then raise exception 'FAIL: yabanci profili okundu'; end if;

  -- Zincirler: kendinin hepsi; arkadaşın sadece "friends" görünürlüklüsü.
  select count(*) into n from public.chains where owner_id = a;
  if n <> 1 then raise exception 'FAIL: kendi zinciri okunamadi (%)', n; end if;
  select count(*) into n from public.chains where owner_id = b and title = 'b-ozel';
  if n <> 0 then raise exception 'FAIL: arkadasin ozel zinciri okundu'; end if;
  select count(*) into n from public.chains where owner_id = b and title = 'b-arkadas';
  if n <> 1 then raise exception 'FAIL: arkadasin paylasilan zinciri okunamadi'; end if;

  -- Başkasının günlük kaydı (özel zincir) okunamaz.
  select count(*) into n from public.check_ins where chain_id = cb;
  if n <> 0 then raise exception 'FAIL: baskasinin ozel zincirinin check-in kaydi okundu (%)', n; end if;

  -- Sayaçlar istemciden yazılamaz.
  begin
    update public.chains set current_length = 999 where id = ca;
    raise exception 'FAIL: sayac dogrudan guncellendi';
  exception when others then
    if sqlerrm !~ 'permission denied' then raise exception 'FAIL: sayac guncelleme -> %', sqlerrm; end if;
  end;
  begin
    update public.profiles set plan = 'max' where id = a;
    raise exception 'FAIL: plan dogrudan degistirildi';
  exception when others then
    if sqlerrm !~ 'permission denied' then raise exception 'FAIL: plan -> %', sqlerrm; end if;
  end;
  begin
    insert into public.check_ins (chain_id, user_id, day, is_joker) values (ca, a, current_date, false);
    raise exception 'FAIL: check_ins dogrudan yazildi';
  exception when others then
    if sqlerrm !~ 'permission denied' then raise exception 'FAIL: check_ins yazma -> %', sqlerrm; end if;
  end;
  begin
    insert into public.friendships (requester_id, addressee_id) values (a, c);
    raise exception 'FAIL: arkadaslik dogrudan eklendi (kurallar atlandi)';
  exception when others then
    if sqlerrm !~ 'permission denied' then raise exception 'FAIL: arkadaslik ekleme -> %', sqlerrm; end if;
  end;

  -- Başkasının zincirini silemez/güncelleyemez (RLS: 0 satır etkilenir).
  delete from public.chains where id = cb;
  update public.chains set title = 'ele-gecirildi' where id = cb;

  -- Yönetim tabloları istemciye tamamen kapalı.
  begin perform 1 from public.reports limit 1; raise exception 'FAIL: reports okundu';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: reports -> %', sqlerrm; end if; end;
  begin perform 1 from public.notifications limit 1; raise exception 'FAIL: notifications okundu';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: notifications -> %', sqlerrm; end if; end;
  begin perform 1 from public.blocked_words limit 1; raise exception 'FAIL: blocked_words okundu';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: blocked_words -> %', sqlerrm; end if; end;
  begin perform 1 from public.league_members limit 1; raise exception 'FAIL: league_members okundu';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: league_members -> %', sqlerrm; end if; end;
  begin perform 1 from public.user_badges limit 1; raise exception 'FAIL: user_badges okundu';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: user_badges -> %', sqlerrm; end if; end;

  -- Servis fonksiyonları istemciye kapalı.
  begin perform public.users_to_remind(); raise exception 'FAIL: users_to_remind istemciden calisti';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: users_to_remind -> %', sqlerrm; end if; end;
  begin perform public.claim_notifications(5); raise exception 'FAIL: claim_notifications istemciden calisti';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: claim_notifications -> %', sqlerrm; end if; end;
  begin perform public.settle_chain_for(ca, a); raise exception 'FAIL: settle_chain_for istemciden calisti';
  exception when others then if sqlerrm !~ 'permission denied' then raise exception 'FAIL: settle_chain_for -> %', sqlerrm; end if; end;

  reset role;
  -- Başkasının zinciri değişmemiş olmalı.
  select count(*) into n from public.chains where id = cb and title = 'b-ozel';
  if n <> 1 then raise exception 'FAIL: baskasinin zinciri silindi/degisti'; end if;

  raise exception 'TEST_PASSED';
end $$;
