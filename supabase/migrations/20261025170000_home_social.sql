-- Ana sayfa sosyal özetleri:
--  * ortak zincirlerde "bugün x/y kişi tamamladı"
--  * arkadaşların bugünkü durumu (karşılıklı ve kapatılabilir)

-- ---------------------------------------------------------------------------
-- Gizlilik: bugünkü durumumu arkadaşlarım görsün
-- ---------------------------------------------------------------------------
-- Kapalıysa kişi arkadaşlarının şeridinde hiç görünmez ("tamamlamadı" bilgisi de
-- gizli kalır). Karşılıklılık: kendi durumunu paylaşmayan, başkalarınınkini de göremez.
alter table public.profiles add column share_today boolean not null default true;
grant update (share_today) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Ortak zincirlerim için bugünkü özet
-- ---------------------------------------------------------------------------
-- Her üyenin KENDİ yerel gününe göre: zinciri bugün tamamlandıysa "tamam" sayılır.
-- Başkalarının zincirini güncellemez (salt okuma); sadece benim üyesi olduğum gruplar.
create function public.my_groups_today()
returns table (
  gt_group_id uuid,
  gt_title text,
  gt_color text,
  gt_done integer,
  gt_total integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.title,
    g.color,
    (count(*) filter (
      where c.current_length > 0
        and c.last_day >= (now() at time zone p.timezone)::date
    ))::int,
    count(*)::int
  from public.chain_group_members me
  join public.chain_groups g on g.id = me.group_id
  join public.chain_group_members m on m.group_id = g.id and m.status = 'member'
  join public.chains c on c.id = m.chain_id
  join public.profiles p on p.id = m.user_id
  where me.user_id = auth.uid() and me.status = 'member'
  group by g.id, g.title, g.color, g.created_at
  order by g.created_at desc;
$$;

-- ---------------------------------------------------------------------------
-- Arkadaşlarım bugün
-- ---------------------------------------------------------------------------
-- Durum: done (tüm aktif zincirleri tamam), partial (bir kısmı), waiting (hiçbiri).
-- Dönmeyenler: durumunu paylaşmayanlar ve aktif zinciri olmayanlar. Ben de
-- paylaşmıyorsam boş döner (karşılıklılık). En fazla 20 kişi.
create function public.friends_today()
returns table (
  ft_user_id uuid,
  ft_username text,
  ft_state text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    pr.id,
    pr.username,
    case
      when count(*) filter (
        where c.current_length > 0 and c.last_day >= (now() at time zone pr.timezone)::date
      ) = count(*) then 'done'
      when count(*) filter (
        where c.current_length > 0 and c.last_day >= (now() at time zone pr.timezone)::date
      ) > 0 then 'partial'
      else 'waiting'
    end
  from public.friendships f
  join public.profiles pr
    on pr.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  join public.chains c on c.owner_id = pr.id and c.archived_at is null
  where f.status = 'accepted'
    and auth.uid() in (f.requester_id, f.addressee_id)
    and pr.share_today
    and pr.username is not null
    and (select share_today from public.profiles where id = auth.uid())
  group by pr.id, pr.username, pr.timezone
  order by
    min(case
      when c.current_length > 0 and c.last_day >= (now() at time zone pr.timezone)::date then 0
      else 1
    end),
    pr.username
  limit 20;
$$;

-- ---------------------------------------------------------------------------
-- Yetkiler
-- ---------------------------------------------------------------------------
revoke execute on function public.my_groups_today(), public.friends_today()
  from public, anon;
grant execute on function public.my_groups_today(), public.friends_today()
  to authenticated;
