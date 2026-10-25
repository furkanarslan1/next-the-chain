"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  removePushSubscription,
  savePushSubscription,
  sendTestNotification,
  updateReminder,
} from "@/app/settings/actions";

type Status =
  | "loading"
  | "unsupported"
  | "needs-install"
  | "denied"
  | "off"
  | "on";

type Props = { enabled: boolean; hour: number };

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function NotificationSettings({ enabled, hour }: Props) {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<{ ok: boolean; text: string }>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    async function detect() {
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches;
      const supported = "serviceWorker" in navigator && "PushManager" in window;

      let next: Status;
      if (!supported) {
        // iOS'ta push sadece ana ekrana eklenmiş uygulamada çalışır.
        next = isIOS && !standalone ? "needs-install" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        const sub = await registration.pushManager.getSubscription();
        next = sub ? "on" : "off";
      }
      if (!cancelled) setStatus(next);
    }
    void detect();
    return () => {
      cancelled = true;
    };
  }, []);

  function turnOn() {
    setMessage(undefined);
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
        ),
      });
      const result = await savePushSubscription(sub.toJSON());
      if (!result.ok) {
        await sub.unsubscribe();
        return setMessage({ ok: false, text: result.error });
      }
      setStatus("on");
    });
  }

  function turnOff() {
    setMessage(undefined);
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    });
  }

  function changeHour(next: number) {
    startTransition(async () => {
      const result = await updateReminder(enabled, next);
      if (!result.ok) setMessage({ ok: false, text: result.error });
    });
  }

  function test() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await sendTestNotification();
      setMessage(
        result.ok
          ? { ok: true, text: "Deneme bildirimi gönderildi." }
          : { ok: false, text: result.error },
      );
    });
  }

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Hatırlatmalar</h2>
      <div className="space-y-4 rounded-xl border p-4">
        {status === "loading" && (
          <p className="text-sm text-muted-foreground">Kontrol ediliyor…</p>
        )}

        {status === "unsupported" && (
          <p className="text-sm text-muted-foreground">
            Bu tarayıcı bildirimleri desteklemiyor.
          </p>
        )}

        {status === "needs-install" && (
          <p className="text-sm text-muted-foreground">
            iPhone&apos;da bildirim için önce uygulamayı ana ekrana eklemelisin:
            Safari&apos;de paylaş düğmesine dokun, sonra &quot;Ana Ekrana
            Ekle&quot;yi seç. Ardından uygulamayı oradan aç.
          </p>
        )}

        {status === "denied" && (
          <p className="text-sm text-muted-foreground">
            Bildirim izni engellenmiş. Tarayıcı ya da telefon ayarlarından bu
            site için bildirimlere izin ver, sonra sayfayı yenile.
          </p>
        )}

        {status === "off" && (
          <>
            <p className="text-sm text-muted-foreground">
              Bugünkü halkanı eklemediysen akşam bir hatırlatma al.
            </p>
            <Button disabled={pending} onClick={turnOn}>
              Bildirimleri aç
            </Button>
          </>
        )}

        {status === "on" && (
          <>
            <div className="flex items-center justify-between gap-4">
              <label htmlFor="reminder-hour" className="text-sm">
                Hatırlatma saati
              </label>
              <select
                id="reminder-hour"
                defaultValue={hour}
                disabled={pending}
                onChange={(e) => changeHour(Number(e.target.value))}
                className="h-10 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, "0")}:00
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              Saat, cihazının saat dilimine göre. O gün tüm halkaların
              tamamsa bildirim gelmez.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" disabled={pending} onClick={test}>
                Deneme gönder
              </Button>
              <Button variant="ghost" disabled={pending} onClick={turnOff}>
                Bu cihazda kapat
              </Button>
            </div>
          </>
        )}

        {message && (
          <p
            role={message.ok ? "status" : "alert"}
            className={`text-sm ${message.ok ? "text-emerald-400" : "text-red-500"}`}
          >
            {message.text}
          </p>
        )}
      </div>
    </section>
  );
}
