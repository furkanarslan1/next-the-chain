import { describe, expect, it } from "vitest";
import { copyFor, dailyCopy, riskCopy } from "@/lib/notification-copy";
import { TIERS, closesIn, formatRemaining, tierInfo, weekCloseAt } from "@/lib/leagues";

describe("lig yardımcıları", () => {
  it("tierInfo sınırları aşmaz", () => {
    expect(tierInfo(0).name).toBe(TIERS[0].name);
    expect(tierInfo(99).name).toBe(TIERS[TIERS.length - 1].name);
    expect(tierInfo(3).name).toBe("Altın");
  });

  it("hafta Pazartesi 12:00 UTC'de kapanır", () => {
    expect(new Date(weekCloseAt("2026-10-19")).toISOString()).toBe("2026-10-26T12:00:00.000Z");
  });

  it("kalan süre okunur biçimde yazılır", () => {
    expect(formatRemaining(0)).toBe("Hafta kapanıyor");
    expect(formatRemaining(30 * 60_000)).toBe("1 saatten az kaldı");
    expect(formatRemaining(5 * 3_600_000)).toBe("5 saat kaldı");
    expect(formatRemaining(51 * 3_600_000)).toBe("2 gün 3 saat kaldı");
    expect(closesIn("2020-01-06")).toBe("Hafta kapanıyor");
  });
});

describe("bildirim metinleri", () => {
  it("olay türlerinden metin ve adres üretir", () => {
    expect(copyFor("friend_request", { from: "ali" })?.body).toContain("@ali");
    expect(copyFor("friend_accepted", { from: "ali" })?.url).toBe("/friends");
    expect(copyFor("group_invite", { owner: "ali", title: "Spor" })?.body).toContain("Spor");
    expect(copyFor("league_result", { outcome: "promoted", tier: 3, place: 2 })?.title).toBe("Lige terfi ettin");
    expect(copyFor("league_result", { outcome: "demoted", tier: 1, place: 9 })?.title).toBe("Bir alt lige düştün");
  });

  it("bilinmeyen tür null döner, eksik veri güvenli çalışır", () => {
    expect(copyFor("bilinmeyen", {})).toBeNull();
    expect(copyFor("friend_request", {})?.body).toContain("@Biri");
  });

  it("kullanıcı verisini 60 karaktere kırpar", () => {
    const body = copyFor("friend_request", { from: "x".repeat(200) })?.body ?? "";
    expect(body.length).toBeLessThan(120);
  });

  it("günlük ve kırılma uyarısı metinleri tekil/çoğul ayırır", () => {
    expect(dailyCopy(1, 0).title).toBe("Zincirin bugün bekliyor");
    expect(dailyCopy(3, 12).title).toBe("3 zincirin bugün bekliyor");
    expect(dailyCopy(1, 12).body).toContain("12 halkalık");
    expect(riskCopy(2, 5).body).toContain("2 zincirin");
    expect(riskCopy(1, 5).body).toContain("5 halkalık");
  });
});
