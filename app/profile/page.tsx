import { Suspense } from "react";
import Link from "next/link";
import { LuChevronRight } from "react-icons/lu";
import { BottomNav } from "@/components/bottom-nav";
import { BadgeIcon } from "@/components/badge-icon";
import { Heatmap } from "@/components/profile/heatmap";
import { RankAvatar } from "@/components/profile/rank-avatar";
import { RankLadder } from "@/components/profile/rank-ladder";
import { RankProgress } from "@/components/profile/rank-progress";
import { WeeklySummary } from "@/components/profile/weekly-summary";
import { ListSkeleton } from "@/components/skeletons";
import { requireProfile } from "@/lib/auth";
import { BADGES } from "@/lib/badges";
import { todayIn, weekDates, weekStartOf } from "@/lib/chains";
import { tierInfo } from "@/lib/leagues";
import { buildHeatmap, weeklySummary } from "@/lib/profile-stats";
import { rankFor } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/server";

export default function ProfilePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28">
        <Suspense fallback={<ListSkeleton />}>
          <ProfileContent />
        </Suspense>
      </main>
      <BottomNav active="home" />
    </>
  );
}

async function ProfileContent() {
  const { profile } = await requireProfile();
  const supabase = await createClient();
  const today = todayIn(profile.timezone);

  const [heat, chains, badges] = await Promise.all([
    supabase.rpc("my_heatmap", { p_days: 120 }),
    supabase
      .from("chains")
      .select("best_length")
      .eq("owner_id", profile.id)
      .is("archived_at", null),
    supabase.rpc("my_badges"),
  ]);

  const rows = heat.data ?? [];
  const rank = rankFor(profile.active_days);
  const weeks = buildHeatmap(rows, today, 16);
  const summary = weeklySummary(rows, today);
  const todayIndex = weekDates(weekStartOf(today)).indexOf(today);
  const bestStreak = Math.max(0, ...(chains.data ?? []).map((c) => c.best_length));
  const earned = new Set((badges.data ?? []).map((b) => b.bd_badge));
  const league = tierInfo(profile.league_tier);

  return (
    <>
      {/* kahraman alanı: avatar, rütbe, ilerleme */}
      <section
        className="space-y-4 rounded-3xl border p-5 text-center"
        style={{
          borderColor: `${rank.current.color}44`,
          backgroundColor: "color-mix(in oklab, var(--card) 88%, transparent)",
          backgroundImage: `radial-gradient(90% 70% at 50% 0%, ${rank.current.color}2e, transparent 70%)`,
        }}
      >
        <div className="mx-auto flex size-36 items-center justify-center">
          <RankAvatar rank={rank.current.index} size={136} />
        </div>
        <div className="space-y-0.5">
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: rank.current.color }}>
            {rank.current.name}
          </h1>
          <p className="text-sm text-muted-foreground">{rank.current.blurb}</p>
        </div>
        <div className="text-left">
          <RankProgress activeDays={profile.active_days} />
        </div>
      </section>

      <dl className="grid grid-cols-3 gap-2 text-center">
        <Stat label="Aktif gün" value={profile.active_days} />
        <Stat label="Toplam halka" value={profile.total_completed} />
        <Stat label="En uzun seri" value={bestStreak} />
        <Stat label="Zincir" value={(chains.data ?? []).length} />
        <Stat label="Rozet" value={`${earned.size}/${BADGES.length}`} />
        <Stat label="Lig" value={league.name} color={league.color} />
      </dl>

      <WeeklySummary summary={summary} todayIndex={todayIndex} />

      <Heatmap weeks={weeks} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Rozetlerim</h2>
          <Link href="/badges" className="inline-flex items-center gap-0.5 text-sm text-muted-foreground hover:text-foreground">
            Tümü
            <LuChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
        <ul className="flex flex-wrap gap-2">
          {BADGES.map((badge) => (
            <li key={badge.key} title={`${badge.title}${earned.has(badge.key) ? "" : " (kilitli)"}`}>
              <BadgeIcon badge={badge} earned={earned.has(badge.key)} size={44} />
            </li>
          ))}
        </ul>
      </section>

      <RankLadder activeDays={profile.active_days} />
    </>
  );
}

function Stat({ label, value, color }: { label: string; value: number | string; color?: string }) {
  return (
    <div
      className="rounded-2xl border border-white/10 px-2 py-3"
      style={{ backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)" }}
    >
      <dd className="text-xl font-semibold tabular-nums" style={color ? { color } : undefined}>
        {value}
      </dd>
      <dt className="text-xs text-muted-foreground">{label}</dt>
    </div>
  );
}
