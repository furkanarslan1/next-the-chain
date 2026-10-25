"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setLeagueVisible } from "@/app/league/actions";

export function LeagueVisibility({ visible }: { visible: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(visible);
  const [error, setError] = useState<string>();

  function toggle() {
    const next = !optimistic;
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setLeagueVisible(next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <div className="space-y-1">
          <p id="league-visible-label" className="text-sm font-medium">
            Ligde adım görünsün
          </p>
          <p id="league-visible-hint" className="text-xs text-muted-foreground">
            Kapatırsan diğer oyunculara &quot;Gizli oyuncu&quot; olarak
            görünürsün. Yarışmaya ve terfi etmeye devam edersin.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optimistic}
          aria-labelledby="league-visible-label"
          aria-describedby="league-visible-hint"
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
    </section>
  );
}
