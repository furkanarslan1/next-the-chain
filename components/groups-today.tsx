import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";

export type GroupTodayRow = {
  gt_group_id: string;
  gt_title: string;
  gt_color: string;
  gt_done: number;
  gt_total: number;
};

// Ana sayfa: ortak zincirlerde bugün kaç kişi tamamladı.
export function GroupsToday({ groups }: { groups: GroupTodayRow[] }) {
  if (groups.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Ortak zincirler</h2>
      <ul className="space-y-2">
        {groups.map((g) => {
          const ratio = g.gt_total > 0 ? g.gt_done / g.gt_total : 0;
          return (
            <li key={g.gt_group_id}>
              <Link
                href={`/groups/${g.gt_group_id}`}
                className="flex items-center gap-3 rounded-2xl border p-3 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
                style={{
                  borderColor: `${g.gt_color}40`,
                  backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)",
                  backgroundImage: `linear-gradient(135deg, ${g.gt_color}18, transparent 60%)`,
                }}
              >
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: g.gt_color, boxShadow: `0 0 10px ${g.gt_color}` }}
                />
                <span className="min-w-0 flex-1 space-y-1.5">
                  <span className="block truncate text-sm font-medium">{g.gt_title}</span>
                  <span
                    className="block h-1.5 overflow-hidden rounded-full bg-white/10"
                    role="img"
                    aria-label={`${g.gt_done} / ${g.gt_total} kişi bugün tamamladı`}
                  >
                    <span
                      className="block h-full rounded-full"
                      style={{ width: `${ratio * 100}%`, backgroundColor: g.gt_color }}
                    />
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {g.gt_done}/{g.gt_total} tamam
                </span>
                <LuChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
