import { LuCheck, LuLock } from "react-icons/lu";
import { RankAvatar } from "@/components/profile/rank-avatar";
import { RANKS, rankFor } from "@/lib/ranks";

// Tüm rütbelerin listesi: ulaşılanlar işaretli, kilitliler soluk.
export function RankLadder({ activeDays }: { activeDays: number }) {
  const { current } = rankFor(activeDays);

  return (
    <details className="rounded-2xl border border-white/10 p-3" style={{ backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)" }}>
      <summary className="cursor-pointer select-none text-sm font-medium">Tüm rütbeler</summary>
      <ol className="mt-3 space-y-2">
        {RANKS.map((rank) => {
          const reached = rank.index <= current.index;
          return (
            <li
              key={rank.name}
              aria-current={rank.index === current.index ? "step" : undefined}
              className={`flex items-center gap-3 rounded-xl p-2 ${rank.index === current.index ? "bg-white/[0.07]" : ""}`}
            >
              <span className={reached ? "" : "opacity-40 grayscale"}>
                <RankAvatar rank={rank.index} size={44} />
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${reached ? "" : "text-muted-foreground"}`} style={reached ? { color: rank.color } : undefined}>
                  {rank.name}
                </p>
                <p className="text-xs text-muted-foreground">{rank.min === 0 ? "Başlangıç" : `${rank.min} aktif gün`}</p>
              </div>
              {reached ? (
                <LuCheck className="size-4 shrink-0 text-emerald-400" aria-label="Ulaşıldı" />
              ) : (
                <LuLock className="size-4 shrink-0 text-muted-foreground/60" aria-label="Kilitli" />
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
