import { Suspense } from "react";
import Link from "next/link";
import { LuLink2, LuPlus } from "react-icons/lu";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { ChainCard } from "@/components/chain-card";
import { BadgesTile } from "@/components/badges-tile";
import { LeagueCard } from "@/components/league-card";
import { NewBadgeDialog } from "@/components/new-badge-dialog";
import { BADGES } from "@/lib/badges";
import { SkyTint } from "@/components/sky-tint";
import { TimezoneSync } from "@/components/timezone-sync";
import { TodaySummary } from "@/components/today-summary";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { closesIn } from "@/lib/leagues";
import {
  greetingFor,
  planLimit,
  todayIn,
  weekStartOf,
  yesterdayOf,
  type Chain,
} from "@/lib/chains";

export default function Home() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28">
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <Dashboard />
        </Suspense>
      </main>
      <BottomNav active="home" />
    </>
  );
}

async function Dashboard() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // Tüm aktif zincirleri tek çağrıda hesaplar: kaçırılan günleri joker hakkıyla
  // kapatır ya da zinciri sıfırlar.
  const { data } = await supabase.rpc("settle_my_chains");
  const chains: Chain[] = data ?? [];

  const today = todayIn(profile.timezone);
  const yesterday = yesterdayOf(today);
  const limit = planLimit(profile.plan);

  const [{ data: jokers }, { data: standings }, { data: badges }] = await Promise.all([
    supabase
      .from("check_ins")
      .select("chain_id, day")
      .eq("user_id", profile.id)
      .eq("is_joker", true)
      .gte("day", weekStartOf(today)),
    supabase.rpc("league_standings"),
    supabase.rpc("my_badges"),
  ]);
  const myLeague = (standings ?? []).find((row) => row.lg_is_me);
  const newBadgeKeys = (badges ?? []).filter((b) => b.bd_is_new).map((b) => b.bd_badge);

  const jokersUsed = new Map<string, number>();
  const jokerYesterday = new Set<string>();
  for (const j of jokers ?? []) {
    jokersUsed.set(j.chain_id, (jokersUsed.get(j.chain_id) ?? 0) + 1);
    if (j.day === yesterday) jokerYesterday.add(j.chain_id);
  }

  const doneFlags = chains.map(
    (chain) =>
      chain.last_day !== null && chain.last_day >= today && chain.current_length > 0,
  );
  const doneCount = doneFlags.filter(Boolean).length;
  const atLimit = chains.length >= limit;

  return (
    <>
      <TimezoneSync current={profile.timezone} />
      <SkyTint colors={chains.map((c) => c.color)} />

      <header className="space-y-0.5">
        <p className="text-sm text-muted-foreground">{greetingFor(profile.timezone)}</p>
        <h1 className="text-2xl font-semibold tracking-tight">@{profile.username}</h1>
      </header>

      <TodaySummary done={doneCount} total={chains.length} />

      <div className="grid grid-cols-2 gap-3">
        {myLeague && (
          <LeagueCard
            tier={myLeague.lg_tier}
            place={myLeague.lg_place}
            size={myLeague.lg_size}
            score={myLeague.lg_score}
            remaining={closesIn(myLeague.lg_week_start)}
          />
        )}
        <BadgesTile earned={(badges ?? []).length} total={BADGES.length} wide={!myLeague} />
      </div>

      <NewBadgeDialog keys={newBadgeKeys} />

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            Zincirlerin{" "}
            <span className="text-sm font-normal text-muted-foreground tabular-nums">
              {chains.length}/{limit}
            </span>
          </h2>
          {!atLimit && chains.length > 0 && (
            <Link
              href="/chains/new"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 text-sm font-medium outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-ring"
            >
              <LuPlus className="size-4" aria-hidden />
              Yeni
            </Link>
          )}
        </div>

        {chains.length === 0 ? (
          <div
            className="space-y-4 rounded-3xl border border-dashed p-6 text-center"
            style={{ backgroundColor: "color-mix(in oklab, var(--card) 70%, transparent)" }}
          >
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/5 text-muted-foreground">
              <LuLink2 className="size-7" aria-hidden />
            </span>
            <div className="space-y-1">
              <p className="text-lg font-semibold">İlk zincirini başlat</p>
              <p className="text-sm text-muted-foreground">
                Bir alışkanlık seç, her gün bir halka ekle ve zinciri kırma.
              </p>
            </div>
            <Button
              size="lg"
              className="h-12 w-full rounded-xl text-base"
              render={<Link href="/chains/new" />}
              nativeButton={false}
            >
              Zincir oluştur
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {chains.map((chain, i) => (
              <ChainCard
                key={chain.id}
                chain={chain}
                doneToday={doneFlags[i]}
                jokersUsed={jokersUsed.get(chain.id) ?? 0}
                jokerUsedYesterday={jokerYesterday.has(chain.id)}
              />
            ))}
          </div>
        )}

        {atLimit && (
          <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
            {profile.plan === "max"
              ? `En fazla ${limit} aktif zincirin olabilir. Yeni zincir için birini arşivle.`
              : `${profile.plan === "pro" ? "Pro" : "Ücretsiz"} planda ${limit} zincir hakkın var. Daha fazlası için planını yükseltmen gerekir (yakında).`}
          </p>
        )}
      </section>
    </>
  );
}
