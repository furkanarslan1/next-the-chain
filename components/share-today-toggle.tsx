"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setShareToday } from "@/app/friends/actions";

export function ShareTodayToggle({ enabled }: { enabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [error, setError] = useState<string>();

  function toggle() {
    const next = !optimistic;
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setShareToday(next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <div className="space-y-1">
          <p id="share-today-label" className="text-sm font-medium">
            Bugünkü durumum arkadaşlarıma görünsün
          </p>
          <p id="share-today-hint" className="text-xs text-muted-foreground">
            Ana sayfada arkadaşların, bugün zincirlerini tamamlayıp
            tamamlamadığını görür. Kapatırsan şeritte hiç görünmezsin ve sen de
            arkadaşlarının durumunu göremezsin.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optimistic}
          aria-labelledby="share-today-label"
          aria-describedby="share-today-hint"
          disabled={pending}
          onClick={toggle}
          className="relative mt-0.5 h-6 w-11 shrink-0 rounded-full bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring aria-checked:bg-emerald-500"
        >
          <span
            aria-hidden
            className="absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform"
            style={{ transform: optimistic ? "translateX(1.25rem)" : undefined }}
          />
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-500">
          {error}
        </p>
      )}
    </div>
  );
}
