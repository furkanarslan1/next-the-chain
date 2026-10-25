# The Chain — Kararlar ve Yol Haritası

> Sistemin güncel kuralları, sınırları ve veri modeli için bkz. [`SYSTEM.md`](./SYSTEM.md).

## Ürün fikri

İstikrar uygulaması ("zinciri kırma" yöntemi). Kullanıcı konulara göre zincirler açar
(kitap okumak, sigarayı bırakmak, abur cuburu bırakmak...).

- Her zincirde **tek bir aktif halka** yanıp söner. O günün içinde tamamlanırsa zincire bağlanır, sıradaki halka belirir.
- Zincir büyüdükçe **yuvarlak/spiral** dizilir (az yer kaplasın diye).
- Her konunun zinciri **farklı renkte**.
- Halka tamamlanınca ekranda **+1 zincir** animasyonu çıkar.
- Mobile-first (kullanımın ~%99'u mobil). Önce web (PWA), sonra React Native (Expo).

## Verilen kararlar

| Konu | Karar |
|---|---|
| Joker kuralı | **Haftalık sabit hak: haftada 2 gün** atlanabilir. Aylık ayrı limit yok. |
| Kırılma cezası | Zincir kırılınca **sadece aktif zincir** sıfırlanır. Toplam/ömür boyu sayı düşmez. |
| Sıralama | Genel (all-time) sıralama **yok**. **Haftalık/aylık ligler** ve **arkadaş sıralaması**. |
| Sosyal | Kullanıcılar arkadaşlarıyla **ortak zincir** oluşturabilir; arkadaşlar arasında sıralama olur. |
| Saat dilimi | "Gün" kullanıcının saat dilimine göre, sunucu tarafında hesaplanır. |
| Ortak zincir | Zinciri açan kişi oluştururken arkadaşlarını ekler. Üyelerden biri/birkaçı o günü tamamlayamazsa **sıralamada geriye düşer** veya **"başaramayanlar"** olarak görünür. Ortak zincir tamamen kaybettirmez, kişisel ilerleme ayrı tutulur (detay Faz 2'de netleşecek). |
| Planlar | Aktif zincir limiti: **free 2, pro 5, max 10** (`profiles.plan`; istemci değiştiremez, ödeme entegrasyonu Faz 3). Arşivlenenler sayılmaz, ama kullanıcı başına toplam en fazla 50 zincir satırı. |
| Depolama | `check_ins` küçük satır (PK `(chain_id, day)`), 60 günden eski günler `chain_history`'de aylık bit maskesi olarak tutulur (check-in sırasında tembel sıkıştırma). Sıralama son 60 günü kapsar. |
| Kırılma hesabı | Cron yok; kullanıcı uygulamayı açınca/check-in yapınca **lazy** hesaplanır. |

## Teknoloji

- **Next.js 16** (App Router, `proxy.ts`, Cache Components), **React 19**, **TypeScript**
- **Tailwind CSS v4**, **shadcn/ui**, **react-icons**
- **Supabase** (Auth, Postgres, RLS, RPC/Edge Functions). **Prisma kullanılmıyor**; tipler `supabase gen types` ile.
- **zod** (doğrulama), **motion** (web animasyonu)
- Animasyon: yanıp sönme CSS ile, halka dizilimi SVG (gerekirse Skia), +1 için Lottie/Motion. **Three.js kullanılmıyor** (ağır, RN'e uygun değil).
- Paket yöneticisi: pnpm

## Mimari ilkeleri

1. **İş mantığı Supabase'de** (Postgres fonksiyonları/RPC): check-in, joker kullanımı, zincir kırma. Web ve RN aynı backend'i çağırır. Next.js Server Actions RN ile paylaşılamaz, bu yüzden kural orada yaşamaz.
2. **Güvenlik RLS ile**; istemci anahtarı sadece publishable key.
3. Sıralama için kullanıcı/zincir satırlarında **sayaç alanları** (denormalize), indeks ve kısa süreli önbellek. Her istekte hesaplama yok.
4. İleride **monorepo** (Turborepo): `packages/core` (tipler, zod şemaları, zincir yardımcıları) web ve Expo tarafından paylaşılır.
5. RN'de shadcn ve react-icons çalışmaz; orada NativeWind + `lucide-react-native`.

## Yol haritası

### Faz 0 — Kurulum (bu branch: `chore/project-setup`)
- [x] Next.js, Tailwind, shadcn, react-icons, zod, motion
- [x] Supabase istemcileri (`lib/supabase/*`) ve oturum yenileyen `proxy.ts`
- [ ] `.env.local` içine Supabase anahtarlarını ekle (`.env.example`'a bak)
- [x] Supabase CLI + migration klasörü, `gen types` script'i (`pnpm db:push`, `pnpm db:types`)
- [x] İlk şema (`profiles`, `chains`, `check_ins`, `friendships`, RPC'ler) uygulandı
- [ ] Temel klasör yapısı, tema, mobile-first layout

### Faz 1 — Çekirdek (MVP)
- [x] Auth: Google ile giriş, zorunlu ve eşsiz kullanıcı adı (onboarding). Apple ile giriş mağaza öncesi eklenecek.
- Veri modeli: `profiles`, `chains`, `check_ins`, haftalık joker takibi
- [x] Zincir oluşturma (konu, renk, tür: yap / bırak)
- [x] Günlük check-in RPC'si: joker, kırılma ve saat dilimi mantığı
- [x] Zincir görselleştirme (spiral SVG, yanıp sönen aktif halka)
- [x] +1 animasyonu
- [ ] Profil sayfası, joker göstergesi, zincir arşivleme/silme, zincir sayısı limiti

### Faz 2 — Sosyal
- [x] Arkadaş arama (kullanıcı adı), istek gönderme/kabul/reddet, arkadaş listesi
- [ ] Davet linki
- [x] Ortak zincirler (her üyenin kendi zinciri, grup sıralaması, "başaramayanlar")
- [ ] Gruba sonradan davet, üye çıkarma
- [x] Arkadaş sıralaması (haftalık/aylık)
- [x] Ligler (haftalık, terfi/düşme)
- Hatırlatma bildirimleri (Web Push / PWA)

### Faz 3 — Cila ve büyüme
- PWA (ekrana ekle, offline kabuğu)
- Kilometre taşı rozetleri (7/30/100 gün), paylaşılabilir zincir kartı
- Isı haritası, haftalık özet
- Performans ve maliyet gözden geçirme (Supabase Pro / barındırma planı)

### Faz 4 — React Native (Expo)
- Monorepo'ya geçiş, `packages/core` çıkarma
- Expo + NativeWind, Skia/Reanimated ile zincir
- Push bildirimleri, ana ekran widget'ı
- Mağaza yayını (Apple $99/yıl, Google $25 tek sefer)

## Açık sorular

- Bırakma zincirlerinde "nüks oldu" akışının tam davranışı
- Ortak zincirde bir kişi tamamlayamazsa: sadece o kişi mi "başaramayan" olur, ortak sayaç herkes için mi düşer? (Karar yönü: kişi bazlı geriye düşme/başaramayanlar listesi)
- Lig yapısı (kaç kişilik gruplar, terfi/düşme)
- Fotoğraf kanıtı olacak mı
