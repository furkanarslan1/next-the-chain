-- Ligler: puanlama, silme hilesinin kapalı olması, gizlilik, sıralama kaydı ve haftalık kapanış.
-- Haftanın hangi gününde çalıştırılırsa çalışsın aynı sonucu verir (puanlar haftanın sonuna göre).
do $$
declare
  w date := public.league_week_start();
  wend timestamptz := (public.league_week_start() + 7)::timestamptz;
  ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
                      gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  nm text[] := array['tl_a','tl_b','tl_c','tl_d','tl_e','tl_f','tl_g'];
  i int; d int; n int; cid uuid; cx uuid; s record; sc int; sc_before int; sc_after int;
  r1 int; r2 int; bad int;
begin
  for i in 1..7 loop
    insert into auth.users (id, email, aud, role) values (ids[i], nm[i] || '@test.invalid', 'authenticated', 'authenticated');
    update public.profiles set username = nm[i] where id = ids[i];
  end loop;

  -- A: 7/7. B: 4/7. C: 2 gün + 2 joker -> 2/5. D: haftanın ortasında açıldı, 4/4. E: arşivlendi, 3/3.
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[1],'a','#ff6a3d','build', w - 20) returning id into cid;
  for d in 0..6 loop insert into public.check_ins values (cid, ids[1], w + d, false); end loop;
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[2],'b','#ff6a3d','build', w - 20) returning id into cid;
  for d in 0..3 loop insert into public.check_ins values (cid, ids[2], w + d, false); end loop;
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[3],'c','#ff6a3d','build', w - 20) returning id into cid;
  for d in 0..1 loop insert into public.check_ins values (cid, ids[3], w + d, false); end loop;
  for d in 2..3 loop insert into public.check_ins values (cid, ids[3], w + d, true); end loop;
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[4],'d','#ff6a3d','build', (w + 3)::timestamptz) returning id into cid;
  for d in 3..6 loop insert into public.check_ins values (cid, ids[4], w + d, false); end loop;
  insert into public.chains (owner_id,title,color,kind,created_at,archived_at) values (ids[5],'e','#ff6a3d','build', w - 20, (w + 2)::timestamptz) returning id into cid;
  for d in 0..2 loop insert into public.check_ins values (cid, ids[5], w + d, false); end loop;
  -- F: iki zincir (X: 2 gün, Y: 7 gün) -> (2+7)/(7+7)
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[6],'fx','#ff6a3d','build', w - 20) returning id into cx;
  for d in 0..1 loop insert into public.check_ins values (cx, ids[6], w + d, false); end loop;
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[6],'fy','#ff6a3d','build', w - 20) returning id into cid;
  for d in 0..6 loop insert into public.check_ins values (cid, ids[6], w + d, false); end loop;
  -- G: zinciri var ama hiç halkası yok.
  insert into public.chains (owner_id,title,color,kind,created_at) values (ids[7],'g','#ff6a3d','build', w - 5);

  -- 1) Puanlar (hafta sonuna göre).
  select * into s from public.league_score(ids[1], w, wend);
  if s.score <> 100 or s.done <> 7 or s.expected <> 7 then raise exception 'FAIL: A=% %/%', s.score, s.done, s.expected; end if;
  select * into s from public.league_score(ids[2], w, wend);
  if s.score <> 57 or s.expected <> 7 then raise exception 'FAIL: B=% (57 beklenir)', s.score; end if;
  select * into s from public.league_score(ids[3], w, wend);
  if s.score <> 40 or s.done <> 2 or s.expected <> 5 then raise exception 'FAIL: C=% %/% (joker dusulmeli)', s.score, s.done, s.expected; end if;
  select * into s from public.league_score(ids[4], w, wend);
  if s.score <> 100 or s.expected <> 4 then raise exception 'FAIL: D=% beklenen=% (zincir acilisindan itibaren)', s.score, s.expected; end if;
  select * into s from public.league_score(ids[5], w, wend);
  if s.score <> 100 or s.expected <> 3 then raise exception 'FAIL: E=% beklenen=% (arsiv gununde bitmeli)', s.score, s.expected; end if;
  select * into s from public.league_score(ids[6], w, wend);
  if s.score <> 64 then raise exception 'FAIL: F=% (64 beklenir)', s.score; end if;
  select * into s from public.league_score(ids[7], w, wend);
  if s.score <> 0 or s.done <> 0 then raise exception 'FAIL: G=% (halkasiz 0 beklenir)', s.score; end if;

  -- 2) Silme hilesi: başarısız zinciri silmek puanı yükseltmez (şu anki zamana göre karşılaştır).
  for i in 1..7 loop perform public.league_enroll(ids[i], w); end loop;
  select score into sc_before from public.league_score(ids[6], w, now());
  delete from public.chains where id = cx;
  select score into sc_after from public.league_score(ids[6], w, now());
  if sc_before is distinct from sc_after then
    raise exception 'FAIL: zincir silinince puan degisti % -> % (hile acik)', sc_before, sc_after;
  end if;

  -- 3) Gizlilik: gizli oyuncu başkalarına anonim, kendisine adıyla görünür.
  update public.profiles set league_visible = false where id = ids[2];
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  select count(*) into n from public.league_standings() where lg_user_id = ids[2] and lg_username is null;
  if n <> 1 then raise exception 'FAIL: gizli oyuncu anonim degil'; end if;
  perform set_config('request.jwt.claim.sub', ids[2]::text, true);
  select count(*) into n from public.league_standings() where lg_is_me and lg_username = 'tl_b';
  if n <> 1 then raise exception 'FAIL: gizli oyuncu kendi adini goremiyor'; end if;
  perform set_config('request.jwt.claim.sub', ids[1]::text, true);
  select count(*) into n from public.league_standings();
  if n < 7 then raise exception 'FAIL: grup 7 kisiyi icermiyor (%)', n; end if;

  -- 4) Sıralama kaydı paylaşılır: veri değişse de 6 saat içinde eski skor gelir, kayıt eskiyince yenilenir.
  perform set_config('request.jwt.claim.sub', ids[7]::text, true);
  select lg_score into r1 from public.league_standings() where lg_is_me;
  insert into public.check_ins values ((select id from public.chains where owner_id = ids[7]), ids[7], w, false);
  select lg_score into r2 from public.league_standings() where lg_is_me;
  if r1 is distinct from r2 then raise exception 'FAIL: kayit taze iken puan degisti % -> %', r1, r2; end if;
  update public.league_snapshots set computed_at = now() - interval '7 hours';
  select lg_score into r2 from public.league_standings() where lg_is_me;
  if r2 is not distinct from r1 then raise exception 'FAIL: kayit eskiyince puan yenilenmedi (% -> %)', r1, r2; end if;

  -- 5) Haftalık kapanış: sonuçlar yazılır, iki kez çalıştırmak yinelemez, terfi/düşüş bildirimi eklenir.
  perform public.settle_leagues(wend + interval '13 hours');
  select count(*) into n from public.league_results where week_start = w and user_id = any(ids);
  if n <> 7 then raise exception 'FAIL: sonuc satiri=% (7 beklenir)', n; end if;
  perform public.settle_leagues(wend + interval '13 hours');
  select count(*) into n from public.league_results where week_start = w and user_id = any(ids);
  if n <> 7 then raise exception 'FAIL: kapanis ikinci calismada coguldu (%)', n; end if;
  select count(*) into bad from public.league_results
    where week_start = w and user_id = any(ids) and outcome not in ('promoted', 'demoted', 'stayed');
  if bad <> 0 then raise exception 'FAIL: gecersiz sonuc degeri'; end if;
  -- Her terfi/düşüş için tam bir bildirim; "stayed" için bildirim yok.
  select count(*) into bad from public.league_results lr
    where lr.week_start = w and lr.user_id = any(ids) and lr.outcome <> 'stayed'
      and (select count(*) from public.notifications nt where nt.user_id = lr.user_id and nt.kind = 'league_result') <> 1;
  if bad <> 0 then raise exception 'FAIL: terfi/dusus bildirimi eksik ya da fazla (%)', bad; end if;
  select count(*) into bad from public.league_results lr
    where lr.week_start = w and lr.user_id = any(ids) and lr.outcome = 'stayed'
      and exists (select 1 from public.notifications nt where nt.user_id = lr.user_id and nt.kind = 'league_result');
  if bad <> 0 then raise exception 'FAIL: ligde kalana bildirim gitti (%)', bad; end if;
  -- Kapanan haftanın silinmiş-zincir kayıtları temizlenir.
  select count(*) into n from public.league_deleted_stats where week_start <= w;
  if n <> 0 then raise exception 'FAIL: kapanan haftanin silinmis zincir kaydi kaldi (%)', n; end if;

  raise exception 'TEST_PASSED';
end $$;
