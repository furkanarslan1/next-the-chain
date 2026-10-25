import { describe, expect, it } from "vitest";
import {
  PLAN_LIMITS,
  planLimit,
  spiralLayout,
  todayIn,
  weekDates,
  weekStartOf,
  yesterdayOf,
} from "@/lib/chains";

describe("tarih yardımcıları", () => {
  it("haftanın başlangıcı Pazartesi'dir", () => {
    expect(weekStartOf("2026-10-19")).toBe("2026-10-19"); // Pazartesi
    expect(weekStartOf("2026-10-21")).toBe("2026-10-19"); // Çarşamba
    expect(weekStartOf("2026-10-25")).toBe("2026-10-19"); // Pazar
    expect(weekStartOf("2026-10-26")).toBe("2026-10-26"); // sonraki Pazartesi
  });

  it("ay ve yıl sınırlarını doğru geçer", () => {
    expect(yesterdayOf("2026-03-01")).toBe("2026-02-28");
    expect(yesterdayOf("2027-01-01")).toBe("2026-12-31");
    expect(weekStartOf("2026-11-01")).toBe("2026-10-26"); // Pazar
  });

  it("weekDates 7 ardışık gün döndürür", () => {
    const days = weekDates("2026-10-19");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2026-10-19");
    expect(days[6]).toBe("2026-10-25");
  });

  it("todayIn YYYY-MM-DD biçiminde döner", () => {
    expect(todayIn("Europe/Istanbul")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(todayIn("UTC")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("plan limitleri", () => {
  it("bilinmeyen plan ücretsiz sayılır", () => {
    expect(planLimit("free")).toBe(PLAN_LIMITS.free);
    expect(planLimit("bilinmeyen")).toBe(PLAN_LIMITS.free);
    expect(planLimit("max")).toBeGreaterThan(planLimit("pro"));
    expect(planLimit("pro")).toBeGreaterThan(planLimit("free"));
  });
});

describe("spiralLayout", () => {
  it("0 halka için boş döner", () => {
    expect(spiralLayout(0).links).toHaveLength(0);
  });

  it("halka sayısı kadar nokta üretir ve aynı girdi aynı sonucu verir", () => {
    const a = spiralLayout(42);
    const b = spiralLayout(42);
    expect(a.links).toHaveLength(42);
    expect(a).toEqual(b);
  });

  it.each([1, 2, 3, 5, 9, 42, 200, 365])("%i halkalı spiral alana sığar ve ortalanır", (n) => {
    const { links, scale } = spiralLayout(n);
    const half = scale / 2;
    const xs = links.flatMap((l) => {
      const dx = half * Math.cos((l.angle * Math.PI) / 180);
      return [l.x - dx, l.x + dx];
    });
    const ys = links.flatMap((l) => {
      const dy = half * Math.sin((l.angle * Math.PI) / 180);
      return [l.y - dy, l.y + dy];
    });
    // Halka uçlarına göre ortalanmış olmalı.
    expect((Math.min(...xs) + Math.max(...xs)) / 2).toBeCloseTo(0, 5);
    expect((Math.min(...ys) + Math.max(...ys)) / 2).toBeCloseTo(0, 5);
    // 100x100 görünüm alanının dışına taşmamalı (küçük pay).
    expect(Math.max(...xs.map(Math.abs))).toBeLessThanOrEqual(52);
    expect(Math.max(...ys.map(Math.abs))).toBeLessThanOrEqual(52);
  });

  it("çok halkada ölçek küçülür, az halkada sınırlanır", () => {
    expect(spiralLayout(365).scale).toBeLessThan(spiralLayout(10).scale);
    expect(spiralLayout(1).scale).toBeLessThanOrEqual(15);
    expect(spiralLayout(1, 46, 34).scale).toBeLessThanOrEqual(34);
  });
});
