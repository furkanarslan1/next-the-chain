"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RankAvatar } from "@/components/profile/rank-avatar";
import { ShareDialog } from "@/components/share-dialog";
import { markRankSeen } from "@/app/profile/actions";
import { RANKS } from "@/lib/ranks";

// Yeni rütbeye ulaşınca bir kez gösterilen kutlama; kapatılınca "görüldü" kaydedilir.
export function RankUpDialog({ rank }: { rank: number }) {
  const [open, setOpen] = useState(true);
  const info = RANKS[Math.min(Math.max(rank, 0), RANKS.length - 1)];

  function close() {
    setOpen(false);
    void markRankSeen(info.index);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="gap-5 p-6 text-center">
        <div
          className="link-new mx-auto flex size-32 items-center justify-center rounded-full"
          style={{ backgroundImage: `radial-gradient(closest-side, ${info.color}40, transparent)` }}
        >
          <RankAvatar rank={info.index} size={112} />
        </div>
        <div className="space-y-1">
          <DialogDescription>Yeni rütbe</DialogDescription>
          <DialogTitle className="text-2xl" style={{ color: info.color }}>
            {info.name}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{info.blurb}</p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <Button className="h-11 px-8" onClick={close}>
            Harika
          </Button>
          <ShareDialog target={{ type: "rank" }} label="Rütbe kartını paylaş" trigger="button" fileName="the-chain-rutbe" />
        </div>
      </DialogContent>
    </Dialog>
  );
}
