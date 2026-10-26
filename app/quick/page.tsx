import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/bottom-nav";
import { QuickCheckin, type QuickChain } from "@/components/quick-checkin";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayIn, weekDoneCount, weekStartOf, type Chain } from "@/lib/chains";

export const metadata = { title: "Hızlı tamamla" };

export default function QuickPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-4 pt-8 pb-28">
        <h1 className="text-2xl font-semibold tracking-tight">Hızlı tamamla</h1>
        <Suspense fallback={<p className="text-sm text-muted-foreground">Yükleniyor...</p>}>
          <QuickList />
        </Suspense>
      </main>
      <BottomNav active="home" />
    </>
  );
}

async function QuickList() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  // Kaçırılan günleri (joker / kırılma) işleyip güncel zincirleri alır.
  const { data } = await supabase.rpc("settle_my_chains");
  const chains: Chain[] = data ?? [];
  const today = todayIn(profile.timezone);

  const { data: weekCheckIns } = await supabase
    .from("check_ins")
    .select("chain_id, day, is_joker")
    .eq("user_id", profile.id)
    .gte("day", weekStartOf(today));

  const items: QuickChain[] = chains.map((chain) => ({
    id: chain.id,
    title: chain.title,
    color: chain.color,
    kind: chain.kind,
    done: chain.current_length > 0 && chain.last_day !== null && chain.last_day >= today,
    progress: chain.goal_per_week
      ? `${Math.min(weekDoneCount(weekCheckIns ?? [], chain.id), chain.goal_per_week)}/${chain.goal_per_week} gün`
      : null,
  }));

  if (items.length === 0) {
    return (
      <div className="space-y-3 rounded-3xl border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">Henüz bir zincirin yok.</p>
        <Button render={<Link href="/chains/new" />} nativeButton={false}>
          Zincir oluştur
        </Button>
      </div>
    );
  }

  return <QuickCheckin chains={items} />;
}
