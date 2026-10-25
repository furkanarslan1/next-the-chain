"use client";

import { useEffect } from "react";
import { initPwaStore } from "@/lib/pwa-store";

// Kök düzende: "yükle" olayını erkenden yakalar. Görünür bir şey çizmez.
export function PwaCapture() {
  useEffect(() => {
    initPwaStore();
  }, []);
  return null;
}
