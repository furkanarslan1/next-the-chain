-- Profil: aktif gün sayacı, ısı haritası, rütbe kutlaması ve listelerdeki aktif gün sütunları.
do $$
declare
  u uuid := gen_random_uuid();
  f uuid := gen_random_uuid();
  today date;
  c1 uuid; c2 uuid; g uuid; month_start date;
  n int; v int; r record;
begin
  insert into auth.users (id, email, aud, role) values
    (u, 'tp_a@test.invalid', 'authenticated', 'authenticated'),
    (f, 'tp_b@test.invalid', 'authenticated', 'authenticated');
  update public.profiles set username = 'tp_one', plan = 'max' where id = u;
  update public.profiles set username = 'tp_two' where id = f;
  today := public.user_today(u);
  perform set_config('request.jwt.claim.sub', u::text, true);

  -- Aktif gün: günün ilk halkası sayılır; aynı gün ikinci zincir ya da tekrar basış saymaz.
  insert into public.chains (owner_id, title, color, kind, current_length, last_day) values (u, 'a', '#ff6a3d', 'build', 2, today - 1) returning id into c1;
  insert into public.chains (owner_id, title, color, kind, current_length, last_day) values (u, 'b', '#4d8dff', 'build', 2, today - 1) returning id into c2;
  select active_days into n from public.profiles where id = u;
  if n <> 0 then raise exception 'FAIL: baslangic aktif gun=% (0)', n; end if;
  perform public.check_in(c1);
  select active_days into n from public.profiles where id = u;
  if n <> 1 then raise exception 'FAIL: ilk halka sonrasi aktif gun=% (1)', n; end if;
  perform public.check_in(c2);
  perform public.check_in(c1);
  select active_days, total_completed into n, v from public.profiles where id = u;
  if n <> 1 then raise exception 'FAIL: ayni gun ikinci zincir/tekrar aktif gunu artirdi (%)', n; end if;
  if v <> 2 then raise exception 'FAIL: toplam halka=% (2)', v; end if;

  -- Isı haritası: yakın günler günlük kayıttan, eski aylar özet maskelerinden gelir.
  insert into public.check_ins (chain_id, user_id, day, is_joker) values
    (c1, u, today - 1, false), (c2, u, today - 1, false), (c1, u, today - 2, true);
  month_start := date_trunc('month', (today - 80)::timestamp)::date;
  insert into public.chain_history (chain_id, month, done_mask, joker_mask) values (c1, month_start, 1 << 4, 1 << 9);
  select hm_done into v from public.my_heatmap(120) where hm_day = today;
  if v is distinct from 2 then raise exception 'FAIL: bugun tamamlanan=% (2)', v; end if;
  select hm_done into v from public.my_heatmap(120) where hm_day = today - 1;
  if v is distinct from 2 then raise exception 'FAIL: dun tamamlanan=% (2)', v; end if;
  select hm_done || '/' || hm_joker into r from public.my_heatmap(120) where hm_day = today - 2;
  if r::text <> '(0/1)' and r::text <> '0/1' then raise exception 'FAIL: joker gunu=% (0/1)', r; end if;
  select count(*) into n from public.my_heatmap(120) where hm_day = month_start + 4 and hm_done = 1;
  if n <> 1 then raise exception 'FAIL: ozetten gelen eski gun yok (%)', n; end if;
  select count(*) into n from public.my_heatmap(120) where hm_day = month_start + 9 and hm_joker = 1;
  if n <> 1 then raise exception 'FAIL: ozetten gelen eski joker gunu yok (%)', n; end if;
  select count(*) into n from public.my_heatmap(20) where hm_day = month_start + 4;
  if n <> 0 then raise exception 'FAIL: pencere disindaki eski gun dondu'; end if;
  -- Başkası benim haritamı göremez (her çağrı kendi verisini döndürür).
  perform set_config('request.jwt.claim.sub', f::text, true);
  select count(*) into n from public.my_heatmap(120);
  if n <> 0 then raise exception 'FAIL: baskasinin isi haritasi dondu (%)', n; end if;
  perform set_config('request.jwt.claim.sub', u::text, true);

  -- Rütbe kutlaması sadece ilerler; geçersiz değer reddedilir.
  perform public.set_rank_seen(2::smallint);
  perform public.set_rank_seen(1::smallint);
  perform public.set_rank_seen(99::smallint);
  select rank_seen into n from public.profiles where id = u;
  if n <> 2 then raise exception 'FAIL: rank_seen=% (2 kalmali)', n; end if;

  -- Listelerde aktif gün sütunu profil değeriyle aynı.
  insert into public.friendships (requester_id, addressee_id, status) values (u, f, 'accepted');
  select active_days into n from public.friends_leaderboard(today - 7) where user_id = u;
  if n is distinct from 1 then raise exception 'FAIL: friends_leaderboard aktif gun=% (1)', n; end if;
  update public.profiles set active_days = 120 where id = u;
  select active_days into n from public.friends_leaderboard(today - 7) where user_id = u;
  if n is distinct from 120 then raise exception 'FAIL: friends_leaderboard guncel degil (%)', n; end if;
  select public.create_chain_group('G', '#ff6a3d', 'build', array[f]) into g;
  select member_active_days into n from public.group_standings(g) where member_id = u;
  if n is distinct from 120 then raise exception 'FAIL: group_standings aktif gun=% (120)', n; end if;
  select lg_active_days into n from public.league_standings() where lg_is_me;
  if n is distinct from 120 then raise exception 'FAIL: league_standings aktif gun=% (120)', n; end if;

  raise exception 'TEST_PASSED';
end $$;
