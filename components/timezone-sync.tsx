"use client";

import { useEffect } from "react";
import { updateTimezone } from "@/app/chains/actions";

// "Gün" kullanıcının saat dilimine göre hesaplandığı için cihazın dilimini profile yazar.
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!detected || detected === current) return;

    // Sunucu saat dilimi değişikliğini 24 saatte bir kabul eder; aynı oturumda tekrar deneme.
    try {
      if (sessionStorage.getItem("tz-attempt") === detected) return;
      sessionStorage.setItem("tz-attempt", detected);
    } catch {
      // sessionStorage kullanılamıyorsa yine de bir kez dene.
    }
    void updateTimezone(detected);
  }, [current]);
  return null;
}
