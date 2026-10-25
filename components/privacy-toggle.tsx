"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setDiscoverable } from "@/app/friends/actions";

export function PrivacyToggle({ discoverable }: { discoverable: boolean }) {
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(discoverable);
  const [error, setError] = useState<string>();

  function toggle() {
    const next = !optimistic;
    setError(undefined);
    startTransition(async () => {
      setOptimistic(next);
      const result = await setDiscoverable(next);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <section className="space-y-2">
      <h2 className="font-medium">Gizlilik</h2>
      <div className="flex items-start justify-between gap-4 rounded-xl border p-3">
        <div className="space-y-1">
          <p id="discoverable-label" className="text-sm font-medium">
            Aramada görün
          </p>
          <p id="discoverable-hint" className="text-xs text-muted-foreground">
            Kapatırsan kullanıcı adınla aramada çıkmazsın ve kimse sana yeni
            arkadaşlık isteği gönderemez. Mevcut arkadaşların etkilenmez; sen
            istek gönderebilirsin.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={optimistic}
          aria-labelledby="discoverable-label"
          aria-describedby="discoverable-hint"
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
