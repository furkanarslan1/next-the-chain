"use client";

import { useState } from "react";

import { RankMini } from "@/components/profile/rank-avatar";
import { rankFor } from "@/lib/ranks";

export type LeaderboardRow = {
  user_id: string;
  username: string | null;
  completed: number;
  active_days: number;
};

type Props = {
  week: LeaderboardRow[];
  month: LeaderboardRow[];
  meId: string;
};

const TABS = [
  { key: "week", label: "Bu hafta" },
  { key: "month", label: "Bu ay" },
] as const;

export function Leaderboard({ week, month, meId }: Props) {
  const [tab, setTab] = useState<"week" | "month">("week");
  const rows = tab === "week" ? week : month;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Sıralama</h2>
        <div role="tablist" className="flex rounded-lg border p-0.5 text-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              type="button"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className="rounded-md px-3 py-1 text-muted-foreground aria-selected:bg-muted aria-selected:text-foreground"
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length <= 1 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Sıralama arkadaşların eklendiğinde dolacak.
        </p>
      ) : (
        <ol className="divide-y rounded-xl border">
          {rows.map((row, i) => {
            const me = row.user_id === meId;
            return (
              <li
                key={row.user_id}
                className={`flex items-center gap-3 p-3 ${me ? "bg-muted/60" : ""}`}
              >
                <span className="w-6 text-center text-sm tabular-nums text-muted-foreground">
                  {i + 1}
                </span>
                <RankMini rank={rankFor(row.active_days).current.index} name={rankFor(row.active_days).current.name} size={28} />
                <span className="min-w-0 flex-1 truncate font-medium">
                  @{row.username}
                  {me && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      sen
                    </span>
                  )}
                </span>
                <span className="text-sm tabular-nums">
                  {row.completed} halka
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
