import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { ChainCard } from "@/components/chain-card";
import { LeagueCard } from "@/components/league-card";
import { NewBadgeDialog } from "@/components/new-badge-dialog";
import { BADGES } from "@/lib/badges";
import { TimezoneSync } from "@/components/timezone-sync";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { closesIn } from "@/lib/leagues";
import {
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

  return (
    <>
      <TimezoneSync current={profile.timezone} />
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">@{profile.username}</h1>
          <p className="text-sm text-muted-foreground">
            Toplam {profile.total_completed} halka
          </p>
        </div>
      </header>

      {myLeague && (
        <LeagueCard
          tier={myLeague.lg_tier}
          place={myLeague.lg_place}
          size={myLeague.lg_size}
          score={myLeague.lg_score}
          remaining={closesIn(myLeague.lg_week_start)}
        />
      )}

      <Link
        href="/badges"
        className="flex items-center justify-between rounded-2xl border p-3 text-sm outline-none transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="font-medium">Rozetler</span>
        <span className="text-muted-foreground">
          {(badges ?? []).length} / {BADGES.length} <span aria-hidden>›</span>
        </span>
      </Link>

      <NewBadgeDialog keys={newBadgeKeys} />

      {chains.length === 0 ? (
        <section className="space-y-3 rounded-2xl border border-dashed p-6 text-center">
          <p className="font-medium">Henüz zincirin yok</p>
          <p className="text-sm text-muted-foreground">
            İlk zincirini başlat ve bugün ilk halkayı ekle.
          </p>
        </section>
      ) : (
        <div className="space-y-4">
          {chains.map((chain) => (
            <ChainCard
              key={chain.id}
              chain={chain}
              doneToday={
                chain.last_day !== null &&
                chain.last_day >= today &&
                chain.current_length > 0
              }
              jokersUsed={jokersUsed.get(chain.id) ?? 0}
              jokerUsedYesterday={jokerYesterday.has(chain.id)}
            />
          ))}
        </div>
      )}

      {chains.length >= limit ? (
        <p className="rounded-2xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          {profile.plan === "max"
            ? `En fazla ${limit} aktif zincirin olabilir. Yeni zincir için birini arşivle.`
            : `${profile.plan === "pro" ? "Pro" : "Ücretsiz"} planda ${limit} zincir hakkın var. Daha fazlası için planını yükseltmen gerekir (yakında).`}
        </p>
      ) : (
        <Button
          size="lg"
          className="h-12 text-base"
          variant={chains.length === 0 ? "default" : "outline"}
          render={<Link href="/chains/new" />}
          nativeButton={false}
        >
          Yeni zincir
        </Button>
      )}
    </>
  );
}
