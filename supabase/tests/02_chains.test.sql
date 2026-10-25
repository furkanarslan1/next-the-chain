-- Zincirin çekirdek kuralları: halka ekleme, joker, kırılma, nüks, plan limiti, sıkıştırma.
do $$
declare
  u uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  today date;
  c public.chains;
  cid uuid;
  n int;
begin
  insert into auth.users (id, email, aud, role) values
    (u, 'tc1@test.invalid', 'authenticated', 'authenticated'),
    (f, 'tc2@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'tc_one', plan = 'max' where id = u;
  update public.profiles set username = 'tc_two' where id = f;
  today := public.user_today(u);
  perform set_config('request.jwt.claim.sub', u::text, true);

  -- 1) check_in bir halka ekler; aynı gün ikinci kez saymaz.
  insert into public.chains (owner_id, title, color, kind, current_length, best_length, total_completed, last_day)
  values (u, 'a', '#ff6a3d', 'build', 3, 3, 3, today - 1) returning id into cid;
  c := public.check_in(cid);
  if c.current_length <> 4 or c.last_day <> today or c.total_completed <> 4 or c.best_length <> 4 then
    raise exception 'FAIL: check_in sonucu uzunluk=% son_gun=%', c.current_length, c.last_day;
  end if;
  c := public.check_in(cid);
  if c.current_length <> 4 then raise exception 'FAIL: ayni gun ikinci check_in sayildi (%)', c.current_length; end if;
  select count(*) into n from public.check_ins where chain_id = cid and not is_joker;
  if n <> 1 then raise exception 'FAIL: check_in satiri=% (beklenen 1)', n; end if;
  select total_completed into n from public.profiles where id = u;
  if n <> 1 then raise exception 'FAIL: profil toplami=% (beklenen 1)', n; end if;

  -- 2) Kaçırılan günler jokerle kapanır: uzunluk korunur, halka eklenmez.
  insert into public.chains (owner_id, title, color, kind, current_length, best_length, weekly_jokers, last_day)
  values (u, 'j', '#4d8dff', 'build', 5, 5, 7, today - 3) returning id into cid;
  c := public.settle_chain(cid);
  if c.current_length <> 5 or c.last_day <> today - 1 then
    raise exception 'FAIL: joker sonrasi uzunluk=% son_gun=% (beklenen 5, dun)', c.current_length, c.last_day;
  end if;
  select count(*) into n from public.check_ins where chain_id = cid and is_joker;
  if n <> 2 then raise exception 'FAIL: joker sayisi=% (beklenen 2)', n; end if;

  -- 3) Joker hakkı yoksa zincir kırılır; en uzun seri ve toplam korunur.
  insert into public.chains (owner_id, title, color, kind, current_length, best_length, total_completed, weekly_jokers, last_day)
  values (u, 'k', '#9b7bff', 'build', 5, 6, 40, 0, today - 2) returning id into cid;
  c := public.settle_chain(cid);
  if c.current_length <> 0 or c.last_day is not null or c.break_count <> 1 then
    raise exception 'FAIL: kirilma uzunluk=% son_gun=% kirilma=%', c.current_length, c.last_day, c.break_count;
  end if;
  if c.best_length <> 6 or c.total_completed <> 40 then
    raise exception 'FAIL: kirilinca best=% toplam=% (6 ve 40 korunmali)', c.best_length, c.total_completed;
  end if;

  -- 4) Kırılan zincir bir sonraki check-in'de 1'den başlar.
  c := public.check_in(cid);
  if c.current_length <> 1 or c.total_completed <> 41 then
    raise exception 'FAIL: kirildiktan sonra check_in uzunluk=% toplam=%', c.current_length, c.total_completed;
  end if;

  -- 5) Nüks (sadece quit): sıfırlar, toplam düşmez; build zincirinde reddedilir.
  insert into public.chains (owner_id, title, color, kind, current_length, best_length, total_completed, last_day)
  values (u, 'q', '#2fd27c', 'quit', 4, 4, 4, today) returning id into cid;
  c := public.report_relapse(cid);
  if c.current_length <> 0 or c.total_completed <> 4 or c.break_count <> 1 then
    raise exception 'FAIL: nuks sonucu uzunluk=% toplam=%', c.current_length, c.total_completed;
  end if;
  begin
    perform public.report_relapse((select id from public.chains where owner_id = u and kind = 'build' limit 1));
    raise exception 'FAIL: build zincirinde nuks kabul edildi';
  exception when others then
    if sqlerrm !~ 'chain not found' then raise exception 'FAIL: build nuks -> %', sqlerrm; end if;
  end;

  -- 6) Başkasının zincirine dokunulamaz.
  begin
    perform public.check_in((select id from public.chains where owner_id = u limit 1)) ;
    perform set_config('request.jwt.claim.sub', f::text, true);
    perform public.check_in((select id from public.chains where owner_id = u limit 1));
    raise exception 'FAIL: baskasinin zincirine check_in yapildi';
  exception when others then
    if sqlerrm !~ 'chain not found' then raise exception 'FAIL: yabanci check_in -> %', sqlerrm; end if;
  end;
  perform set_config('request.jwt.claim.sub', u::text, true);

  -- 7) Plan limiti: ücretsiz kullanıcı 2 aktif zincir açabilir; arşivlenen sayılmaz; geri almak da limite tabi.
  insert into public.chains (owner_id, title, color, kind) values (f, 'f1', '#ff6a3d', 'build') returning id into cid;
  insert into public.chains (owner_id, title, color, kind) values (f, 'f2', '#ff6a3d', 'build');
  begin
    insert into public.chains (owner_id, title, color, kind) values (f, 'f3', '#ff6a3d', 'build');
    raise exception 'FAIL: ucretsiz planda 3. zincir acildi';
  exception when others then
    if sqlerrm !~ 'chain_limit' then raise exception 'FAIL: limit -> %', sqlerrm; end if;
  end;
  update public.chains set archived_at = now() where id = cid;
  insert into public.chains (owner_id, title, color, kind) values (f, 'f3', '#ff6a3d', 'build');
  begin
    update public.chains set archived_at = null where id = cid;
    raise exception 'FAIL: limit doluyken arsivden geri alindi';
  exception when others then
    if sqlerrm !~ 'chain_limit' then raise exception 'FAIL: geri alma -> %', sqlerrm; end if;
  end;

  -- 8) 60 günden eski günler check-in sırasında aylık özete sıkıştırılır.
  insert into public.chains (owner_id, title, color, kind, current_length, last_day)
  values (u, 'old', '#ff6a3d', 'build', 3, today - 1) returning id into cid;
  insert into public.check_ins (chain_id, user_id, day, is_joker) values
    (cid, u, today - 70, false), (cid, u, today - 69, true);
  perform public.check_in(cid);
  select count(*) into n from public.check_ins where chain_id = cid and day < today - 60;
  if n <> 0 then raise exception 'FAIL: eski gunler silinmedi (%)', n; end if;
  select count(*) into n from public.chain_history where chain_id = cid and (done_mask <> 0 or joker_mask <> 0);
  if n < 1 then raise exception 'FAIL: chain_history ozeti olusmadi'; end if;

  raise exception 'TEST_PASSED';
end $$;
