"use client";

import { useState, useTransition } from "react";
import { LuDownload, LuShare2 } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  // chain: zincir kartı, badge: rozet kartı
  target: { type: "chain"; id: string } | { type: "badge"; key: string };
  label: string;
  // Tetikleyici düğmenin görünümü.
  trigger?: "icon" | "button" | "large";
  fileName?: string;
};

function Toggle({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
      {children}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="relative h-6 w-11 shrink-0 rounded-full bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-emerald-500"
      >
        <span
          aria-hidden
          className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform"
          style={{ transform: checked ? "translateX(1.25rem)" : undefined }}
        />
      </button>
    </label>
  );
}

export function ShareDialog({ target, label, trigger = "icon", fileName = "the-chain" }: Props) {
  const [open, setOpen] = useState(false);
  const [showTitle, setShowTitle] = useState(true);
  const [showUser, setShowUser] = useState(false);
  const [error, setError] = useState<string>();
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();

  const params = new URLSearchParams(
    target.type === "chain"
      ? { type: "chain", id: target.id, title: showTitle ? "1" : "0", user: showUser ? "1" : "0" }
      : { type: "badge", key: target.key, user: showUser ? "1" : "0" },
  );
  const src = `/api/share?${params}`;

  async function fetchBlob() {
    const response = await fetch(src);
    if (response.status === 429) throw new Error("Çok fazla kart oluşturdun, bir süre sonra tekrar dene.");
    if (!response.ok) throw new Error("Kart oluşturulamadı, tekrar dene.");
    return response.blob();
  }

  function share() {
    setError(undefined);
    startTransition(async () => {
      try {
        const blob = await fetchBlob();
        const file = new File([blob], `${fileName}.png`, { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file] });
        } else {
          save(blob);
        }
      } catch (e) {
        // Kullanıcı paylaşım menüsünü kapatırsa AbortError gelir, hata sayılmaz.
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Paylaşılamadı, tekrar dene.");
      }
    });
  }

  function save(blob?: Blob) {
    setError(undefined);
    startTransition(async () => {
      try {
        const data = blob ?? (await fetchBlob());
        const url = URL.createObjectURL(data);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileName}.png`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Kaydedilemedi, tekrar dene.");
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setError(undefined);
          setLoaded(false);
        }
      }}
    >
      <DialogTrigger
        aria-label={label}
        data-tour={trigger === "large" ? "share" : undefined}
        className={
          trigger === "icon"
            ? "inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            : trigger === "large"
              ? "inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 text-sm font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
              : "inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        }
      >
        <LuShare2 className={trigger === "large" ? "size-5" : "size-4"} aria-hidden />
        {trigger !== "icon" && "Paylaş"}
      </DialogTrigger>

      <DialogContent className="gap-4 p-5">
        <DialogHeader>
          <DialogTitle>Kartı paylaş</DialogTitle>
          <DialogDescription>
            Kartta görünecekleri sen seçersin. Hiçbir şey sen paylaşmadan yayınlanmaz.
          </DialogDescription>
        </DialogHeader>

        <div className="relative mx-auto aspect-[4/5] w-full max-w-60 overflow-hidden rounded-xl border bg-muted">
          {open && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt="Paylaşım kartı önizlemesi"
              onLoad={() => setLoaded(true)}
              onError={() => setError("Önizleme yüklenemedi.")}
              className={`size-full object-cover transition-opacity ${loaded ? "opacity-100" : "opacity-0"}`}
            />
          )}
          {!loaded && !error && (
            <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
              Kart hazırlanıyor…
            </p>
          )}
        </div>

        <div className="space-y-3">
          {target.type === "chain" && (
            <Toggle
              checked={showTitle}
              onChange={(v) => {
                setLoaded(false);
                setShowTitle(v);
              }}
            >
              Zincirin adı görünsün
            </Toggle>
          )}
          <Toggle
            checked={showUser}
            onChange={(v) => {
              setLoaded(false);
              setShowUser(v);
            }}
          >
            Kullanıcı adım görünsün
          </Toggle>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11 gap-2" disabled={pending} onClick={() => save()}>
            <LuDownload className="size-4" aria-hidden />
            Kaydet
          </Button>
          <Button className="h-11 gap-2" disabled={pending} onClick={share}>
            <LuShare2 className="size-4" aria-hidden />
            Paylaş
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
