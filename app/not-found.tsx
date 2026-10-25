import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-4 px-4 py-12 text-center">
      <h1 className="text-xl font-semibold">Sayfa bulunamadı</h1>
      <p className="text-sm text-muted-foreground">
        Aradığın sayfa yok ya da erişimin yok.
      </p>
      <Button render={<Link href="/" />} nativeButton={false}>
        Zincirlerine dön
      </Button>
    </main>
  );
}
