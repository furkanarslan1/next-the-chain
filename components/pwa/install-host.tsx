"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { markPwaInstalled } from "@/app/tour/actions";
import { InstallBanner } from "@/components/pwa/install-banner";
import { IosInstallDialog } from "@/components/pwa/ios-install-dialog";
import {
  dismissInstall,
  getServerSnapshot,
  getSnapshot,
  promptInstall,
  subscribe,
} from "@/lib/pwa-store";

type Props = {
  // Sunucudan: banner'ı göstermeye uygun mu (örn. turu bitirmiş ve ilk halkasını eklemiş)?
  eligible: boolean;
  // Yüklenme zaten kaydedilmiş mi (gereksiz yazmayı önler).
  alreadyRecorded: boolean;
};

// Ana sayfa: yüklü uygulamadan açıldıysa kaydeder; değilse uygun anda şeridi gösterir.
export function InstallHost({ eligible, alreadyRecorded }: Props) {
  const pwa = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [iosOpen, setIosOpen] = useState(false);

  // Ana ekrandan açıldıysa bir kez kaydet (ölçüm için).
  useEffect(() => {
    if (!pwa.standalone || alreadyRecorded) return;
    try {
      if (sessionStorage.getItem("pwa-recorded")) return;
      sessionStorage.setItem("pwa-recorded", "1");
    } catch {
      // sessionStorage yoksa yine de bir kez dene.
    }
    void markPwaInstalled();
  }, [pwa.standalone, alreadyRecorded]);

  if (!eligible || pwa.standalone || pwa.dismissed) return null;
  if (!pwa.canPrompt && !pwa.ios) return null;

  const mode = pwa.canPrompt ? "prompt" : "ios";

  return (
    <>
      <InstallBanner
        mode={mode}
        onInstall={() => (mode === "ios" ? setIosOpen(true) : void promptInstall())}
        onDismiss={dismissInstall}
      />
      <IosInstallDialog open={iosOpen} onOpenChange={setIosOpen} />
    </>
  );
}
