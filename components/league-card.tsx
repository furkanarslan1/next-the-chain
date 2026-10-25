import Link from "next/link";
import { LuTrophy } from "react-icons/lu";
import { tierInfo } from "@/lib/leagues";

type Props = {
  tier: number;
  place: number;
  size: number;
  score: number | null;
  remaining: string;
};

// Ana sayfadaki lig kutucuğu.
export function LeagueCard({ tier, place, size, score, remaining }: Props) {
  const info = tierInfo(tier);

  return (
    <Link
      href="/league"
      data-tour="league"
      className="flex flex-col gap-2 rounded-2xl border p-3 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
      style={{
        borderColor: `${info.color}40`,
        backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)",
        backgroundImage: `linear-gradient(160deg, ${info.color}1f, transparent 60%)`,
      }}
    >
      <span
        className="flex size-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${info.color}2b`, color: info.color }}
      >
        <LuTrophy className="size-5" aria-hidden />
      </span>
      <span className="space-y-0.5">
        <span className="block text-sm font-semibold" style={{ color: info.color }}>
          {info.name} Lig
        </span>
        <span className="block text-xs text-muted-foreground">
          {score === null ? "Henüz puanın yok" : `${place}. sıra · %${score}`}
        </span>
        <span className="block text-xs text-muted-foreground/80">
          {size} kişi · {remaining}
        </span>
      </span>
    </Link>
  );
}
