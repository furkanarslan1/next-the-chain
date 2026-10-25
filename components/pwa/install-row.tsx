"use client";

import { useState, useSyncExternalStore } from "react";
import { LuCheck } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { IosInstallDialog } from "@/components/pwa/ios-install-dialog";
import { getServerSnapshot, getSnapshot, promptInstall, subscribe } from "@/lib/pwa-store";

// Ayarlar'daki kalıcı "Uygulamayı yükle" satırı (şerit kapatılsa da buradan yüklenir).
export function InstallRow() {
  const pwa = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [iosOpen, setIosOpen] = useState(false);

  return (
    <section className="space-y-3">
      <h2 className="font-medium">Uygulama</h2>
      <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">Ana ekrana ekle</p>
          <p className="text-xs text-muted-foreground">
            {pwa.standalone
              ? "Uygulamayı ana ekrandan kullanıyorsun."
              : "Tek dokunuşla aç; iPhone'da bildirimler için gerekli."}
          </p>
        </div>
        {pwa.standalone ? (
          <span className="inline-flex items-center gap-1.5 text-sm text-emerald-400">
            <LuCheck className="size-4" aria-hidden />
            Yüklü
          </span>
        ) : pwa.canPrompt ? (
          <Button size="sm" onClick={() => void promptInstall()}>
            Yükle
          </Button>
        ) : pwa.ios ? (
          <Button size="sm" onClick={() => setIosOpen(true)}>
            Nasıl?
          </Button>
        ) : null}
      </div>
      {!pwa.standalone && !pwa.canPrompt && !pwa.ios && (
        <p className="text-xs text-muted-foreground">
          Tarayıcı menüsünden &quot;Uygulamayı yükle&quot; ya da &quot;Ana ekrana ekle&quot; seçeneğini kullan.
        </p>
      )}
      <IosInstallDialog open={iosOpen} onOpenChange={setIosOpen} />
    </section>
  );
}
