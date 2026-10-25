"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  LuArchive,
  LuCheck,
  LuEllipsis,
  LuRotateCcw,
  LuTrash2,
  LuUsers,
} from "react-icons/lu";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChainVisual } from "@/components/chain-visual";
import { JokerInfo } from "@/components/joker-info";
import { ShareDialog } from "@/components/share-dialog";
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
  const color = chain.color;
  const jokersLeft = Math.max(chain.weekly_jokers - jokersUsed, 0);

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
    const message = chain.group_id
      ? `"${chain.title}" ortak bir zincir. Silersen gruptan düşersin (grubun sahibiysen grup dağılır). Emin misin?`
      : `"${chain.title}" kalıcı olarak silinecek. Emin misin?`;
    if (!window.confirm(message)) return;
    startTransition(async () => {
      const result = await deleteChain(chain.id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <article
      className="relative overflow-hidden rounded-3xl border p-4 shadow-lg shadow-black/20"
      style={{
        borderColor: `${color}3d`,
        backgroundColor: "color-mix(in oklab, var(--card) 88%, transparent)",
        backgroundImage: `radial-gradient(110% 70% at 50% 30%, ${color}26 0%, transparent 65%), linear-gradient(180deg, ${color}12, transparent 38%)`,
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: color, boxShadow: `0 0 12px ${color}` }}
            />
            <h2 className="truncate text-base font-semibold">{chain.title}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {isQuit ? "Bırakıyorum" : "Her gün"}
            {chain.group_id ? " · Ortak zincir" : ""}
          </p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={`${chain.title} zincir seçenekleri`}
            disabled={pending}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-foreground outline-none transition-colors hover:bg-white/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            <LuEllipsis className="size-5" aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {isQuit && (
              <DropdownMenuItem onClick={relapse}>
                <LuRotateCcw aria-hidden />
                Nüks oldu
              </DropdownMenuItem>
            )}
            {!chain.group_id && (
              <DropdownMenuItem onClick={archive}>
                <LuArchive aria-hidden />
                Arşivle
              </DropdownMenuItem>
            )}
            {(isQuit || !chain.group_id) && <DropdownMenuSeparator />}
            <DropdownMenuItem variant="destructive" onClick={remove}>
              <LuTrash2 aria-hidden />
              Zinciri sil
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div
        className={`relative mx-auto my-3 w-full ${
          chain.current_length > 20 ? "aspect-square max-w-64" : "aspect-[3/2] max-w-72"
        }`}
      >
        <ChainVisual
          length={chain.current_length}
          color={color}
          pending={!doneToday}
          justAdded={celebrate}
          className="size-full"
        />
        {celebrate && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="plus-one text-3xl font-bold" style={{ color }}>
              +1 zincir
            </span>
          </div>
        )}
      </div>

      <dl className="grid grid-cols-3 divide-x divide-white/10 rounded-2xl bg-black/25 py-2.5 text-center">
        <Stat label="Seri" value={chain.current_length} color={color} />
        <Stat label="En uzun" value={chain.best_length} />
        <Stat label="Toplam" value={chain.total_completed} />
      </dl>

      <div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <JokerStatus color={color} weekly={chain.weekly_jokers} left={jokersLeft} />
        <JokerInfo weekly={chain.weekly_jokers} left={jokersLeft} />
      </div>

      {jokerUsedYesterday && (
        <p className="mt-2 text-xs text-amber-400">
          Dün joker kullanıldı, zincirin korundu.
        </p>
      )}

      {chain.group_id && (
        <Link
          href={`/groups/${chain.group_id}`}
          className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <LuUsers className="size-3.5" aria-hidden />
          Grubu gör
        </Link>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
        {doneToday ? (
          <div
            className="flex h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium"
            style={{ borderColor: `${color}66`, color, backgroundColor: `${color}14` }}
          >
            <LuCheck className="size-5" aria-hidden />
            Bugün tamam
          </div>
        ) : (
          <Button
            size="lg"
            className="h-12 rounded-xl text-base font-semibold text-black shadow-lg"
            style={{ backgroundColor: color, boxShadow: `0 6px 20px ${color}55` }}
            onClick={complete}
            disabled={pending}
          >
            {isQuit ? "Bugün temiz kaldım" : "Bugünü tamamla"}
          </Button>
        )}
        <ShareDialog
          target={{ type: "chain", id: chain.id }}
          label={`${chain.title} kartını paylaş`}
          trigger="large"
          fileName="the-chain"
        />
      </div>
    </article>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="space-y-0.5">
      <dd className="text-xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
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
            style={i < left ? { backgroundColor: color, borderColor: color } : undefined}
          />
        ))}
      </span>
      <span className="tabular-nums">
        {left}/{weekly} kaldı
      </span>
    </span>
  );
}
