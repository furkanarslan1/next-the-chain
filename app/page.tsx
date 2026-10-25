import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChainCard } from "@/components/chain-card";
import { TimezoneSync } from "@/components/timezone-sync";
import { signOut } from "@/app/actions";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayIn, type Chain } from "@/lib/chains";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
        <Dashboard />
      </Suspense>
    </main>
  );
}

async function Dashboard() {
  const { user, profile } = await requireProfile();
  const supabase = await createClient();

  const { data: active } = await supabase
    .from("chains")
    .select("id")
    .eq("owner_id", user.id)
    .is("archived_at", null)
    .order("created_at");

  // Kaçırılan günleri joker hakkıyla kapatır veya zinciri sıfırlar.
  const settled = await Promise.all(
    (active ?? []).map((c) =>
      supabase.rpc("settle_chain", { p_chain_id: c.id }),
    ),
  );
  const chains = settled
    .map((r) => r.data as Chain | null)
    .filter((c): c is Chain => c !== null);

  const today = todayIn(profile.timezone);

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
        <form action={signOut}>
          <Button type="submit" variant="ghost" size="sm">
            Çıkış
          </Button>
        </form>
      </header>

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
              doneToday={chain.last_day === today && chain.current_length > 0}
            />
          ))}
        </div>
      )}

      <Button
        size="lg"
        className="h-12 text-base"
        variant={chains.length === 0 ? "default" : "outline"}
        render={<Link href="/chains/new" />}
        nativeButton={false}
      >
        Yeni zincir
      </Button>
    </>
  );
}
