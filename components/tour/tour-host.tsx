"use client";

import { useState, useSyncExternalStore } from "react";
import { advanceTour } from "@/app/tour/actions";
import { ProductTour } from "@/components/tour/product-tour";
import { stepsFor } from "@/components/tour/steps";

const noopSubscribe = () => () => {};

type Props = {
  // profiles.tour_stage: 0 görülmedi, 1 genel tur bitti, 2 tamamlandı/atlandı
  stage: number;
  hasChains: boolean;
  // Başka bir pencere (örn. yeni rozet) açıkken tur başlamaz, sonraki açılışta başlar.
  blocked: boolean;
};

// Hangi turun gösterileceğine karar verir ve bitince ilerlemeyi kaydeder.
export function TourHost({ stage, hasChains, blocked }: Props) {
  // DOM'u okuyan tur sadece tarayıcıda, sayfa yüklendikten sonra bağlanır.
  const hydrated = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const [closed, setClosed] = useState(false);

  const kind =
    stage === 0 ? (hasChains ? "all" : "intro") : stage === 1 && hasChains ? "chain" : null;

  if (!hydrated || closed || blocked || !kind) return null;

  return (
    <ProductTour
      steps={stepsFor(kind, hasChains)}
      onFinish={(reason) => {
        setClosed(true);
        // Atlanırsa tamamen kapanır (2). Genel tur zinciri yokken bittiyse zincir turu bekler (1).
        void advanceTour(reason === "skip" || kind !== "intro" ? 2 : 1);
      }}
    />
  );
}
