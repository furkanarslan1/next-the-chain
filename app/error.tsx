"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Bir şeyler ters gitti</h1>
      <p className="text-sm text-muted-foreground">
        Sayfa yüklenemedi. Tekrar deneyebilirsin; sorun sürerse biraz sonra
        yeniden dene.
      </p>
      <Button onClick={reset}>Tekrar dene</Button>
    </main>
  );
}
