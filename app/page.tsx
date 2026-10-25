import { Suspense } from "react";
import { Button } from "@/components/ui/button";
import { signOut } from "@/app/actions";
import { requireProfile } from "@/lib/auth";

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
  const { profile } = await requireProfile();

  return (
    <>
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">@{profile.username}</h1>
        <form action={signOut}>
          <Button variant="ghost" size="sm">
            Çıkış
          </Button>
        </form>
      </header>
      <p className="text-sm text-muted-foreground">
        Toplam tamamlanan halka: {profile.total_completed}
      </p>
    </>
  );
}
