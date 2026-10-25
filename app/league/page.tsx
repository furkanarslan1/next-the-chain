import { Suspense } from "react";
import { ListSkeleton } from "@/components/skeletons";
import Link from "next/link";
import { LuTrophy } from "react-icons/lu";
import { BottomNav } from "@/components/bottom-nav";
import { Button } from "@/components/ui/button";
import { LeagueVisibility } from "@/components/league-visibility";
import { ReportUser } from "@/components/report-user";
import { RankMini } from "@/components/profile/rank-avatar";
import { requireProfile } from "@/lib/auth";
import { rankFor } from "@/lib/ranks";
import { OUTCOME_LABEL, closesIn, tierInfo } from "@/lib/leagues";
import { createClient } from "@/lib/supabase/server";

export default function LeaguePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28">
        <div className="space-y-1">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Geri
          </Link>
          <h1 className="text-xl font-semibold">Lig</h1>
        </div>
        <Suspense fallback={<ListSkeleton />}>
          <LeagueContent />
        </Suspense>
      </main>
      <BottomNav active="home" />
    </>
  );
}

async function LeagueContent() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // Kendi zincirlerimi güncelle ki puanım doğru çıksın.
  await supabase.rpc("settle_my_chains");

  const [standings, history] = await Promise.all([
    supabase.rpc("league_standings"),
    supabase.rpc("my_league_history"),
  ]);
  const rows = standings.data ?? [];

  if (rows.length === 0) {
    return (
      <>
        <section className="space-y-3 rounded-2xl border border-dashed p-6 text-center">
          <p className="font-medium">Lige katılmak için bir zincir aç</p>
          <p className="text-sm text-muted-foreground">
            Her hafta yapman gereken halkaların yüzde kaçını tamamladığına göre
            aynı ligdeki oyuncularla yarışırsın.
          </p>
          <Button render={<Link href="/chains/new" />} nativeButton={false}>
            Zincir oluştur
          </Button>
        </section>
        <LeagueVisibility visible={profile.league_visible} />
      </>
    );
  }

  const me = rows.find((r) => r.lg_is_me) ?? rows[0];
  const info = tierInfo(me.lg_tier);
  const scored = rows.filter((r) => r.lg_score !== null).length;
  const k = me.lg_promote;
  const remaining = closesIn(me.lg_week_start);

  function zone(place: number, score: number | null) {
    if (score === null || k === 0) return null;
    if (place <= k && score >= 50 && me.lg_tier < 5) return "promote";
    if (place > scored - k && score < 30 && me.lg_tier > 1) return "demote";
    return null;
  }

  return (
    <>
      <section
        className="flex items-center gap-4 rounded-2xl border p-4"
        style={{ backgroundColor: `${info.color}14`, borderColor: `${info.color}55` }}
      >
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${info.color}2b`, color: info.color }}
        >
          <LuTrophy className="size-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-lg font-semibold" style={{ color: info.color }}>
            {info.name} Lig
          </p>
          <p className="text-sm text-muted-foreground">
            {me.lg_score === null
              ? "Bu hafta henüz puanın yok"
              : `${me.lg_place}. sıradasın · %${me.lg_score}`}
          </p>
          <p className="text-xs text-muted-foreground">{remaining}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="font-medium">Grubun</h2>
          <p className="text-xs text-muted-foreground">{rows.length} oyuncu</p>
        </div>
        <ol className="divide-y overflow-hidden rounded-xl border">
          {rows.map((row) => {
            const z = zone(row.lg_place, row.lg_score);
            return (
              <li
                key={row.lg_user_id}
                className={`relative flex items-center gap-3 p-3 ${
                  row.lg_is_me ? "bg-muted/60" : ""
                }`}
              >
                {z && (
                  <span
                    aria-hidden
                    className={`absolute inset-y-0 left-0 w-1 ${
                      z === "promote" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                )}
                <span className="w-6 text-center text-sm tabular-nums text-muted-foreground">
                  {row.lg_place}
                </span>
                <RankMini rank={rankFor(row.lg_active_days).current.index} name={rankFor(row.lg_active_days).current.name} size={30} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="truncate text-sm font-medium">
                    {row.lg_username ? (
                      `@${row.lg_username}`
                    ) : (
                      <span className="italic text-muted-foreground">
                        Gizli oyuncu
                      </span>
                    )}
                    {row.lg_is_me && (
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        sen
                      </span>
                    )}
                  </p>
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-muted"
                    role="img"
                    aria-label={`Puan ${row.lg_score ?? 0} / 100`}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${row.lg_score ?? 0}%`,
                        backgroundColor: info.color,
                      }}
                    />
                  </div>
                </div>
                <span className="w-12 text-right text-sm tabular-nums">
                  {row.lg_score === null ? "—" : `%${row.lg_score}`}
                </span>
                {!row.lg_is_me && row.lg_username && (
                  <ReportUser userId={row.lg_user_id} username={row.lg_username} />
                )}
              </li>
            );
          })}
        </ol>
        {k > 0 && (
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-1 rounded bg-emerald-500" />
              Terfi bölgesi (ilk {k}, en az %50)
            </span>
            <span className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-1 rounded bg-red-500" />
              Düşme bölgesi (son {k}, %30&apos;un altı)
            </span>
          </p>
        )}
      </section>

      <details className="rounded-xl border p-3 text-sm">
        <summary className="cursor-pointer select-none font-medium">
          Lig nasıl çalışır?
        </summary>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            Puanın, hafta boyunca yapman gereken halkaların yüzde kaçını
            tamamladığındır. Joker günleri hesaba katılmaz, zincir sayın
            avantaj sağlamaz.
          </li>
          <li>
            Hafta Pazartesi başlar, sonuçlar sonraki Pazartesi öğleden sonra
            kapanır.
          </li>
          <li>
            Gruptaki ilk oyuncular (en az %50 ile) üst lige çıkar, son
            oyuncular (%30&apos;un altında) alt lige düşer.
          </li>
          <li>Hafta içinde silinen zincirler de puana yansır.</li>
        </ul>
      </details>

      {(history.data ?? []).length > 0 && (
        <section className="space-y-3">
          <h2 className="font-medium">Geçen haftalar</h2>
          <ul className="divide-y rounded-xl border">
            {(history.data ?? []).slice(0, 5).map((h) => (
              <li
                key={h.week_start}
                className="flex items-center justify-between gap-3 p-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="block font-medium">
                    {tierInfo(h.tier).name} Lig · {h.place}. sıra
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {h.week_start} haftası{h.score !== null ? ` · %${h.score}` : ""}
                  </span>
                </span>
                <span
                  className={`shrink-0 text-xs ${
                    h.outcome === "promoted"
                      ? "text-emerald-400"
                      : h.outcome === "demoted"
                        ? "text-red-400"
                        : "text-muted-foreground"
                  }`}
                >
                  {OUTCOME_LABEL[h.outcome]}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <LeagueVisibility visible={profile.league_visible} />
    </>
  );
}
