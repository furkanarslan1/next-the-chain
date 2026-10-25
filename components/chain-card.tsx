"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChainVisual } from "@/components/chain-visual";
import { checkIn, reportRelapse } from "@/app/chains/actions";
import type { Chain } from "@/lib/chains";

type Props = { chain: Chain; doneToday: boolean };

export function ChainCard({ chain, doneToday }: Props) {
  const [pending, startTransition] = useTransition();
  const [celebrate, setCelebrate] = useState(false);
  const [error, setError] = useState<string>();

  const isQuit = chain.kind === "quit";

  function complete() {
    setError(undefined);
    startTransition(async () => {
      const result = await checkIn(chain.id);
      if (!result.ok) return setError(result.error);
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 1400);
    });
  }

  function relapse() {
    if (!window.confirm("Zincirin sıfırlanacak. Emin misin?")) return;
    startTransition(async () => {
      const result = await reportRelapse(chain.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <article className="rounded-2xl border bg-card p-4">
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="truncate font-medium" style={{ color: chain.color }}>
          {chain.title}
        </h2>
        <p className="shrink-0 text-sm tabular-nums text-muted-foreground">
          En uzun {chain.best_length}
        </p>
      </header>

      <div className="relative mx-auto my-3 aspect-square w-full max-w-72">
        <ChainVisual
          length={chain.current_length}
          color={chain.color}
          pending={!doneToday}
          justAdded={celebrate}
          className="size-full"
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {celebrate ? (
            <span
              className="plus-one text-3xl font-bold"
              style={{ color: chain.color }}
            >
              +1 zincir
            </span>
          ) : (
            <span className="text-4xl font-semibold tabular-nums">
              {chain.current_length}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-2 text-sm text-red-500">
          {error}
        </p>
      )}

      {doneToday ? (
        <p className="text-center text-sm text-muted-foreground">
          Bugünün halkası tamam. Yarın devam.
        </p>
      ) : (
        <Button
          size="lg"
          className="h-12 w-full text-base text-black"
          style={{ backgroundColor: chain.color }}
          onClick={complete}
          disabled={pending}
        >
          {isQuit ? "Bugün temiz kaldım" : "Bugünü tamamla"}
        </Button>
      )}

      {isQuit && (
        <button
          type="button"
          onClick={relapse}
          disabled={pending}
          className="mt-3 w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          Nüks oldu
        </button>
      )}
    </article>
  );
}
