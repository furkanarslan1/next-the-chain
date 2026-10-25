"use client";

import { useEffect } from "react";
import { updateTimezone } from "@/app/chains/actions";

// "Gün" kullanıcının saat dilimine göre hesaplandığı için cihazın dilimini profile yazar.
export function TimezoneSync({ current }: { current: string }) {
  useEffect(() => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (detected && detected !== current) void updateTimezone(detected);
  }, [current]);
  return null;
}
