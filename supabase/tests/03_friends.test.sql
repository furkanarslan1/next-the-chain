-- Arkadaşlık: istek kuralları, görünürlük, arama ve "bugünkü durum".
do $$
declare
  ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                      gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  nm text[] := array['tf_a','tf_b','tf_c','tf_d','tf_e','tf_f','tf_g'];
  today date := (now() at time zone 'UTC')::date;
  i int; n int; res text; st text;
begin
  for i in 1..7 loop
    insert into auth.users (id, email, aud, role) values (ids[i], nm[i] || '@test.invalid', 'authenticated', 'authenticated');
    update public.profiles set username = nm[i], plan = 'max' where id = ids[i];
  end loop;
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);

  -- İstek gönderme: gönderilir, tekrar edilemez, kendine olmaz, olmayan kullanıcıya olmaz.
  res := public.send_friend_request(ids[2]);
  if res <> 'sent' then raise exception 'FAIL: istek sonucu=% (sent beklenir)', res; end if;
  begin
    perform public.send_friend_request(ids[2]);
    raise exception 'FAIL: ayni kisiye ikinci istek kabul edildi';
  exception when others then
    if sqlerrm !~ 'already_exists' then raise exception 'FAIL: tekrar istek -> %', sqlerrm; end if;
  end;
  begin
    perform public.send_friend_request(ids[1]);
    raise exception 'FAIL: kendine istek kabul edildi';
  exception when others then
    if sqlerrm !~ 'self_request' then raise exception 'FAIL: kendine istek -> %', sqlerrm; end if;
  end;
  begin
    perform public.send_friend_request(gen_random_uuid());
    raise exception 'FAIL: olmayan kullaniciya istek kabul edildi';
  exception when others then
    if sqlerrm !~ 'user_not_found' then raise exception 'FAIL: olmayan kullanici -> %', sqlerrm; end if;
  end;

  -- Karşılıklı istek otomatik kabul edilir.
  perform set_config('request.jwt.claim.sub', ids[2]::text, true);
  res := public.send_friend_request(ids[1]);
  if res <> 'accepted' then raise exception 'FAIL: karsilikli istek=% (accepted beklenir)', res; end if;

  -- Görünürlük kapalı kullanıcı yeni istek alamaz (varlığı belli edilmez); kendisi istek atarsa kabul edilir.
  update public.profiles set discoverable = false where id = ids[3];
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  begin
    perform public.send_friend_request(ids[3]);
    raise exception 'FAIL: gizli kullaniciya istek gitti';
  exception when others then
    if sqlerrm !~ 'user_not_found' then raise exception 'FAIL: gizli kullanici -> %', sqlerrm; end if;
  end;
  perform set_config('request.jwt.claim.sub', ids[3]::text, true);
  res := public.send_friend_request(ids[1]);
  if res <> 'sent' then raise exception 'FAIL: gizli kullanicinin istegi=%', res; end if;
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  res := public.send_friend_request(ids[3]);
  if res <> 'accepted' then raise exception 'FAIL: gizli kullanicinin istegine karsilik=%', res; end if;

  -- Arama: en az 2 karakter; önek eşleşir; gizli kullanıcı (ilişki yoksa) çıkmaz.
  select count(*) into n from public.search_users('t');
  if n <> 0 then raise exception 'FAIL: 1 karakterle arama sonuc dondurdu (%)', n; end if;
  update public.profiles set discoverable = false where id = ids[5];
  select count(*) into n from public.search_users('tf_') where username in ('tf_d', 'tf_e', 'tf_f', 'tf_g');
  if n <> 3 then raise exception 'FAIL: arama sonucu=% (tf_d, tf_f, tf_g beklenir, gizli tf_e yok)', n; end if;
  select relation into st from public.search_users('tf_b') where username = 'tf_b';
  if st <> 'friends' then raise exception 'FAIL: arkadas iliskisi=%', st; end if;

  -- Bugünkü durum: B tamam, C kısmen, D (arkadaş değil) görünmez; paylaşmayan görünmez.
  perform public.send_friend_request(ids[4]);
  perform set_config('request.jwt.claim.sub', ids[4]::text, true);
  perform public.send_friend_request(ids[1]);
  insert into public.chains (owner_id, title, color, kind, current_length, last_day) values
    (ids[2], 'b1', '#ff6a3d', 'build', 3, today), (ids[2], 'b2', '#ff6a3d', 'build', 3, today),
    (ids[3], 'c1', '#ff6a3d', 'build', 3, today), (ids[3], 'c2', '#ff6a3d', 'build', 3, today - 1),
    (ids[4], 'd1', '#ff6a3d', 'build', 3, today - 1);
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  select ft_state into st from public.friends_today() where ft_username = 'tf_b';
  if st is distinct from 'done' then raise exception 'FAIL: tf_b durumu=% (done)', st; end if;
  select ft_state into st from public.friends_today() where ft_username = 'tf_c';
  if st is distinct from 'partial' then raise exception 'FAIL: tf_c durumu=% (partial)', st; end if;
  select ft_state into st from public.friends_today() where ft_username = 'tf_d';
  if st is distinct from 'waiting' then raise exception 'FAIL: tf_d durumu=% (waiting)', st; end if;

  update public.profiles set share_today = false where id = ids[2];
  select count(*) into n from public.friends_today() where ft_username = 'tf_b';
  if n <> 0 then raise exception 'FAIL: durumunu paylasmayan arkadas gorundu'; end if;
  update public.profiles set share_today = false where id = ids[1];
  select count(*) into n from public.friends_today();
  if n <> 0 then raise exception 'FAIL: kendi durumunu paylasmayan baskalarini gordu (%)', n; end if;

  raise exception 'TEST_PASSED';
end $$;
