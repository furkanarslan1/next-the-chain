-- İsteğe bağlı joker (zincir başına 0-2) ve haftalık hedefli zincir.
do $$
declare
  u uuid := gen_random_uuid();
  today date;
  ws date;
  c public.chains;
  cid uuid;
  gid uuid;
  n int;
begin
  insert into auth.users (id, email, aud, role)
  values (u, 'oj1@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'oj_one', plan = 'max' where id = u;
  today := public.user_today(u);
  ws := date_trunc('week', today)::date;
  perform set_config('request.jwt.claim.sub', u::text, true);

  -- 1) Varsayılan 2; azaltma anında geçerli olur.
  insert into public.chains (owner_id, title, color, kind) values (u, 'j', '#ff6a3d', 'build')
  returning id into cid;
  select * into c from public.chains where id = cid;
  if c.weekly_jokers <> 2 then raise exception 'FAIL: varsayilan joker=% (beklenen 2)', c.weekly_jokers; end if;
  c := public.set_chain_jokers(cid, 0::smallint);
  if c.weekly_jokers <> 0 or c.pending_weekly_jokers is not null then
    raise exception 'FAIL: azaltma aninda gecmedi (joker=%, bekleyen=%)', c.weekly_jokers, c.pending_weekly_jokers;
  end if;

  -- 2) Artırma bekler: sonraki Pazartesi'den geçerli.
  c := public.set_chain_jokers(cid, 2::smallint);
  if c.weekly_jokers <> 0 or c.pending_weekly_jokers <> 2 or c.pending_jokers_from <> ws + 7 then
    raise exception 'FAIL: artirma beklemedi (joker=%, bekleyen=%, tarih=%)',
      c.weekly_jokers, c.pending_weekly_jokers, c.pending_jokers_from;
  end if;
  -- Aynı değere dönmek beklemeyi iptal eder.
  c := public.set_chain_jokers(cid, 0::smallint);
  if c.pending_weekly_jokers is not null then raise exception 'FAIL: bekleyen artis temizlenmedi'; end if;

  -- Geçersiz değer reddedilir.
  begin
    perform public.set_chain_jokers(cid, 3::smallint);
    raise exception 'FAIL: 3 joker kabul edildi';
  exception when others then
    if sqlerrm !~ 'invalid_jokers' then raise exception 'FAIL: gecersiz joker -> %', sqlerrm; end if;
  end;

  -- 3) Bekleyen artış geçmişe uygulanmaz: dün kaçırıldı, hak 0 -> kırılır.
  insert into public.chains (owner_id, title, color, kind, current_length, best_length, weekly_jokers,
    pending_weekly_jokers, pending_jokers_from, last_day)
  values (u, 'p', '#4d8dff', 'build', 5, 5, 0, 2, ws + 7, today - 2) returning id into cid;
  c := public.settle_chain(cid);
  if c.current_length <> 0 or c.break_count <> 1 then
    raise exception 'FAIL: bekleyen artis gecmise uygulandi (uzunluk=%)', c.current_length;
  end if;

  -- 4) Vakti gelen artış uygulanır.
  insert into public.chains (owner_id, title, color, kind, current_length, best_length, weekly_jokers,
    pending_weekly_jokers, pending_jokers_from, last_day)
  values (u, 'q', '#9b7bff', 'build', 5, 5, 0, 2, ws, today - 1) returning id into cid;
  c := public.settle_chain(cid);
  if c.weekly_jokers <> 2 or c.pending_weekly_jokers is not null or c.pending_jokers_from is not null then
    raise exception 'FAIL: vakti gelen artis uygulanmadi (joker=%)', c.weekly_jokers;
  end if;

  -- 5) Ortak zincirde hak grup kurulurken seçilir ve sonradan değişmez.
  gid := public.create_chain_group('Grup', '#2fd27c', 'build', '{}'::uuid[], 1::smallint);
  select * into c from public.chains where owner_id = u and group_id = gid;
  if c.weekly_jokers <> 1 then raise exception 'FAIL: grup zinciri joker=% (beklenen 1)', c.weekly_jokers; end if;
  begin
    perform public.set_chain_jokers(c.id, 0::smallint);
    raise exception 'FAIL: grup zincirinin jokeri degisti';
  exception when others then
    if sqlerrm !~ 'group_jokers_fixed' then raise exception 'FAIL: grup joker -> %', sqlerrm; end if;
  end;

  -- 6) Haftalık hedefli zincirde joker 0'a sabitlenir ve joker ayarı reddedilir.
  insert into public.chains (owner_id, title, color, kind, goal_per_week, weekly_jokers)
  values (u, 'w', '#22d3c5', 'build', 3, 2) returning id into cid;
  select * into c from public.chains where id = cid;
  if c.weekly_jokers <> 0 then raise exception 'FAIL: haftalik zincirde joker=%', c.weekly_jokers; end if;
  begin
    perform public.set_chain_jokers(cid, 1::smallint);
    raise exception 'FAIL: haftalik zincirde joker ayarlandi';
  exception when others then
    if sqlerrm !~ 'weekly_goal_no_jokers' then raise exception 'FAIL: haftalik joker -> %', sqlerrm; end if;
  end;

  -- 7) Haftalık hedef: geçen hafta hedef tamamsa zincir sürer.
  insert into public.chains (owner_id, title, color, kind, goal_per_week, current_length, best_length,
    streak_started_on, last_day)
  values (u, 'w1', '#22d3c5', 'build', 3, 3, 3, ws - 30, ws - 5) returning id into cid;
  insert into public.check_ins (chain_id, user_id, day, is_joker) values
    (cid, u, ws - 7, false), (cid, u, ws - 6, false), (cid, u, ws - 5, false);
  c := public.settle_chain(cid);
  if c.current_length <> 3 then raise exception 'FAIL: hedef tamamken zincir kirildi (%)', c.current_length; end if;

  -- 8) Hedef tutmazsa hafta bitince kırılır.
  insert into public.chains (owner_id, title, color, kind, goal_per_week, current_length, best_length,
    streak_started_on, last_day)
  values (u, 'w2', '#22d3c5', 'build', 3, 2, 2, ws - 30, ws - 6) returning id into cid;
  insert into public.check_ins (chain_id, user_id, day, is_joker) values
    (cid, u, ws - 7, false), (cid, u, ws - 6, false);
  c := public.settle_chain(cid);
  if c.current_length <> 0 or c.break_count <> 1 or c.best_length <> 2 then
    raise exception 'FAIL: hedef tutmayinca kirilmadi (uzunluk=%, kirilma=%)', c.current_length, c.break_count;
  end if;

  -- 9) İlk (kısmi) haftada hedef kalan günlerle sınırlıdır: Cuma başlayan seri, hedef 5 ama 3 gün yeter.
  insert into public.chains (owner_id, title, color, kind, goal_per_week, current_length, best_length,
    streak_started_on, last_day)
  values (u, 'w3', '#22d3c5', 'build', 5, 3, 3, ws - 3, ws - 1) returning id into cid;
  insert into public.check_ins (chain_id, user_id, day, is_joker) values
    (cid, u, ws - 3, false), (cid, u, ws - 2, false), (cid, u, ws - 1, false);
  c := public.settle_chain(cid);
  if c.current_length <> 3 then raise exception 'FAIL: kismi ilk hafta kirildi (%)', c.current_length; end if;

  -- 10) Tamamen boş geçen bir hafta kırar.
  insert into public.chains (owner_id, title, color, kind, goal_per_week, current_length, best_length,
    streak_started_on, last_day)
  values (u, 'w4', '#22d3c5', 'build', 1, 1, 1, ws - 20, ws - 14) returning id into cid;
  insert into public.check_ins (chain_id, user_id, day, is_joker) values (cid, u, ws - 14, false);
  c := public.settle_chain(cid);
  if c.current_length <> 0 then raise exception 'FAIL: bos hafta zinciri kirmadi (%)', c.current_length; end if;

  -- 11) check_in seriyi başlatır: seri başlangıç günü yazılır, aynı gün ikinci kez saymaz.
  c := public.check_in(cid);
  if c.current_length <> 1 or c.streak_started_on <> today then
    raise exception 'FAIL: haftalik check_in uzunluk=% baslangic=%', c.current_length, c.streak_started_on;
  end if;
  c := public.check_in(cid);
  if c.current_length <> 1 then raise exception 'FAIL: ayni gun ikinci halka sayildi'; end if;
  select count(*) into n from public.check_ins where chain_id = cid and day = today and not is_joker;
  if n <> 1 then raise exception 'FAIL: bugunun halka sayisi=%', n; end if;

  -- 12) İstemci (authenticated) sadece 0-2 joker ve 1-6 hedefle zincir açabilir.
  set local role authenticated;
  begin
    insert into public.chains (owner_id, title, color, kind, weekly_jokers) values (u, 'x', '#ff6a3d', 'build', 5);
    raise exception 'FAIL: istemci 5 jokerle zincir acti';
  exception when others then
    if sqlerrm !~ 'row-level security' then raise exception 'FAIL: istemci joker -> %', sqlerrm; end if;
  end;
  begin
    insert into public.chains (owner_id, title, color, kind, goal_per_week) values (u, 'x', '#ff6a3d', 'build', 7);
    raise exception 'FAIL: istemci 7 gunluk hedef acti';
  exception when others then
    if sqlerrm !~ 'row-level security|goal_per_week' then raise exception 'FAIL: istemci hedef -> %', sqlerrm; end if;
  end;
  begin
    update public.chains set weekly_jokers = 2 where id = cid;
    raise exception 'FAIL: istemci jokeri dogrudan guncelledi';
  exception when others then
    if sqlerrm !~ 'permission denied' then raise exception 'FAIL: istemci guncelleme -> %', sqlerrm; end if;
  end;
  reset role;

  raise exception 'TEST_PASSED';
end $$;
