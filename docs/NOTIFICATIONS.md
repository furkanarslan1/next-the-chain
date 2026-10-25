# Hatırlatma bildirimleri (Web Push)

Kullanıcı, yerel saatiyle seçtiği saatte (varsayılan 20:00) o gün tamamlanmamış
aktif zinciri varsa bildirim alır. Zamanlayıcı saatlik olarak
`GET /api/cron/reminders` adresini çağırır.

## Bildirim türleri
Günlük hatırlatma, kırılma uyarısı (yerel 22:00, joker hakkı kalmamış zincirler), arkadaşlık/grup ve lig sonuçları.
Her tür Ayarlar'dan ayrı kapatılır. Olay bildirimleri gelen kutusundan (`notifications` tablosu) her 10 dakikada
bir gönderilir; kuralların tamamı için bkz. `SYSTEM.md` bölüm 7.

## 1. Anahtarları üret (bir kez)

```
pnpm exec web-push generate-vapid-keys
```

Çıkan iki değeri `.env.local` dosyasına (ve barındırma ortamına) ekle:

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public key (tarayıcıya verilir) |
| `VAPID_PRIVATE_KEY` | Private key (**gizli**) |
| `VAPID_SUBJECT` | `mailto:senin@epostan.com` |
| `CRON_SECRET` | Rastgele uzun bir değer, ör. `openssl rand -hex 32` (**gizli**) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role (**gizli**, RLS'i aşar, asla istemciye gitmez) |

## 2. Yerelde dene

1. `pnpm dev`, giriş yap, Ayarlar → "Bildirimleri aç".
2. "Deneme gönder" ile cihaza bildirim gelir.
3. Cron uç noktasını elle çağır (saat uyuşmuyorsa `users: 0` döner):

```
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/reminders
```

Not: iPhone'da bildirim sadece uygulama ana ekrana eklenmişse çalışır
(iOS 16.4+). Yerelde `localhost` ile test için Chrome/Firefox kullan.

## 3. Zamanlayıcı (yayında)

Uç nokta **10 dakikada bir** çağrılmalı. Her çalıştırma süre bütçesini (7 sn) aşmadan
durur; işlenmeyenler aynı saat içindeki sonraki çağrıda devam eder. Bu yüzden
saatte bir değil, sık çağırmak gerekir.

Vercel Hobby planda cron günde bir kezle sınırlı olduğu için **Supabase `pg_cron`**
(ücretsiz) kullanıyoruz. Alan adı belli olunca SQL Editor'de bir kez çalıştır:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Secret'ı SQL'e düz yazmamak için Vault'a koy.
select vault.create_secret('CRON_SECRET_DEĞERİ', 'cron_secret');

select cron.schedule(
  'chain-reminders',
  '*/10 * * * *',
  $$
  select net.http_get(
    url := 'https://SENIN-ALAN-ADIN/api/cron/reminders',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    timeout_milliseconds := 10000
  );
  $$
);
```

Alternatif: GitHub Actions (`schedule: cron: "*/10 * * * *"`), ücretsiz ama birkaç
dakika gecikebilir. Pro plana geçilince Vercel Cron da kullanılabilir.

Uç nokta, secret yoksa ya da yanlışsa 401 döner.

## Notlar

- Aynı gün ikinci hatırlatma gitmez (`profiles.last_reminded_on`).
- Geçersizleşen abonelikler (404/410) otomatik silinir.
- Gönderim 25'erli paralel gruplarla yapılır, bir çağrıda en fazla 500 kullanıcı alınır.
  Kullanıcı sayısı on binlere çıkarsa bir kuyruğa (ör. Supabase Queues) taşımak gerekir.
