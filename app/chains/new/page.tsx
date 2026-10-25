import { Suspense } from "react";
import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { ChainForm } from "@/components/chain-form";

export default function NewChainPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-8">
      <div className="space-y-1">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Geri
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">Yeni zincir</h1>
      </div>
      <Suspense>
        <Guard />
      </Suspense>
    </main>
  );
}

async function Guard() {
  await requireProfile();
  return <ChainForm />;
}
