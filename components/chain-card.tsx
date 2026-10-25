"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChainVisual } from "@/components/chain-visual";
import { JokerInfo } from "@/components/joker-info";
import {
  archiveChain,
  checkIn,
  deleteChain,
  reportRelapse,
} from "@/app/chains/actions";
import type { Chain } from "@/lib/chains";

type Props = {
  chain: Chain;
  doneToday: boolean;
  jokersUsed: number;
  jokerUsedYesterday: boolean;
};

export function ChainCard({
  chain,
  doneToday,
  jokersUsed,
  jokerUsedYesterday,
}: Props) {
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

  function archive() {
    startTransition(async () => {
      const result = await archiveChain(chain.id);
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    if (!window.confirm(`"${chain.title}" kalıcı olarak silinecek. Emin misin?`)) {
      return;
    }
    startTransition(async () => {
      const result = await deleteChain(chain.id);
      if (!result.ok) setError(result.error);
    });
  }

  const jokersLeft = Math.max(chain.weekly_jokers - jokersUsed, 0);

  return (
    <article className="rounded-2xl border bg-card p-4">
      <header className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate font-medium" style={{ color: chain.color }}>
            {chain.title}
          </h2>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <JokerStatus
              color={chain.color}
              weekly={chain.weekly_jokers}
              left={jokersLeft}
            />
            <JokerInfo weekly={chain.weekly_jokers} left={jokersLeft} />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-3xl font-semibold leading-none tabular-nums">
            {chain.current_length}
          </p>
          <p className="mt-1 text-xs tabular-nums text-muted-foreground">
            En uzun {chain.best_length}
          </p>
        </div>
      </header>
      {chain.group_id && (
        <Link
          href={`/groups/${chain.group_id}`}
          className="mt-2 inline-block text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Ortak zincir · Grubu gör
        </Link>
      )}
      {jokerUsedYesterday && (
        <p className="mt-2 text-xs text-amber-400">
          Dün joker kullanıldı, zincirin korundu.
        </p>
      )}

      <div className="relative mx-auto my-3 aspect-square w-full max-w-72">
        <ChainVisual
          length={chain.current_length}
          color={chain.color}
          pending={!doneToday}
          justAdded={celebrate}
          className="size-full"
        />
        {celebrate && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span
              className="plus-one text-3xl font-bold"
              style={{ color: chain.color }}
            >
              +1 zincir
            </span>
          </div>
        )}
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
      <details className="mt-3 text-center text-xs text-muted-foreground">
        <summary className="cursor-pointer select-none">Yönet</summary>
        <div className="mt-2 flex justify-center gap-4">
          {!chain.group_id && (
            <button
              type="button"
              onClick={archive}
              disabled={pending}
              className="underline-offset-4 hover:text-foreground hover:underline"
            >
              Arşivle
            </button>
          )}
          <button
            type="button"
            onClick={remove}
            disabled={pending}
            className="text-red-400 underline-offset-4 hover:underline"
          >
            Sil
          </button>
        </div>
      </details>
    </article>
  );
}

function JokerStatus({
  color,
  weekly,
  left,
}: {
  color: string;
  weekly: number;
  left: number;
}) {
  return (
    <span
      className="flex items-center gap-2"
      role="img"
      aria-label={`Bu hafta ${weekly} jokerden ${left} tanesi kaldı`}
    >
      <span>Joker</span>
      <span className="flex gap-1" aria-hidden>
        {Array.from({ length: weekly }, (_, i) => (
          <span
            key={i}
            className="size-2 rounded-full border"
            style={
              i < left ? { backgroundColor: color, borderColor: color } : undefined
            }
          />
        ))}
      </span>
      <span className="tabular-nums">
        {left}/{weekly} kaldı
      </span>
    </span>
  );
}
