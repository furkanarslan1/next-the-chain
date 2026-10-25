import Link from "next/link";
import { LuChevronRight, LuTrophy } from "react-icons/lu";
import { tierInfo } from "@/lib/leagues";

type Props = {
  tier: number;
  place: number;
  size: number;
  score: number | null;
  remaining: string;
};

export function LeagueCard({ tier, place, size, score, remaining }: Props) {
  const info = tierInfo(tier);

  return (
    <Link
      href="/league"
      className="flex items-center gap-3 rounded-2xl border bg-card p-3 outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className="flex size-11 shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${info.color}26`, color: info.color }}
      >
        <LuTrophy className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium" style={{ color: info.color }}>
          {info.name} Lig
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {score === null ? "Bu hafta henüz puanın yok" : `${place}. sıra · %${score}`}
          {" · "}
          {size} kişi · {remaining}
        </span>
      </span>
      <LuChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </Link>
  );
}
