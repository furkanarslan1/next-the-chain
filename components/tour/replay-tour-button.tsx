"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { restartTour } from "@/app/tour/actions";

// Ayarlar'da: turu sıfırlayıp ana sayfada yeniden başlatır.
export function ReplayTourButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await restartTour();
          router.push("/");
        })
      }
    >
      Tanıtım turunu tekrar göster
    </Button>
  );
}
