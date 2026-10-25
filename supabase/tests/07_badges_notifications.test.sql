-- Rozet kuralları ve seyreltme, bildirim tetikleyicileri, gelen kutusu ve kırılma uyarısı.
do $$
declare
  ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                      gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  nm text[] := array['tb_a','tb_b','tb_c','tb_d','tb_e','tb_f','tb_g','tb_h'];
  now22 timestamptz := (date_trunc('day', now() at time zone 'UTC') + interval '22 hours') at time zone 'UTC';
  d date := (now() at time zone 'UTC')::date;
  mon date := (now() at time zone 'UTC')::date - (extract(isodow from (now() at time zone 'UTC')::date)::int - 1);
  i int; n int; cid uuid; gid uuid; txt text;
begin
  for i in 1..8 loop
    insert into auth.users (id, email, aud, role) values (ids[i], nm[i] || '@test.invalid', 'authenticated', 'authenticated');
    update public.profiles set username = nm[i], plan = 'max' where id = ids[i];
  end loop;

  ----------------------------------------------------------------- rozetler
  update public.profiles set total_completed = 1 where id = ids[1];
  insert into public.chains (owner_id,title,color,kind,best_length) values (ids[1],'a','#ff6a3d','build',7);
  update public.profiles set total_completed = 100 where id = ids[2];
  insert into public.chains (owner_id,title,color,kind,best_length) values (ids[2],'b','#ff6a3d','build',30);
  insert into public.chains (owner_id,title,color,kind,break_count,current_length) values (ids[3],'c','#ff6a3d','build',1,7);
  insert into public.chains (owner_id,title,color,kind,break_count,current_length) values (ids[4],'d','#ff6a3d','build',1,6);
  insert into public.friendships (requester_id, addressee_id, status) values (ids[1], ids[5], 'accepted');
  insert into public.league_results (week_start, user_id, tier, cohort, place, score, outcome)
    values (date '2026-01-05', ids[6], 1, 0, 1, 100, 'promoted');

  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  txt := (select string_agg(bd_badge, ',' order by bd_badge) from public.my_badges());
  if txt <> 'first_friend,first_link,streak_7' then raise exception 'FAIL: A rozetleri=% ', txt; end if;
  perform set_config('request.jwt.claim.sub', ids[2]::text, true);
  txt := (select string_agg(bd_badge, ',' order by bd_badge) from public.my_badges());
  if txt <> 'first_link,streak_30,streak_7,total_100' then raise exception 'FAIL: B rozetleri=%', txt; end if;
  perform set_config('request.jwt.claim.sub', ids[3]::text, true);
  txt := (select string_agg(bd_badge, ',' order by bd_badge) from public.my_badges());
  if txt <> 'comeback' then raise exception 'FAIL: C rozetleri=% (geri donus)', txt; end if;
  perform set_config('request.jwt.claim.sub', ids[4]::text, true);
  select count(*) into n from public.my_badges();
  if n <> 0 then raise exception 'FAIL: 6 uzunlukta geri donus rozeti verildi'; end if;
  perform set_config('request.jwt.claim.sub', ids[5]::text, true);
  txt := (select string_agg(bd_badge, ',' order by bd_badge) from public.my_badges());
  if txt <> 'first_friend' then raise exception 'FAIL: E rozetleri=%', txt; end if;
  perform set_config('request.jwt.claim.sub', ids[6]::text, true);
  txt := (select string_agg(bd_badge, ',' order by bd_badge) from public.my_badges());
  if txt <> 'first_promotion,perfect_week' then raise exception 'FAIL: F rozetleri=% (lig)', txt; end if;

  -- Seyreltme: 30 dk içinde yeni durum görünmez; yeni rozetler "yeni", görüldü işaretlenince değil.
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  select count(*) into n from public.my_badges() where bd_is_new;
  if n <> 3 then raise exception 'FAIL: yeni rozet sayisi=% (3)', n; end if;
  perform public.mark_badges_seen();
  select count(*) into n from public.my_badges() where bd_is_new;
  if n <> 0 then raise exception 'FAIL: goruldu isaretlenmedi'; end if;
  update public.profiles set total_completed = 100 where id = ids[1];
  select count(*) into n from public.my_badges() where bd_badge = 'total_100';
  if n <> 0 then raise exception 'FAIL: kontrol seyreltilmedi (30 dk icinde yeni rozet geldi)'; end if;
  -- check_in sayacı sıfırlar, rozet hemen gelir.
  select id into cid from public.chains where owner_id = ids[1] limit 1;
  perform public.check_in(cid);
  select count(*) into n from public.profiles where id = ids[1] and badges_synced_at is null;
  if n <> 1 then raise exception 'FAIL: check_in rozet sayacini sifirlamadi'; end if;
  select count(*) into n from public.my_badges() where bd_badge = 'total_100';
  if n <> 1 then raise exception 'FAIL: check_in sonrasi total_100 gelmedi'; end if;

  -- Paylaşım verisi: sadece kendi zinciri / kazanılmış rozet.
  select count(*) into n from public.share_badge_data('streak_7');
  if n <> 1 then raise exception 'FAIL: kazanilan rozet paylasim verisi yok'; end if;
  select count(*) into n from public.share_badge_data('streak_365');
  if n <> 0 then raise exception 'FAIL: kazanilmamis rozet paylasim verisi dondu'; end if;
  select count(*) into n from public.share_chain_data((select id from public.chains where owner_id = ids[2] limit 1));
  if n <> 0 then raise exception 'FAIL: baskasinin zinciri paylasim verisi dondu'; end if;

  ------------------------------------------------------------- bildirimler
  -- Tetikleyiciler: istek, kabul, grup daveti.
  insert into public.friendships (requester_id, addressee_id) values (ids[7], ids[8]);
  select count(*) into n from public.notifications where user_id = ids[8] and kind = 'friend_request' and data ->> 'from' = 'tb_g';
  if n <> 1 then raise exception 'FAIL: istek bildirimi=% (1)', n; end if;
  update public.friendships set status = 'accepted' where requester_id = ids[7] and addressee_id = ids[8];
  select count(*) into n from public.notifications where user_id = ids[7] and kind = 'friend_accepted' and data ->> 'from' = 'tb_h';
  if n <> 1 then raise exception 'FAIL: kabul bildirimi=% (1)', n; end if;
  insert into public.chain_groups (owner_id,title,color,kind) values (ids[7],'Grup','#ff6a3d','build') returning id into gid;
  insert into public.chain_group_members (group_id, user_id) values (gid, ids[8]);
  select count(*) into n from public.notifications where user_id = ids[8] and kind = 'group_invite' and data ->> 'title' = 'Grup';
  if n <> 1 then raise exception 'FAIL: davet bildirimi=% (1)', n; end if;

  -- Gelen kutusu: bir kez alınır, geri bırakılınca tekrar alınır.
  select count(*) into n from public.claim_notifications(500) c where c.user_id = any(ids);
  if n < 3 then raise exception 'FAIL: ilk alma=% (>=3)', n; end if;
  select count(*) into n from public.claim_notifications(500) c where c.user_id = any(ids);
  if n <> 0 then raise exception 'FAIL: ikinci almada ayni satirlar geldi (%)', n; end if;
  perform public.release_notifications((select array_agg(id) from public.notifications where user_id = any(ids)));
  select count(*) into n from public.claim_notifications(500) c where c.user_id = any(ids);
  if n < 3 then raise exception 'FAIL: geri birakilan satirlar tekrar alinamadi (%)', n; end if;

  -- Kırılma uyarısı: yalnız joker hakkı bitmiş, bugün tamamlanmamış, ≥3 halkalık zincir; 22:00 yerel.
  delete from public.push_subscriptions where user_id = any(ids);
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
    select u, 'https://example.invalid/' || u, 'k', 'a' from unnest(ids) u;
  update public.profiles set risk_reminders_enabled = true where id = any(ids);
  -- A2 (ids[1]) riskte: 1 joker hakkı, bu hafta 1 joker kullanılmış, dün korunmuş, bugün yok.
  delete from public.chains where owner_id = any(ids);
  insert into public.chains (owner_id,title,color,kind,current_length,weekly_jokers,last_day)
    values (ids[1],'r','#ff6a3d','build',5,1,d - 1) returning id into cid;
  insert into public.check_ins values (cid, ids[1], mon, true);
  -- Jokeri kalmış (2 hak, 0 kullanılmış) -> riskte değil.
  insert into public.chains (owner_id,title,color,kind,current_length,weekly_jokers,last_day) values (ids[2],'r','#ff6a3d','build',5,2,d - 1);
  -- Bugün tamamlamış -> riskte değil.
  insert into public.chains (owner_id,title,color,kind,current_length,weekly_jokers,last_day) values (ids[3],'r','#ff6a3d','build',5,1,d)
    returning id into cid;
  insert into public.check_ins values (cid, ids[3], mon, true) on conflict do nothing;
  -- 2 halkalık -> riskte değil.
  insert into public.chains (owner_id,title,color,kind,current_length,weekly_jokers,last_day) values (ids[4],'r','#ff6a3d','build',2,0,d - 1);
  -- Uyarıları kapalı -> riskte değil.
  insert into public.chains (owner_id,title,color,kind,current_length,weekly_jokers,last_day) values (ids[5],'r','#ff6a3d','build',5,0,d - 1);
  update public.profiles set risk_reminders_enabled = false where id = ids[5];
  -- Joker hakkı sıfır ve dün korunmuş -> riskte.
  insert into public.chains (owner_id,title,color,kind,current_length,weekly_jokers,last_day) values (ids[6],'r','#ff6a3d','build',9,0,d - 1);

  select string_agg(p.username, ',' order by p.username) into txt
    from public.users_at_risk(now22, 500) u join public.profiles p on p.id = u.user_id where u.user_id = any(ids);
  if txt is distinct from 'tb_a,tb_f' then raise exception 'FAIL: riskli kullanicilar=% (tb_a,tb_f)', txt; end if;
  select count(*) into n from public.users_at_risk(now22 - interval '1 hour', 500) u where u.user_id = any(ids);
  if n <> 0 then raise exception 'FAIL: 21:00 yerel saatte uyari listelendi (%)', n; end if;

  raise exception 'TEST_PASSED';
end $$;
