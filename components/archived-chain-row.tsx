"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteChain, restoreChain } from "@/app/chains/actions";

type Props = {
  id: string;
  title: string;
  color: string;
  bestLength: number;
  totalCompleted: number;
};

export function ArchivedChainRow({
  id,
  title,
  color,
  bestLength,
  totalCompleted,
}: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function restore() {
    setError(undefined);
    startTransition(async () => {
      const result = await restoreChain(id);
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    if (!window.confirm(`"${title}" kalıcı olarak silinecek. Emin misin?`)) return;
    setError(undefined);
    startTransition(async () => {
      const result = await deleteChain(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <li className="space-y-2 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-medium" style={{ color }}>
            {title}
          </p>
          <p className="text-xs text-muted-foreground">
            En uzun {bestLength} · Toplam {totalCompleted} halka
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={restore}>
            Geri al
          </Button>
          <Button size="sm" variant="ghost" disabled={pending} onClick={remove}>
            Sil
          </Button>
        </div>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-500">
          {error}
        </p>
      )}
    </li>
  );
}
