import { Suspense } from "react";
import Link from "next/link";
import { BottomNav } from "@/components/bottom-nav";
import { ArchivedChainRow } from "@/components/archived-chain-row";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default function ArchivePage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pt-8 pb-28">
        <div className="space-y-1">
          <Link
            href="/settings"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Geri
          </Link>
          <h1 className="text-xl font-semibold">Arşivlenen zincirler</h1>
        </div>
        <Suspense fallback={<p className="text-muted-foreground">Yükleniyor…</p>}>
          <ArchiveContent />
        </Suspense>
      </main>
      <BottomNav active="settings" />
    </>
  );
}

async function ArchiveContent() {
  const { profile } = await requireProfile();
  const supabase = await createClient();

  const { data: chains } = await supabase
    .from("chains")
    .select("id, title, color, best_length, total_completed")
    .eq("owner_id", profile.id)
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Arşivdeki zincirler ilerlemez. Geri aldığında kaçırdığın günler için
        joker kullanılır; hakkın yetmezse zincirin sıfırlanır. Toplam halka
        sayın korunur.
      </p>
      {(chains ?? []).length === 0 ? (
        <p className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground">
          Arşivde zincir yok.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {(chains ?? []).map((chain) => (
            <ArchivedChainRow
              key={chain.id}
              id={chain.id}
              title={chain.title}
              color={chain.color}
              bestLength={chain.best_length}
              totalCompleted={chain.total_completed}
            />
          ))}
        </ul>
      )}
    </>
  );
}
