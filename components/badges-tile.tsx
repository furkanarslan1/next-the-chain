import Link from "next/link";
import { LuAward } from "react-icons/lu";

// Ana sayfadaki rozet kutucuğu.
export function BadgesTile({ earned, total, wide }: { earned: number; total: number; wide?: boolean }) {
  const ratio = total > 0 ? earned / total : 0;

  return (
    <Link
      href="/badges"
      data-tour="badges"
      className={`flex flex-col gap-2 rounded-2xl border p-3 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring ${
        wide ? "col-span-2" : ""
      }`}
      style={{
        borderColor: "#9b7bff40",
        backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)",
        backgroundImage: "linear-gradient(160deg, #9b7bff1f, transparent 60%)",
      }}
    >
      <span
        className="flex size-9 items-center justify-center rounded-xl"
        style={{ backgroundColor: "#9b7bff2b", color: "#9b7bff" }}
      >
        <LuAward className="size-5" aria-hidden />
      </span>
      <span className="space-y-0.5">
        <span className="block text-sm font-semibold" style={{ color: "#b6a1ff" }}>
          Rozetler
        </span>
        <span className="block text-xs text-muted-foreground">
          {earned} / {total} kazandın
        </span>
      </span>
      <span
        className="h-1.5 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`${earned} / ${total} rozet`}
      >
        <span
          className="block h-full rounded-full"
          style={{ width: `${ratio * 100}%`, backgroundColor: "#9b7bff" }}
        />
      </span>
    </Link>
  );
}
