import { Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { BadgeIcon } from "@/components/badge-icon";
import { ShareDialog } from "@/components/share-dialog";
import { requireProfile } from "@/lib/auth";
import { BADGES } from "@/lib/badges";
import { createClient } from "@/lib/supabase/server";

export default function BadgesPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28">
        <div className="space-y-1">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
            Geri
          </Link>
          <h1 className="text-xl font-semibold">Rozetler</h1>
        </div>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <BadgesContent />
        </Suspense>
      </main>
      <BottomNav active="home" />
    </>
  );
}

async function BadgesContent() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const [badges, best] = await Promise.all([
    supabase.rpc("my_badges"),
    supabase
      .from("chains")
      .select("best_length")
      .eq("owner_id", profile.id)
      .order("best_length", { ascending: false })
      .limit(1),
  ]);

  const earned = new Map((badges.data ?? []).map((b) => [b.bd_badge, b.bd_earned_at]));
  const values = { best: best.data?.[0]?.best_length ?? 0, total: profile.total_completed };

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {earned.size} / {BADGES.length} rozet kazandın.
      </p>
      <ul className="grid grid-cols-2 gap-3">
        {BADGES.map((badge) => {
          const date = earned.get(badge.key);
          const isEarned = date !== undefined;
          const current = badge.progress ? values[badge.progress] : 0;
          const ratio = badge.target ? Math.min(current / badge.target, 1) : 0;

          return (
            <li
              key={badge.key}
              className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center ${
                isEarned ? "bg-card" : "border-dashed"
              }`}
            >
              <BadgeIcon badge={badge} earned={isEarned} size={64} />
              <div className="space-y-0.5">
                <p className={`text-sm font-medium ${isEarned ? "" : "text-muted-foreground"}`}>
                  {badge.title}
                </p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
              {isEarned ? (
                <p className="text-xs text-muted-foreground">
                  {new Date(date).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              ) : (
                badge.target &&
                badge.target > 1 && (
                  <div className="w-full space-y-1">
                    <div
                      className="h-1.5 overflow-hidden rounded-full bg-muted"
                      role="img"
                      aria-label={`İlerleme ${Math.min(current, badge.target)} / ${badge.target}`}
                    >
                      <div
                        className="h-full rounded-full bg-muted-foreground/60"
                        style={{ width: `${ratio * 100}%` }}
                      />
                    </div>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {Math.min(current, badge.target)} / {badge.target}
                    </p>
                  </div>
                )
              )}
              {isEarned && (
                <div className="absolute top-2 right-2">
                  <ShareDialog
                    target={{ type: "badge", key: badge.key }}
                    label={`${badge.title} rozetini paylaş`}
                    fileName={`the-chain-${badge.key}`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
