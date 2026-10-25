"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { BadgeIcon } from "@/components/badge-icon";
import { ShareDialog } from "@/components/share-dialog";
import { markBadgesSeen } from "@/app/badges/actions";
import { badgeByKey } from "@/lib/badges";

// Yeni kazanılan rozetleri gösterir; kapatılınca "görüldü" olarak işaretler.
export function NewBadgeDialog({ keys }: { keys: string[] }) {
  const [open, setOpen] = useState(keys.length > 0);
  const badges = keys.map(badgeByKey).filter((b) => b !== undefined);
  if (badges.length === 0) return null;

  function close() {
    setOpen(false);
    void markBadgesSeen();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="gap-5 p-6 text-center">
        <div className="space-y-1">
          <DialogTitle>
            {badges.length > 1 ? `${badges.length} yeni rozet kazandın` : "Yeni rozet kazandın"}
          </DialogTitle>
          <DialogDescription>Tebrikler, böyle devam.</DialogDescription>
        </div>
        <ul className="space-y-4">
          {badges.map((badge) => (
            <li key={badge.key} className="flex items-center gap-4 text-left">
              <BadgeIcon badge={badge} earned size={56} className="link-new" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{badge.title}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
              <ShareDialog
                target={{ type: "badge", key: badge.key }}
                label={`${badge.title} rozetini paylaş`}
                fileName={`the-chain-${badge.key}`}
              />
            </li>
          ))}
        </ul>
        <Button className="h-11" onClick={close}>
          Harika
        </Button>
      </DialogContent>
    </Dialog>
  );
}
