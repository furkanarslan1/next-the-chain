"use client";

import { LuPlus, LuShare } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// iPhone/iPad'de otomatik yükleme isteği olmadığı için adım adım rehber.
export function IosInstallDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-4 p-5">
        <DialogHeader>
          <DialogTitle>Ana ekrana ekle</DialogTitle>
          <DialogDescription>
            iPhone&apos;da bildirimlerin çalışması için uygulamayı ana ekrana eklemelisin.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <LuShare className="size-4" aria-hidden />
            </span>
            <span className="pt-1">Safari&apos;de alttaki <b>Paylaş</b> simgesine dokun.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10">
              <LuPlus className="size-4" aria-hidden />
            </span>
            <span className="pt-1">Listeden <b>Ana Ekrana Ekle</b>&apos;yi seç.</span>
          </li>
          <li className="flex items-start gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
              3
            </span>
            <span className="pt-1">
              <b>Ekle</b>&apos;ye dokun ve uygulamayı ana ekrandaki simgeden aç.
            </span>
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          Not: Ana ekran uygulaması Safari&apos;den ayrı çalışır, orada bir kez daha giriş yapman gerekir.
        </p>
      </DialogContent>
    </Dialog>
  );
}
