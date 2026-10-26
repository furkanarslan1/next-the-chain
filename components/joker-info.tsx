"use client";

import { useState, useTransition } from "react";
import { LuInfo } from "react-icons/lu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { setChainJokers } from "@/app/chains/actions";
import { JOKER_OPTIONS, dayLabel } from "@/lib/chains";

type Props = {
  chainId: string;
  weekly: number;
  left: number;
  // Sonraki Pazartesi'den geçerli olacak artış (varsa).
  pending: { value: number; from: string } | null;
  // Ortak zincirde hak grup kurulurken sabitlenir; haftalık hedefli zincirde joker yoktur.
  locked: "group" | null;
};

export function JokerInfo({ chainId, weekly, left, pending, locked }: Props) {
  const [busy, startTransition] = useTransition();
  const [message, setMessage] = useState<string>();
  const [error, setError] = useState<string>();

  const selected = pending?.value ?? weekly;

  function choose(value: number) {
    if (value === selected || busy) return;
    setError(undefined);
    setMessage(undefined);
    startTransition(async () => {
      const result = await setChainJokers(chainId, value);
      if (!result.ok) return setError(result.error);
      setMessage(
        value < weekly
          ? "Joker hakkın hemen azaltıldı."
          : value > weekly
            ? "Artış gelecek Pazartesi'den geçerli olacak."
            : "Değişiklik iptal edildi.",
      );
    });
  }

  return (
    <Dialog>
      <DialogTrigger
        aria-label="Joker hakkında bilgi"
        className="-m-2 inline-flex size-8 items-center justify-center rounded-full text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
      >
        <LuInfo className="size-4" aria-hidden />
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Joker nedir?</DialogTitle>
          <DialogDescription>
            Bir günü kaçırdığında zincirinin kırılmasını önleyen haktır.
          </DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          <li>
            <span className="text-foreground">Kendiliğinden kullanılır.</span>{" "}
            Basman gereken bir buton yok. Bir günü tamamlamazsan, ertesi gün
            uygulamayı açtığında o gün için bir joker otomatik harcanır.
          </li>
          <li>
            {weekly === 0 ? (
              <>
                Bu zincirde <b className="text-foreground">joker yok</b>: bir
                günü kaçırırsan zincir kırılır.
              </>
            ) : (
              <>
                Bu zincirin haftada <b className="text-foreground">{weekly}</b>{" "}
                jokeri var ve her Pazartesi yenilenir. Bu hafta{" "}
                <b className="text-foreground">{left}</b> hakkın kaldı.
              </>
            )}
          </li>
          <li>Joker yeni halka eklemez, sadece zinciri korur.</li>
          <li>
            Hakların bittiği bir günü kaçırırsan zincirin sıfırlanır. Toplam
            halka sayın düşmez.
          </li>
        </ul>

        {locked === "group" ? (
          <p className="rounded-lg bg-white/5 px-3 py-2 text-xs text-muted-foreground">
            Ortak zincirde joker hakkı grup kurulurken seçilir ve değiştirilemez.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium">Haftalık joker hakkı</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Haftalık joker hakkı">
              {JOKER_OPTIONS.map((count) => (
                <button
                  key={count}
                  type="button"
                  role="radio"
                  aria-checked={selected === count}
                  disabled={busy}
                  onClick={() => choose(count)}
                  className={`rounded-lg border py-2 text-center outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${
                    selected === count ? "border-foreground bg-white/10" : ""
                  }`}
                >
                  <span className="block text-lg font-semibold tabular-nums">{count}</span>
                  <span className="block text-xs text-muted-foreground">
                    {count === 0 ? "Joker yok" : "joker"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Azaltmak hemen, artırmak sonraki Pazartesi&apos;den geçerli olur.
            </p>
            {pending && (
              <p className="text-xs text-amber-400">
                {dayLabel(pending.from)} günü joker hakkın {pending.value} olacak.
              </p>
            )}
            {message && (
              <p role="status" className="text-xs text-emerald-400">
                {message}
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-red-400">
                {error}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
