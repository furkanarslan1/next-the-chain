"use client";

import { useState, useTransition } from "react";
import { LuCheck } from "react-icons/lu";
import { checkIn } from "@/app/chains/actions";

export type QuickChain = {
  id: string;
  title: string;
  color: string;
  kind: string;
  done: boolean;
  // Haftalık hedefli zincirin bu haftaki durumu, ör. "2/3 gün".
  progress: string | null;
};

// Tek dokunuşla tamamlama: ana ekran kısayolundan açılan sade liste.
export function QuickCheckin({ chains }: { chains: QuickChain[] }) {
  const [doneIds, setDoneIds] = useState<Set<string>>(
    () => new Set(chains.filter((c) => c.done).map((c) => c.id)),
  );
  const [busyId, setBusyId] = useState<string>();
  const [error, setError] = useState<string>();
  const [, startTransition] = useTransition();

  function complete(id: string) {
    setError(undefined);
    setBusyId(id);
    startTransition(async () => {
      const result = await checkIn(id);
      setBusyId(undefined);
      if (!result.ok) return setError(result.error);
      setDoneIds((prev) => new Set(prev).add(id));
    });
  }

  const remaining = chains.filter((c) => !doneIds.has(c.id)).length;

  return (
    <section className="space-y-3" aria-label="Hızlı tamamla">
      <p role="status" className="text-sm text-muted-foreground">
        {remaining === 0 ? "Bugün hepsi tamam." : `${remaining} zincir seni bekliyor.`}
      </p>
      <ul className="space-y-3">
        {chains.map((chain) => {
          const done = doneIds.has(chain.id);
          return (
            <li key={chain.id}>
              <button
                type="button"
                disabled={done || busyId === chain.id}
                onClick={() => complete(chain.id)}
                className="flex h-16 w-full items-center justify-between gap-3 rounded-2xl border px-4 text-left outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default"
                style={{
                  borderColor: `${chain.color}66`,
                  backgroundColor: done ? `${chain.color}14` : `${chain.color}26`,
                  opacity: busyId === chain.id ? 0.7 : 1,
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{chain.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {done
                      ? "Bugün tamam"
                      : chain.kind === "quit"
                        ? "Bugün temiz kaldım"
                        : "Bugünü tamamla"}
                    {chain.progress ? ` · ${chain.progress}` : ""}
                  </span>
                </span>
                <span
                  aria-hidden
                  className="flex size-9 shrink-0 items-center justify-center rounded-full border"
                  style={
                    done
                      ? { backgroundColor: chain.color, borderColor: chain.color, color: "#000" }
                      : { borderColor: chain.color }
                  }
                >
                  {done && <LuCheck className="size-5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
