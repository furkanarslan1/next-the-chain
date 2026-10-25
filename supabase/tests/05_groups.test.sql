-- Ortak zincirler: kurma, davet, katılma, ayrılma, silme ve sıralama.
do $$
declare
  o uuid := gen_random_uuid();  -- sahip
  m uuid := gen_random_uuid();  -- arkadaş (üye olacak)
  x uuid := gen_random_uuid();  -- yabancı
  p uuid := gen_random_uuid();  -- ücretsiz plan, 2 zinciri dolu arkadaş
  gid uuid; gid2 uuid; cid uuid; n int; st text;
  today date := (now() at time zone 'UTC')::date;
begin
  insert into auth.users (id, email, aud, role) values
    (o, 'tg_o@test.invalid', 'authenticated', 'authenticated'),
    (m, 'tg_m@test.invalid', 'authenticated', 'authenticated'),
    (x, 'tg_x@test.invalid', 'authenticated', 'authenticated'),
    (p, 'tg_p@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'tgr_o', plan = 'max' where id = o;
  update public.profiles set username = 'tgr_m', plan = 'max' where id = m;
  update public.profiles set username = 'tgr_x' where id = x;
  update public.profiles set username = 'tgr_p' where id = p;
  insert into public.friendships (requester_id, addressee_id, status) values
    (o, m, 'accepted'), (o, p, 'accepted');
  insert into public.chains (owner_id, title, color, kind) values
    (p, 'p1', '#ff6a3d', 'build'), (p, 'p2', '#ff6a3d', 'build');

  perform set_config('request.jwt.claim.sub', o::text, true);

  -- Sadece arkadaşlar davet edilebilir.
  begin
    perform public.create_chain_group('Spor', '#4d8dff', 'build', array[x]);
    raise exception 'FAIL: arkadas olmayan davet edildi';
  exception when others then
    if sqlerrm !~ 'not_friends' then raise exception 'FAIL: yabanci davet -> %', sqlerrm; end if;
  end;

  -- Kurma: sahibin kendi zinciri açılır, arkadaş davetli kalır.
  gid := public.create_chain_group('Spor', '#4d8dff', 'build', array[m, p]);
  select count(*) into n from public.chains where owner_id = o and group_id = gid;
  if n <> 1 then raise exception 'FAIL: sahibin grup zinciri acilmadi (%)', n; end if;
  select count(*) into n from public.my_groups();
  if n <> 1 then raise exception 'FAIL: sahip grubu goremiyor (%)', n; end if;

  -- Sahip olmayan davet/silme yapamaz; bekleyen davetleri sadece sahip görür.
  perform set_config('request.jwt.claim.sub', m::text, true);
  select count(*) into n from public.group_invites();
  if n <> 1 then raise exception 'FAIL: davet gorunmedi (%)', n; end if;
  select count(*) into n from public.my_groups();
  if n <> 0 then raise exception 'FAIL: davetli kisi henuz uye gorundu'; end if;
  select count(*) into n from public.group_pending_invites(gid);
  if n <> 0 then raise exception 'FAIL: sahip olmayan bekleyen davetleri gordu'; end if;
  begin
    perform public.delete_group(gid);
    raise exception 'FAIL: uye grubu sildi';
  exception when others then
    if sqlerrm !~ 'group_not_found' then raise exception 'FAIL: uye silme -> %', sqlerrm; end if;
  end;
  begin
    perform public.invite_to_group(gid, array[x]);
    raise exception 'FAIL: sahip olmayan davet etti';
  exception when others then
    if sqlerrm !~ 'group_not_found' then raise exception 'FAIL: uye davet -> %', sqlerrm; end if;
  end;

  -- Katılma: kendi zinciri otomatik açılır ve gruba bağlanır.
  perform public.respond_group_invite(gid, true);
  select count(*) into n from public.chains where owner_id = m and group_id = gid and title = 'Spor';
  if n <> 1 then raise exception 'FAIL: katilinca zincir acilmadi (%)', n; end if;
  select count(*) into n from public.my_groups();
  if n <> 1 then raise exception 'FAIL: katilan grubu goremiyor'; end if;

  -- Plan limiti dolu kullanıcı katılamaz.
  perform set_config('request.jwt.claim.sub', p::text, true);
  begin
    perform public.respond_group_invite(gid, true);
    raise exception 'FAIL: plan limiti dolu kullanici katildi';
  exception when others then
    if sqlerrm !~ 'chain_limit' then raise exception 'FAIL: limit dolu katilma -> %', sqlerrm; end if;
  end;
  perform public.respond_group_invite(gid, false);
  select count(*) into n from public.group_invites();
  if n <> 0 then raise exception 'FAIL: reddedilen davet kaldi'; end if;

  -- Sıralama: sadece üyeler görür; durumlar doğru (done / broken).
  perform set_config('request.jwt.claim.sub', x::text, true);
  begin
    perform * from public.group_standings(gid);
    raise exception 'FAIL: uye olmayan siralamayi gordu';
  exception when others then
    if sqlerrm !~ 'group_not_found' then raise exception 'FAIL: yabanci siralama -> %', sqlerrm; end if;
  end;
  update public.chains set current_length = 3, best_length = 3, last_day = today
    where owner_id = o and group_id = gid;
  update public.chains set current_length = 0, break_count = 1, last_day = null
    where owner_id = m and group_id = gid;
  perform set_config('request.jwt.claim.sub', o::text, true);
  select member_username || ':' || state into st from public.group_standings(gid) where member_username = 'tgr_o';
  if st <> 'tgr_o:done' then raise exception 'FAIL: sahip durumu=% (done)', st; end if;
  select member_username || ':' || state into st from public.group_standings(gid) where member_username = 'tgr_m';
  if st <> 'tgr_m:broken' then raise exception 'FAIL: uye durumu=% (broken)', st; end if;
  select gt_done || '/' || gt_total into st from public.my_groups_today() where gt_group_id = gid;
  if st <> '1/2' then raise exception 'FAIL: bugun ozeti=% (1/2)', st; end if;

  -- Ortak zincir arşivlenemez.
  begin
    update public.chains set archived_at = now() where owner_id = o and group_id = gid;
    raise exception 'FAIL: ortak zincir arsivlendi';
  exception when others then
    if sqlerrm !~ 'group_chain_archive' then raise exception 'FAIL: arsiv -> %', sqlerrm; end if;
  end;

  -- Üye ayrılır: zinciri normal zincir olarak kalır. Sahip ayrılamaz.
  perform set_config('request.jwt.claim.sub', m::text, true);
  perform public.leave_group(gid);
  select count(*) into n from public.chains where owner_id = m and group_id is null and title = 'Spor';
  if n <> 1 then raise exception 'FAIL: ayrilan uyenin zinciri normal kalmadi (%)', n; end if;
  perform set_config('request.jwt.claim.sub', o::text, true);
  begin
    perform public.leave_group(gid);
    raise exception 'FAIL: sahip ayrildi';
  exception when others then
    if sqlerrm !~ 'owner_cannot_leave' then raise exception 'FAIL: sahip ayrilma -> %', sqlerrm; end if;
  end;

  -- Sahip grubu siler: zincirleri normal olarak kalır.
  perform public.delete_group(gid);
  select count(*) into n from public.chain_groups where id = gid;
  if n <> 0 then raise exception 'FAIL: grup silinmedi'; end if;
  select count(*) into n from public.chains where owner_id = o and title = 'Spor' and group_id is null;
  if n <> 1 then raise exception 'FAIL: grup silinince sahibin zinciri normal kalmadi (%)', n; end if;

  -- Sahip kendi grup zincirini silerse grup dağılır.
  gid2 := public.create_chain_group('Koşu', '#2fd27c', 'build', array[m]);
  select id into cid from public.chains where owner_id = o and group_id = gid2;
  delete from public.chains where id = cid;
  select count(*) into n from public.chain_groups where id = gid2;
  if n <> 0 then raise exception 'FAIL: sahibin zinciri silinince grup dagilmadi'; end if;

  raise exception 'TEST_PASSED';
end $$;
