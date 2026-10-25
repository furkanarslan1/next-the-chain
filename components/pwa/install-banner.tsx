import { LuX } from "react-icons/lu";
import { Button } from "@/components/ui/button";

type Props = {
  // prompt: tarayıcının yükleme penceresi var; ios: rehber gösterilir.
  mode: "prompt" | "ios";
  onInstall: () => void;
  onDismiss: () => void;
};

// Ana sayfadaki kapatılabilir "uygulamayı yükle" şeridi (sadece görünüm).
export function InstallBanner({ mode, onInstall, onDismiss }: Props) {
  return (
    <section
      aria-label="Uygulamayı yükle"
      className="relative flex items-center gap-3 rounded-2xl border border-white/15 p-3 pr-10"
      style={{
        backgroundColor: "color-mix(in oklab, var(--card) 88%, transparent)",
        backgroundImage: "linear-gradient(135deg, #ff6a3d1f, transparent 60%)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon-192.png" alt="" width={44} height={44} className="size-11 shrink-0 rounded-xl" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-sm font-semibold">Uygulamayı ana ekrana ekle</p>
        <p className="text-xs text-muted-foreground">
          Tek dokunuşla aç, hatırlatmaları kaçırma.
        </p>
      </div>
      <Button size="sm" className="h-9 shrink-0 px-3" onClick={onInstall}>
        {mode === "ios" ? "Nasıl?" : "Yükle"}
      </Button>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Şimdilik kapat"
        className="absolute top-1.5 right-1.5 inline-flex size-7 items-center justify-center rounded-full text-muted-foreground outline-none hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LuX className="size-4" aria-hidden />
      </button>
    </section>
  );
}
