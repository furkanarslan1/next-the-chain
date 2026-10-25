# The Chain: Sistem ve Kurallar

Bu belge uygulamanın **nasıl çalıştığını** anlatır: kurallar, sınırlar, veri modeli,
güvenlik ve işletim. Kararların gerekçeleri ve yol haritası için `ROADMAP.md`,
bildirim kurulumu için `NOTIFICATIONS.md`'ye bak.

> Durum notu: Ligler (bölüm 9) veritabanında canlıdır; arayüzü `feat/leagues` branch'i merge edilince
> yayında olur.

---

## 1. Ürün özeti

İstikrar uygulaması ("zinciri kırma" yöntemi). Kullanıcı konulara göre zincirler açar.
Her zincirin tek bir aktif halkası vardır. O günün içinde tamamlanırsa zincire eklenir,
ertesi gün sıradaki halka belirir. Zincirler spiral dizilir, her zincirin kendi rengi var.
Mobile-first; önce PWA, sonra React Native (Expo).

## 2. Zincirler

### Türler
- **build (yapacağım):** her gün yapılan şey. Buton: "Bugünü tamamla".
- **quit (bırakacağım):** her gün uzak durulan şey. Buton: "Bugün temiz kaldım". Ek olarak
  **"Nüks oldu"** vardır (bkz. 2.5).

### Alanlar
| Alan | Anlamı |
|---|---|
| `current_length` | Aktif zincirin uzunluğu (kırılınca 0) |
| `best_length` | En uzun zincir (asla düşmez) |
| `total_completed` | Bu zincirde ömür boyu tamamlanan halka (asla düşmez) |
| `break_count` | Kaç kez kırıldı |
| `last_day` | Zincirin korunduğu son gün (tamamlanan ya da jokerle kapatılan), kullanıcının yerel tarihi |
| `weekly_jokers` | Haftalık joker hakkı (şu an herkes için **2**) |
| `visibility` | `private` (varsayılan) ya da `friends`. Veritabanı destekliyor, **arayüzde seçeneği yok** |
| `group_id` | Ortak zincirse bağlı grup (bkz. bölüm 6) |
| `archived_at` | Doluysa arşivde |

Profilde ayrıca `total_completed` (tüm zincirlerin ömür boyu toplamı) tutulur.

### 2.1 "Gün" nedir?
Gün, **kullanıcının kendi saat dilimindeki takvim günüdür**. Saat dilimi cihazdan okunup
profile yazılır (`TimezoneSync`). Geçersiz bir saat dilimi adı veritabanında reddedilir.
Hesaplamalar sunucuda, `user_today()` ile yapılır, istemcinin saatine güvenilmez.

**Saat dilimi değişikliği 24 saatte en fazla bir kez** yapılabilir (ilk değişiklik, varsayılan UTC'den
cihazın dilimine, serbesttir). Aksi halde saat dilimini batıya alarak "bugün"ü 26 saate kadar uzatıp
zinciri kırmamak mümkün olurdu. Sınırdaki değişiklik sessizce reddedilir, bir sonraki gün tekrar denenir.

### 2.2 Check-in (halka ekleme)
`check_in(chain)` RPC'si:
1. Önce zinciri günceller (`settle`, bkz. 2.3).
2. Zincir arşivdeyse reddeder.
3. `last_day >= bugün` ise **hiçbir şey yapmaz** (aynı gün iki kez sayılmaz. Saat dilimini ileri
   geri değiştirerek aynı gün iki halka kazanmak da bu yüzden mümkün değil).
4. Aksi halde `check_ins`'e `done` satırı yazar, sayaçları artırır, `last_day = bugün`.
5. 60 günden eski günleri sıkıştırır (bkz. 8.2).

### 2.3 Joker ve kırılma (`settle`)
Kaçırılan günler **tembel (lazy) olarak**, cron olmadan işlenir: kullanıcı ana sayfayı
açtığında ya da check-in yaptığında.

- Hiç gün kaçmadıysa (`last_day >= bugün - 1`) ya da zincir 0 uzunluktaysa **hiçbir şey yazılmaz**.
- Kaçırılan her gün için (en eskiden başlayarak):
  - O günün bulunduğu **haftada (Pazartesi-Pazar)** kullanılmış joker sayısı `weekly_jokers`'tan
    azsa, o gün için otomatik **joker** yazılır, `last_day` ilerler.
  - Hak bittiyse zincir **kırılır**: `current_length = 0`, `last_day = null`, `break_count + 1`.
    Kalan günler işlenmez.
- **Joker kendiliğinden kullanılır**, kullanıcının basacağı bir buton yoktur.
- **Joker halka eklemez**, sadece zinciri korur.
- Joker hakkı **her Pazartesi yenilenir**. Her zincirin hakkı ayrıdır.

### 2.4 Kırılmanın sonucu
Sadece **aktif zincir sıfırlanır**. `best_length`, zincirin `total_completed`'ı ve profilin
ömür boyu toplamı **düşmez**. Kırılan zincir bir sonraki check-in'de 1'den başlar.

### 2.5 Nüks (sadece quit zincirleri)
`report_relapse`: aktif zinciri sıfırlar (`current_length = 0`, `last_day = null`,
`break_count + 1`). Toplamlar düşmez. Arayüzde onay sorulur.

### 2.6 Arşiv ve silme
- **Arşivle:** zincir "duraklar" ama bu bir dondurma değildir. Arşivdeyken ilerlemez.
- **Geri al:** kaçırılan günler için joker kullanılır, hak yetmezse zincir sıfırlanır.
  Geri alma da **plan limitine** tabidir.
- **Ortak zincir arşivlenemez** (bkz. bölüm 6). Çıkmak için gruptan ayrılmak gerekir.
- **Sil:** kalıcıdır, geçmişiyle birlikte.

## 3. Planlar ve limitler

| Plan | Aktif zincir limiti |
|---|---|
| `free` | **2** |
| `pro` | **5** |
| `max` | **10** |

- Arşivlenen zincirler limite **sayılmaz**; ama kullanıcı başına **toplam en fazla 50** zincir satırı vardır
  (arşivle-yeniden oluştur ile satır şişirmeyi engeller).
- Limit **veritabanında tetikleyiciyle** zorlanır (ekleme ve arşivden geri alma). Arayüz sadece bilgi verir.
- Plan değerini kullanıcı **değiştiremez**. Sütun, istemcinin güncelleyebildiği sütunlar arasında yok;
  sunucu (service role / Supabase paneli) değiştirir. **Ödeme entegrasyonu henüz yok.**
- Rakamlar iki yerde: SQL `plan_chain_limit()` ve TS `PLAN_LIMITS` (`lib/chains.ts`). Birini
  değiştirirsen ikisini de değiştir (asıl zorlama SQL'dedir).
- Plan düşerse mevcut zincirler silinmez, sadece yeni açılamaz.

## 4. Arkadaşlar

- **Arama:** kullanıcı adının başına göre, en az 2 karakter, en fazla 10 sonuç (`search_users`).
  Sonuçta sadece kullanıcı adı, görünen ad, avatar ve ilişki durumu döner.
- **İstek gönderme** yalnızca `send_friend_request` RPC'siyle (doğrudan ekleme kapalı):
  - Kendine istek olmaz, aynı kişiyle ikinci kayıt olmaz.
  - Karşı taraf zaten sana istek göndermişse **otomatik kabul** edilir.
  - En fazla **30 bekleyen** giden istek, en fazla **100 arkadaş**.
- **Kabul / reddet / iptal / arkadaşlıktan çıkar:** doğrudan tablo üzerinden, RLS ile
  (kabul sadece alıcı tarafından). Reddetme, iptal ve çıkarma aynı işlemdir: satırı silmek.
- **Görünürlük (`discoverable`, varsayılan açık):** Kapalıysa aramada çıkmazsın ve kimse
  sana **yeni** istek gönderemez (sunucu "kullanıcı bulunamadı" der, varlığını belli etmez).
  Zaten arkadaş olduklarının, bekleyen isteklerin ve senin gönderdiğin isteklerin üzerinde etkisi yoktur.
- **Oran sınırı:** arama dakikada en fazla **30**, arkadaşlık isteği saatte en fazla **20**. Aşılırsa
  `rate_limited` hatası döner (kullanıcıya Türkçe mesaj gösterilir). Sayaçlar `rate_limits` tablosunda
  kullanıcı ve eylem başına tek satırdır.
- **Bildirme:** Arama sonuçlarında ve grup sıralamasında her kullanıcının yanında bayrak simgesi vardır.
  Neden (uygunsuz ad / kötüye kullanım / diğer) ve en fazla 300 karakterlik not seçilir.
  Bildirimler `reports` tablosuna yazılır; **istemci okuyamaz**, Supabase panelinden (Table Editor)
  okunur. Günde en fazla **20** bildirim, aynı kişiyi aynı nedenle bir kez bildirebilirsin.
- **Profil gizliliği:** Bir profili sadece kendisi ve onunla (bekleyen dahil) arkadaşlık
  ilişkisi olanlar okuyabilir. Tüm kullanıcı listesi çekilemez.
- **Bugünkü durumum (`share_today`, varsayılan açık):** Ana sayfadaki "Arkadaşların" kartında arkadaşların bugünkü
  durumu görünür: `done` (tüm aktif zincirleri tamam), `partial` (bir kısmı), `waiting` (hiçbiri). Sadece bu üç durum
  paylaşılır; zincir adı ya da sayısı görünmez. **Kapalıysa kişi şeritte hiç görünmez** ("tamamlamadı" bilgisi de
  gizli kalır) **ve karşılıklılık gereği başkalarının durumunu da göremez** (`friends_today()` boş döner).
  Ayar: Arkadaşlar sayfası, Gizlilik bölümü. Sadece kabul edilmiş arkadaşlar, en fazla 20 kişi; aktif zinciri
  olmayanlar gösterilmez. Her kişinin durumu kendi yerel gününe göre hesaplanır, salt okuma yapılır.
- **Arkadaş sıralaması:** ben + kabul edilmiş arkadaşlar, seçilen tarihten beri tamamlanan
  halka sayısı (tüm zincirler toplamı). Arayüzde **Bu hafta** (Pazartesi'den) ve **Bu ay**
  (ayın 1'inden). Sadece sayı ve kullanıcı adı görünür, zincir adları görünmez.

## 5. Zincir görünürlüğü
Zincirler varsayılan **özeldir**. `visibility = 'friends'` olan zincirleri arkadaşlar
okuyabilir (veritabanı kuralı hazır, arayüzden seçilemiyor).

## 6. Ortak zincirler (gruplar)

**Model: her üyenin kendi zinciri vardır, hepsi bir gruba bağlıdır.** Biri kırarsa sadece kendi
zinciri sıfırlanır; grup sıralaması üyelerin kendi zincir uzunluklarının karşılaştırmasıdır.

- **Kurma:** başlık, tür, renk + arkadaşlardan davet. Sahibin kendi zinciri hemen açılır.
- **Davet:** sadece kabul edilmiş arkadaşlar. Davet edilen **"Katıl"** deyince **kendi zinciri
  otomatik açılır** (aynı ad, renk, tür) ve **sıfırdan başlar**. Plan limiti buna da uygulanır;
  limiti doluysa katılamaz.
- **Sonradan davet:** sadece grup sahibi. Bekleyen davetler listelenir, sahibi iptal edebilir.
- **Sıralama sayfası:** zincir uzunluğuna göre, her satırda durum:
  - `done`: bugün tamamladı, `pending`: bugün bekliyor (henüz başlamamış olanlar dahil),
  - `broken`: zinciri kırıldı (`current_length = 0` ve `break_count > 0`), **"Başaramayanlar"**
    bölümünde ayrıca listelenir.
  - Sayfa açılırken tüm üyelerin zincirleri o an güncellenir (kırılan biri eski sayısıyla görünmesin).
- **Ayrılma:** üye ayrılırsa zinciri **normal zincir** olarak kalır.
- **Sahip:** gruptan ayrılamaz, grubu **silebilir** (üyelerin zincirleri normal olarak kalır).
  Sahip **kendi grup zincirini silerse** grup dağılır.
- **Üye zincirini silerse** üyelikten düşer.
- **Arşivlenemez:** ortak zincir arşivlenemez (arşivdeki zincir ilerlemez ve sessizce kırılırdı).
- **Ana sayfa özeti:** "Ortak zincirler" bölümünde her grup için "bugün x/y kişi tamamladı" (`my_groups_today()`,
  salt okuma, sadece üyesi olduğun gruplar, davetli olanlar sayılmaz).
- **Sınırlar:** grup başına en fazla **20 kişi**, kullanıcı başına en fazla **10 grup** kurma.
- Grup tablolarına istemci erişimi **yoktur**; her şey RPC üzerinden. Sıralamayı sadece üyeler görür.

## 7. Bildirimler (Web Push)

Detaylı kurulum: `NOTIFICATIONS.md`.

- Kullanıcı Ayarlar'dan bildirimi açar (cihaz başına abonelik; kullanıcı başına en fazla **5 cihaz**).
- **Hatırlatma saati** kullanıcının yerel saatidir, varsayılan **20:00**, Ayarlar'dan değişir.
- **Bildirim türleri** (Ayarlar'dan her biri ayrı açılıp kapatılır, hepsi varsayılan açık):
  - **Günlük hatırlatma** (aşağıdaki koşullarla),
  - **Kırılma uyarısı:** yerel **22:00**'de, en az **3 halkalık**, bugün tamamlanmamış, dün korunmuş ve bu hafta
    **joker hakkı bitmiş** (yani atlanırsa gerçekten kırılacak) zincirler için, günde en fazla bir kez
    (`last_risk_reminded_on`),
  - **Arkadaşlık ve grup:** arkadaşlık isteği geldi, istek kabul edildi, ortak zincire davet edildin,
  - **Lig sonuçları:** haftalık terfi ve düşüş ("Ligde kaldın" için bildirim gönderilmez).
- Olay bildirimleri (arkadaşlık, davet, lig) bir **gelen kutusu** tablosuna (`notifications`) veritabanı
  tetikleyicileriyle yazılır; cron her 10 dakikada tabloyu boşaltıp push gönderir. Bu yüzden bu bildirimler
  **en fazla ~10 dakika gecikmeyle** gelir. Satırlar `claim_notifications()` ile alınırken "gönderildi" olarak
  işaretlenir (eşzamanlı çalıştırmalar aynı satırı iki kez almaz); süre bütçesi dolarsa işlenmeyenler
  `release_notifications()` ile geri bırakılır. 3 günden eski kayıtlar silinir.
- Günlük hatırlatma şu koşullarla gider: hatırlatmalar açık, yerel saat = hatırlatma saati,
  **bugünkü halkası eklenmemiş aktif zinciri var**, en az bir aboneliği var, **bugün henüz hatırlatılmamış**
  (`last_reminded_on`).
- Zamanlayıcı: Supabase `pg_cron` her **10 dakikada bir** `GET /api/cron/reminders` çağırır
  (`Authorization: Bearer <CRON_SECRET>`). Secret yoksa/yanlışsa **401**.
- Gönderim **25'erli paralel** gruplarla, bir çağrıda en fazla **500** kullanıcı (gelen kutusundan 100 satır),
  **7 sn** süre bütçesiyle; kalanlar sonraki çağrıda devam eder. Sıra: gelen kutusu, kırılma uyarısı,
  günlük hatırlatma.
- Geçersizleşen abonelikler (404/410) otomatik silinir.
- Aynı cihaz başka hesaba geçerse eski hesabın aboneliği silinir.
- **iPhone:** bildirim sadece uygulama **ana ekrana eklenmişse** çalışır (iOS 16.4+).
  Ana ekran uygulaması Safari'nin çerezlerini paylaşmaz, orada ayrıca giriş yapılır.

## 8. Veri modeli ve depolama

### 8.1 Tablolar
| Tablo | Amaç |
|---|---|
| `profiles` | Kullanıcı (kullanıcı adı eşsiz, saat dilimi, plan, görünürlük, bildirim ayarları, lig alanları) |
| `chains` | Zincirler ve sayaçları |
| `check_ins` | Günlük kayıtlar; PK `(chain_id, day)`, `is_joker` |
| `chain_history` | 60 günden eski günlerin aylık özeti (bit maskesi) |
| `friendships` | Arkadaşlık ve istekler |
| `chain_groups`, `chain_group_members` | Ortak zincir grupları ve üyelik/davet |
| `push_subscriptions` | Bildirim abonelikleri |
| `blocked_words` | Yasaklı kullanıcı adı kelimeleri (panelden düzenlenebilir) |
| `rate_limits` | Oran sınırlama sayaçları |
| `notifications` | Gönderilmeyi bekleyen olay bildirimleri (gelen kutusu) |
| `user_badges` | Kazanılan rozetler (`seen_at`: yeni rozet penceresi görüldü mü) |
| `reports` | Kullanıcı bildirimleri |
| `league_members`, `league_results`, `league_deleted_stats` | Lig üyelikleri, sonuçları ve silinen zincirlerin haftalık katkısı (bkz. bölüm 9) |

### 8.2 Depolama tasarrufu
- `check_ins` satırı küçük tutulur (`id`, `created_at`, metin `kind` yok; tek birincil anahtar indeksi).
- **60 günden eski günler** `chain_history`'ye taşınır: ayda zincir başına bir satır, ayın `d`.
  günü `(d - 1)`. bit (`done_mask`, `joker_mask`). Sıkıştırma cron'suz, **check-in sırasında** yapılır.
- Bu yüzden **sıralamalar sadece son 60 günü** kapsar; haftalık/aylık görünüm bunun içindedir.
- Isı haritası ileride bu maskelerden çizilecek.

## 9. Ligler

- **Ligler:** Bronz, Gümüş, Altın, Platin, Elmas (`league_tier` 1-5). Herkes Bronz'da başlar.
- **Hafta:** Pazartesi 00:00 UTC'de başlar. Günler yine kullanıcının **yerel** tarihidir.
- **Puan (0-100):** hafta boyunca **yapman gereken halkaların yüzde kaçını tamamladın**.
  Zincirin var olduğu günlerden başlar (haftanın ortasında açılan zincir için sadece o günden),
  bugüne (ya da hafta sonuna) kadar sayılır, arşiv günü sonrası sayılmaz, **joker günleri
  yapılması gerekenlerden düşülür**. Zincir sayısı avantaj sağlamaz. Hiç zincir günü yoksa puan
  yoktur (yarışmaz).
- **Gruplar:** aynı ligde en fazla **30 kişi**. Kullanıcı ligi ilk açtığında ilk boş gruba yerleşir,
  yoksa yeni grup açılır. Kullanıcı azken hepsi tek grupta olur.
- **Kapanış:** her **Pazartesi 12:00 UTC**'de (`settle_leagues`, `pg_cron`). Dünyada hiç kimsenin
  pazarı açık kalmaz. Önce üyelerin zincirleri işlenir, sonra puanlar hesaplanır.
- **Terfi/düşme:** puanı olan `n` kişiden **ilk `n/4` (en çok 5)** kişi ve puanı **>= 50** ise terfi;
  **son `n/4` (en çok 5)** kişi ve puanı **< 30** ise düşer. Beraberlikte tamamlanan halka sayısı belirler.
  Boşta kalan ya da zinciri olmayan etkilenmez.
- **Gizlilik (`league_visible`, varsayılan açık):** Kapalıysa yabancılara adı yerine "Gizli oyuncu"
  görünür; yarışmaya devam eder.
- Sonuçlar ~11 hafta saklanır.
- **Zincir silme hilesi kapalı:** Zincir silinmeden önce, kapanmamış lig haftalarındaki "yapılan / yapılması
  gereken" sayıları `league_deleted_stats`'e yazılır ve puana dahil edilir. Hafta kapanınca o satırlar silinir.
  Hesap silinirken tetikleyici atlanır (profil zaten gitmiştir).
- **Arayüz:** Ana sayfada küçük lig kartı (lig, sıra, yüzde, kalan süre) `/league` sayfasına gider. Orada kendi
  liginin ve grubunun sıralaması, terfi/düşme bölgeleri, "Lig nasıl çalışır?", son haftaların sonuçları ve
  "Ligde adım görünsün" anahtarı vardır. Diğer oyuncuların yanında bildirme bayrağı bulunur.
- **Sıralama önbelleği:** Grubun sıralaması `league_snapshots` tablosuna kaydedilir ve **en fazla 6 saatte bir**
  yeniden hesaplanır; o süre boyunca grubun herkesi aynı kaydı okur (eskiden her açılışta 30 kişinin puanı
  hesaplanıyordu). Yeni katılan biri kayıtta yoksa hemen yenilenir. Kullanıcı adı ve gizlilik (`league_visible`)
  okuma anında uygulanır, yani gizlilik değişikliği hemen yansır. Süre `league_standings()` içinde tek satırdır.
  Bu yüzden kendi puanın birkaç saat gecikmeli görünebilir; haftalık kapanışta herkesin zinciri önce işlenir,
  nihai sonuç her zaman doğrudur.
- Lig tablolarına istemci erişimi yoktur; her şey `league_standings()` ve `my_league_history()` RPC'leriyle.

## 10. Rozetler ve paylaşım kartı

### Rozetler (13)
| Grup | Rozet | Koşul |
|---|---|---|
| Seri | `streak_7`, `streak_30`, `streak_100`, `streak_365` | Bir zincirin **en uzun serisi** (`best_length`) en az 7 / 30 / 100 / 365 |
| Toplam | `total_100`, `total_500`, `total_1000` | Ömür boyu tamamlanan halka (`profiles.total_completed`) |
| Özel | `first_link` | En az 1 halka |
| Özel | `comeback` | Bir zincir kırıldı (`break_count >= 1`) ve yeniden en az 7 uzunluğa ulaştı |
| Sosyal | `first_friend` | En az bir kabul edilmiş arkadaş |
| Sosyal | `first_group` | En az **iki** üyesi olan bir ortak zincire üye |
| Lig | `first_promotion` | Herhangi bir hafta terfi (`promoted`) sonucu |
| Lig | `perfect_week` | Herhangi bir lig haftasında %100 puan |

- **Tembel hesaplama:** Kullanıcı uygulamayı açtığında (`my_badges()`) kurallar kontrol edilir (**en fazla
  30 dakikada bir**; `check_in()` zamanlayıcıyı sıfırladığı için halka ekleyince yeni rozet hemen görünür), sağlananlar
  `user_badges`'e **bir kez** yazılır. Sonradan zincir silinse ya da arkadaşlık bitse bile rozet kalır.
  Rozet için ayrı push bildirimi yoktur.
- **"Yeni rozet" penceresi:** Ana sayfada `seen_at` boş olan rozetler gösterilir; pencere kapanınca
  `mark_badges_seen()` ile işaretlenir. İlk açılışta eski kullanıcılar kazanmış olduklarını toplu görür.
- `/badges` sayfası kazanılanları renkli, kilitlileri soluk gösterir; seri ve toplam rozetlerde ilerleme çubuğu vardır.
- Rozet kataloğu (ad, açıklama, grup, hedef) kodda `lib/badges.ts`'tedir; **yeni rozet eklemek** için hem bu liste hem
  `sync_badges()` ve `user_badges.badge` kontrol kısıtı (yeni migration) güncellenir.

### Paylaşım kartı
- Zincir kartında ve kazanılmış her rozette paylaş simgesi vardır. Pencerede **önizleme** ve iki anahtar bulunur:
  "Zincirin adı görünsün" (varsayılan açık, sadece zincir kartında) ve **"Kullanıcı adım görünsün" (varsayılan kapalı)**.
  Kullanıcı seçmeden kişisel bilgi kartta çıkmaz.
- Telefonda **Paylaş** Web Share API ile paylaşım menüsünü açar; desteklenmiyorsa PNG indirilir. **Kaydet** her zaman indirir.
- `GET /api/share` (Next `ImageResponse`/satori, 1080×1350 PNG): `type=chain&id=...&title=0|1&user=0|1` ya da
  `type=badge&key=...&user=0|1`. **Giriş şart; sadece kendi zincirin ve kendi kazandığın rozet** (RPC
  `share_chain_data` / `share_badge_data` sahiplik kontrolü yapar). **Saatte en fazla 60** kart (oran sınırı),
  yanıt `Cache-Control: private, no-store`.
- Kartta büyük halka sayısı, "kırılmadan devam ediyor" (quit zincirinde "temiz devam ediyor"), en uzun seri ve toplam
  halka yazar. "Gün" yerine "halka" denir çünkü joker günleri halka eklemeden zinciri korur.
- Satori kısıtları: sadece flexbox, SVG içinde `<text>` desteklenmez (sayılar ayrı yazı olarak bindirilir),
  bileşen yerine düz JSX döndüren fonksiyonlar kullanılır (`lib/share-cards.tsx`).

## 11. Güvenlik modeli

- **Tüm tablolarda RLS açık.** Sayaçlar ve kurallar istemciden **yazılamaz**: sütun bazlı yetkiler
  ve `SECURITY DEFINER` RPC'ler (`search_path = ''`) üzerinden çalışır.
- Kullanıcı sadece kendi zincirini okur/yazar. Başkasının zincirini ancak arkadaşsa **ve** `visibility = 'friends'` ise okur.
- **İstemcinin güncelleyebildiği profil sütunları:** `username`, `display_name`, `avatar_url`, `timezone`,
  `discoverable`, `reminders_enabled`, `reminder_hour` (+ lig için `league_visible`). `plan` ve sayaçlar yok.
- Oturum: sayfa okumalarında `getClaims` (JWT yerelde doğrulanır), veri yazan işlemlerde `getUser`.
  `proxy.ts` sadece **iyimser** yönlendirmedir; asıl doğrulama sunucuda.
- **Kullanıcı adı:** 3-20 karakter, küçük harf/rakam/`_`, eşsiz. Ayrıca **yasaklı kelime** kontrolünden geçer
  (veritabanı tetikleyicisi, sadece ad değiştiğinde çalışır): ad küçük harfe çevrilir, Türkçe karakterler ve
  yaygın rakam ikameleri (`0→o`, `1→i`, `3→e`, `4→a`, `5→s`, `7→t`, `8→b`, `@→a`, `$→s`) sadeleştirilir,
  alt çizgi ve rakamlar atılır; sonra `blocked_words`'e göre taklit (`admin`, `thechain`...) ve küfür
  kelimeleri aranır. Liste kısa ve net kelimelerden oluşur (yanlış eşleşmeyi önlemek için);
  `blocked_words` tablosuna satır ekleyerek (migration gerekmez) genişletilir. `mode`: `contains` ya da `exact`.
- **Service role anahtarı** sadece iki yerde kullanılır: cron rotası ve hesap silme. İstemciye gitmez.
- Hesap silme: kullanıcı adını yazarak onaylanır; `auth.users` silinince tüm veri `ON DELETE CASCADE` ile gider.
- Cron rotası `CRON_SECRET` ile korunur (sabit zamanlı karşılaştırma). `sw.js`, manifest ve `api/cron`
  proxy'den muaftır.

## 12. Mimari ve işletim

### Yığın
Next.js 16 (App Router, `proxy.ts`, Cache Components), React 19, TypeScript, Tailwind v4, shadcn/ui
(Base UI), Supabase (Auth, Postgres, RLS, RPC, `pg_cron`/`pg_net`), Vercel (Hobby), Web Push (`web-push`).
**İş mantığı Supabase'tedir** (RPC/SQL); bu sayede React Native uygulaması aynı backend'i kullanır.
Next.js Server Actions sadece web içindir.

### Testler ve CI
Komutlar: `pnpm typecheck` · `pnpm lint` · `pnpm test` (birim) · `pnpm test:db` (veritabanı) · `pnpm build`.

- **Birim testler** (`tests/unit/`, Vitest, 41 test): tarih yardımcıları, spiral yerleşimi (sığma ve ortalama), form doğrulamaları,
  lig yardımcıları, bildirim metinleri. **Kayma bekçileri** kod ile SQL'in ayrışmasını yakalar: rozet listesi
  (`lib/badges.ts` ↔ `user_badges` kısıtı ve `sync_badges`), plan limitleri (`PLAN_LIMITS` ↔ `plan_chain_limit()`), tur hedefleri
  (`steps.ts` ↔ bileşenlerdeki `data-tour`). Yeni rozet, plan ya da tur adımı eklerken bu testler hangi dosyaların birlikte
  güncellenmesi gerektiğini söyler.
- **Veritabanı testleri** (`supabase/tests/*.test.sql`, 8 dosya): `01` koruma kuralları · `02` zincirin çekirdek kuralları (halka,
  joker, kırılma, nüks, plan limiti, sıkıştırma) · `03` arkadaşlık · `04` **RLS** (`authenticated` rolüne geçip yetkisiz okuma/yazmayı
  dener) · `05` ortak zincirler · `06` ligler · `07` rozetler ve bildirimler · `08` tur ve PWA kaydı.
  - Her dosya tek bir `DO` bloğudur: sahte kullanıcılar (`@test.invalid`) oluşturur, kuralları doğrular, bir doğrulama tutmazsa
    `FAIL: ...` verir ve sonunda **`TEST_PASSED` hatasıyla kendini geri alır** (veritabanında iz kalmaz). `scripts/db-test.mjs`
    sonucu okur ve ayrıca sahte kullanıcı kalmadığını (temizlik) denetler.
  - `pnpm test:db` bağlı (linked) projede, `pnpm test:db -- --local` yerel Supabase'te, `-- --only=chains` tek dosya çalıştırır.
  - **Yeni test yazarken:** kullanıcı adlarına dosyaya özgü önek ver, e-postası `@test.invalid` olsun; haftanın gününe bağlı olma
    (lig puanını `league_score(..., hafta_sonu)` ile hesapla, kırılmada `weekly_jokers = 0` kullan); gerçek kullanıcı verisine bağlı olma
    (sadece sahte kullanıcı kimlikleriyle karşılaştır, lig grubunda gerçek üyeler olabilir); RLS için `set local role authenticated`.
  - **Uyarı:** `pnpm test:db` canlı projeye bağlanır. Her şey geri alınır ama ileride ayrı bir test/staging projesi daha güvenlidir.
- **CI** (`.github/workflows/ci.yml`): `checks` işi (tip, lint, birim test, build; gizli anahtar gerekmez) ve `db-tests` işi
  (yerel Supabase'e migration'ları uygulayıp `pnpm test:db -- --local`). `db-tests` henüz bir GitHub çalıştırmasında doğrulanmadı,
  bu yüzden `continue-on-error` açık; güvenilir olunca kaldırılıp GitHub'da branch koruma ile zorunlu yapılmalı (Settings → Branches →
  "Require status checks": `checks`). Dependabot haftalık bağımlılık PR'ı açar.

### Performans notları
- **Bölge:** Supabase projesi `eu-west-1` (İrlanda). Vercel fonksiyon bölgesi **Dublin (`dub1`)** olmalı
  (Settings → Functions → Function Region); farklı bölge her veritabanı isteğine onlarca ms ekler.
- **Tarayıcı önbelleği:** `experimental.staleTimes.dynamic = 60` sn. Bir sayfaya 60 sn içinde tekrar girmek sunucuya
  gitmez. Sunucu işlemleri (`revalidatePath`) tüm tarayıcı önbelleğini anında temizler; çıkış (`signOut`) ve
  `markBadgesSeen` de bunu çağırır. **Yeni bir yazma eylemi eklerken mutlaka `revalidatePath` çağır**, yoksa ekran
  60 sn bayat kalabilir.
- **İskelet ekranlar:** `components/skeletons.tsx` (ana sayfa ve liste iskeleti), her sayfanın `Suspense` yedeğidir.
- **Veritabanı seyreltme:** lig sıralaması grup başına 6 saatte bir, rozet kontrolü 30 dakikada bir hesaplanır.
  Kullanıcıya özel veri sunucuda ortak önbelleğe konmaz (güvenlik); ortak veri (lig) veritabanında paylaşılır.

### Tanıtım turu ve uygulama yükleme
- **Tanıtım turu** (`components/tour/`): Ekran bulanıklaşır, hedef öğe delik açılıp net bırakılır ve beyaz halkayla
  çevrilir; yanında mascot **Halka** konuşur (İleri/Geri/Atla, ilerleme noktaları, Esc ile kapanır, odak kutu içinde
  kalır, "hareketi azalt" saygı görür). Kütüphane yok; hedefler `data-tour="..."` özniteliğiyle işaretlenir
  (`create-chain`, `summary`, `league`, `badges`, `friends`, `nav`, `chain-card`, `checkin`, `joker`, `share`, `menu`).
  **Sayfada hedefi olmayan adım otomatik atlanır** (örn. zinciri yokken "lig" adımı).
- **Aşamalar** (`profiles.tour_stage`): 0 görülmedi, 1 genel tur bitti (zincir turu bekliyor), 2 tamamlandı/atlandı.
  Zinciri olmayan yeni kullanıcı genel turu görür, son adımda "İlk zincirimi oluştur"a yönlenir; ilk zincirden sonra
  **zincir turu** (Bugünü tamamla, joker, paylaş, menü, hatırlatma ipucu) açılır. Zinciri olan mevcut kullanıcı ikisini
  birlikte görür. **Atla** her yerde turu kalıcı kapatır (aşama 2). Başka bir pencere (yeni rozet) açıkken tur başlamaz.
  İlerleme sadece ilerler (`set_tour_stage`); Ayarlar'daki "Tanıtım turunu tekrar göster" `reset_tour()` ile sıfırlar.
  Ayarlar `revalidatePath("/")` çağırır, yoksa tarayıcı önbelleğindeki ana sayfa turu tekrar açardı.
- **Uygulamayı yükleme (PWA)** (`components/pwa/`, `lib/pwa-store.ts`): Yüklü uygulama olarak (standalone) açıldıysa hiçbir
  şey gösterilmez ve `profiles.pwa_installed_at` bir kez kaydedilir (yükleme ölçümü). Yüklenmemişse ve kullanıcı turu
  bitirip **ilk halkasını eklemişse** ana sayfada kapatılabilir şerit çıkar: Android/Chrome'da tarayıcının yükleme
  isteği (`beforeinstallprompt`) varsa "Yükle", iPhone/iPad'de "Nasıl?" (Paylaş → Ana Ekrana Ekle rehberi). Kapatılırsa
  **7 gün** gizlenir (localStorage). Ayarlar'da kalıcı "Ana ekrana ekle" satırı vardır. Kayıt sırasında popup
  gösterilmez (kullanıcı henüz değeri görmedi); iPhone'da bildirimler sadece yüklü uygulamada çalıştığı için asıl neden
  hatırlatmalardır. "Yüklendi mi?" kesin sadece standalone açılışta bilinir; tarayıcı sekmesinden başka yerde
  yüklendiği anlaşılamaz.

### Arayüz notları
- **Yazı tipi:** Geist (`latin` + `latin-ext`, Türkçe karakterler için). `globals.css`'te `--font-sans`
  `var(--font-geist-sans)`'e bağlıdır; kendine bağlı bırakılırsa tarayıcı serif'e düşer.
- **Gece gökyüzü arka planı** (`components/sky-background.tsx`, stiller `globals.css`): yavaş kayan 3 renkli hale ve
  seyrek yanıp sönen 2 yıldız katmanı. Sadece CSS, sadece `transform`/`opacity` animasyonu, JS yok; hareket
  azaltma ayarında durur. Hale renkleri `--halo-1..3` değişkenleriyle gelir; ana sayfa bunları kullanıcının zincir
  renklerine boyar (`components/sky-tint.tsx`).
- **Ana sayfa:** selamlama, "Bugün x/y tamam" halka özeti, lig ve rozet kutucukları, zincir kartları.
  **Haftalık şerit:** Pzt-Paz yedi daire; o gün var olan tüm zincirler tamamsa dolu, bir kısmı tamamsa yarım.
  **Arkadaşların kartı:** bugünkü durum avatarları + bu haftaki sıralamanın ilk 3'ü ve senin yerin.
  **Zincir kartı:** zincirin renginde ışıma, Seri / En uzun / Toplam istatistikleri, büyük tamamla düğmesi, belirgin
  Paylaş düğmesi, arşiv/sil/nüks için "⋯" menüsü.

### Önemli dizinler
```
app/            sayfalar ve server action'lar (chains, friends, groups, settings, archive, api/cron)
components/     arayüz (chain-card, chain-visual spiral SVG, group-*, notification-settings ...)
lib/            auth, chains (sabitler/yardımcılar), friends, push, supabase/{client,server,proxy,admin}
supabase/migrations/   tüm şema değişiklikleri (sırayla)
types/database.ts      `pnpm db:types` ile üretilir
docs/           ROADMAP, SYSTEM (bu belge), NOTIFICATIONS
public/         sw.js, ikonlar
```

### Migration sırası
1. `init_schema` - profiller, zincirler, check_ins, friendships, RPC'ler
2. `plans_limits_and_storage` - planlar, limitler, depolama tasarrufu, `settle_my_chains`
3. `friends` - profil gizliliği, `search_users`, `send_friend_request`
4. `friends_privacy` - `discoverable`
5. `shared_chains` - gruplar
6. `group_pending_invites` - bekleyen davetler
7. `notifications` - abonelikler, hatırlatma ayarları, `users_to_remind`
8. `polish` - arşivden geri alma limiti, davet iptali
9. `abuse_guards` - saat dilimi sınırı, yasaklı kelimeler, oran sınırı, bildirme
10. `leagues` - ligler
11. `more_notifications` - gelen kutusu, kırılma uyarısı, sosyal ve lig bildirimleri
12. `badges_and_sharing` - rozetler ve paylaşım kartı verisi
13. `home_social` - bugünkü durum gizlilik ayarı, arkadaşlar bugün, ortak zincir özeti
14. `perf_throttling` - lig sıralama kaydı, rozet kontrolünü seyreltme
15. `onboarding_pwa` - tanıtım turu aşaması, PWA yükleme ölçümü

### Komutlar
`pnpm dev` · `pnpm build` · `pnpm lint` · `pnpm db:push` (migration uygula) · `pnpm db:types` (tipleri yenile)

### Ortam değişkenleri
| Değişken | Not |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | istemciye açık |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | istemciye açık |
| `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | gizli / iletişim adresi |
| `CRON_SECRET` | gizli; Supabase Vault'taki ile aynı olmalı |
| `SUPABASE_SERVICE_ROLE_KEY` | gizli, RLS'i aşar |

### Yayın
- Vercel (Hobby): `https://next-the-chain.vercel.app`, `main` branch'inden otomatik dağıtılır.
- Supabase Auth → URL Configuration'da Site URL ve `/auth/callback` yönlendirmesi tanımlı olmalı;
  Google'da Authorized JavaScript origins'e site adresi eklenir.
- Zamanlayıcı: `chain-reminders` (10 dk, elle kuruldu) ve `league-weekly` (Pazartesi 12:00 UTC,
  lig migration'ı kurdu) `pg_cron` işleri. `select jobname, schedule, active from cron.job;` ile bakılır.

### Çalışma düzeni
Her özellik için ayrı branch (`feat/...`); `main`'e doğrudan değişiklik yapılmaz. Migration'lar
uygulanmadan önce `pnpm supabase db push --linked --dry-run` ile kontrol edilir.

## 13. Sabitler (hızlı bakış)

| Ne | Değer |
|---|---|
| Haftalık joker | 2 (zincir başına, Pazartesi yenilenir) |
| Aktif zincir limiti | free 2 · pro 5 · max 10 |
| Toplam zincir satırı | 50 |
| Grup kişi sınırı / kullanıcı başına grup | 20 / 10 |
| Arkadaş / bekleyen istek | 100 / 30 |
| Arama sonucu | en fazla 10, en az 2 karakter |
| Bildirim cihazı | kullanıcı başına 5 |
| Hatırlatma saati | varsayılan 20:00 (yerel) |
| Saat dilimi değişikliği | 24 saatte bir |
| Arama / arkadaşlık isteği oran sınırı | 30/dk · 20/saat |
| Bildirme | günde 20 |
| Rozet sayısı | 13 |
| Paylaşım kartı | saatte 60, 1080×1350 PNG |
| Lig sıralaması yenileme | en fazla 6 saatte bir |
| Rozet kontrolü | en fazla 30 dakikada bir |
| Tarayıcı sayfa önbelleği | 60 sn |
| PWA şeridi gizleme | 7 gün |
| Kırılma uyarısı saati | 22:00 yerel, en az 3 halkalık zincir |
| Cron sıklığı | 10 dk (hatırlatma), Pazartesi 12:00 UTC (lig) |
| Veri sıkıştırma eşiği | 60 gün |
| Lig grup boyu | 30 |
| Terfi / düşme | ilk/son `n/4` (en çok 5), puan >= 50 / < 30 |

## 14. Bilinen eksikler ve fikirler

- Ödeme / plan yükseltme yok (`plan` şimdilik elle değişir).
- Apple ile giriş yok (iOS mağaza yayını öncesi gerekli).
- Gizlilik politikası ve kullanım şartları sayfaları yok (Google OAuth yayını ve mağazalar için gerekli).
- Google OAuth ekranı "Testing" modundaysa sadece test kullanıcıları giriş yapabilir.
- Zincir görünürlüğü (`friends`) için arayüz yok.
- Grup üyesi atma yok.
- Bildirimler için moderasyon paneli yok; `reports` tablosu Supabase panelinden okunur ve işlem elle yapılır.
- Yasaklı kelime listesi kısa; Türkçe ve İngilizce için yeni kelimeler `blocked_words`'e eklenmeli.
- "Beyana dayalı check-in" (hile) tamamen çözülemez; şimdilik ödül yok, kanıt/onay özelliği yok.
- Isı haritası ve haftalık özet yok.
- Rozet kazanınca push bildirimi yok, sadece uygulamada gösterilir.
- Paylaşım kartı yalnızca zincir ve rozet için var; lig sonucu ya da haftalık özet kartı yok.
- Profil sayfası yok (kullanıcı adı ve saat dilimi Ayarlar'da).
- React Native (Expo) uygulaması: monorepo'ya geçiş ve `packages/core` çıkarımı yapılmadı.
- Vercel Hobby ticari kullanıma izin vermez; gerçek kullanıcılara açmadan önce Pro gerekir.
  Supabase Free bir hafta hareketsizlikte projeyi duraklatır.
