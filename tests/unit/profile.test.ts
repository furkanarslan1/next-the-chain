import { describe, expect, it } from "vitest";
import { RANKS, rankFor } from "@/lib/ranks";
import { buildHeatmap, levelFor, weeklySummary, type HeatRow } from "@/lib/profile-stats";

describe("rütbeler", () => {
  it("eşikler 0'dan başlar, kesin artar ve adlar benzersizdir", () => {
    expect(RANKS[0].min).toBe(0);
    for (let i = 1; i < RANKS.length; i++) expect(RANKS[i].min).toBeGreaterThan(RANKS[i - 1].min);
    expect(new Set(RANKS.map((r) => r.name)).size).toBe(RANKS.length);
    for (const r of RANKS) expect(r.color).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("aktif güne göre doğru rütbeyi seçer", () => {
    expect(rankFor(0).current.name).toBe("Çaylak");
    expect(rankFor(9).current.name).toBe("Çaylak");
    expect(rankFor(10).current.name).toBe("Çırak");
    expect(rankFor(49).current.name).toBe("Kalfa");
    expect(rankFor(50).current.name).toBe("Usta");
    expect(rankFor(365).current.name).toBe("Efsane");
    expect(rankFor(99999).current.name).toBe("Sonsuz Zincir");
  });

  it("ilerleme ve kalan gün doğru hesaplanır", () => {
    const info = rankFor(40); // Kalfa (30) -> Usta (50)
    expect(info.next?.name).toBe("Usta");
    expect(info.daysToNext).toBe(10);
    expect(info.progress).toBeCloseTo(0.5, 5);
    expect(rankFor(0).progress).toBe(0);
  });

  it("son rütbede sonraki yoktur ve ilerleme tamdır", () => {
    const info = rankFor(5000);
    expect(info.next).toBeNull();
    expect(info.progress).toBe(1);
    expect(info.daysToNext).toBe(0);
  });

  it("negatif ve kesirli girdiyi güvenle işler", () => {
    expect(rankFor(-5).current.index).toBe(0);
    expect(rankFor(10.9).current.index).toBe(1);
  });
});

describe("ısı haritası", () => {
  // 2026-10-25 Pazar; bu hafta 19-25 Ekim.
  const today = "2026-10-25";
  const rows: HeatRow[] = [
    { hm_day: "2026-10-25", hm_done: 2, hm_joker: 0 },
    { hm_day: "2026-10-24", hm_done: 5, hm_joker: 0 },
    { hm_day: "2026-10-23", hm_done: 0, hm_joker: 1 },
    { hm_day: "2026-09-01", hm_done: 1, hm_joker: 0 },
  ];

  it("yoğunluk seviyeleri 0-4 aralığındadır", () => {
    expect([0, 1, 2, 3, 4, 9].map(levelFor)).toEqual([0, 1, 2, 3, 4, 4]);
  });

  it("16 hafta x 7 gün üretir, son sütun bu haftadır", () => {
    const weeks = buildHeatmap(rows, today, 16);
    expect(weeks).toHaveLength(16);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
    expect(weeks[15][0].date).toBe("2026-10-19");
    expect(weeks[15][6].date).toBe("2026-10-25");
    expect(weeks[0][0].date).toBe("2026-07-06");
  });

  it("günleri doğru işaretler", () => {
    const flat = buildHeatmap(rows, today, 16).flat();
    const find = (d: string) => flat.find((c) => c.date === d)!;
    expect(find("2026-10-25")).toMatchObject({ done: 2, level: 2, today: true, future: false });
    expect(find("2026-10-24").level).toBe(4);
    expect(find("2026-10-23")).toMatchObject({ done: 0, joker: true, level: 0 });
    expect(find("2026-10-20")).toMatchObject({ done: 0, joker: false, level: 0 });
  });

  it("bugünden sonraki günler gelecek sayılır", () => {
    const flat = buildHeatmap(rows, "2026-10-21", 4).flat();
    expect(flat.find((c) => c.date === "2026-10-22")?.future).toBe(true);
    expect(flat.find((c) => c.date === "2026-10-21")?.future).toBe(false);
  });
});

describe("haftalık özet", () => {
  const today = "2026-10-25"; // Pazar
  it("bu ve geçen haftayı karşılaştırır", () => {
    const rows: HeatRow[] = [
      { hm_day: "2026-10-19", hm_done: 1, hm_joker: 0 },
      { hm_day: "2026-10-21", hm_done: 3, hm_joker: 0 },
      { hm_day: "2026-10-22", hm_done: 0, hm_joker: 1 },
      { hm_day: "2026-10-25", hm_done: 2, hm_joker: 0 },
      { hm_day: "2026-10-13", hm_done: 2, hm_joker: 0 },
      { hm_day: "2026-10-14", hm_done: 2, hm_joker: 0 },
    ];
    const s = weeklySummary(rows, today);
    expect(s.doneThisWeek).toBe(6);
    expect(s.activeDaysThisWeek).toBe(3);
    expect(s.jokerDaysThisWeek).toBe(1);
    expect(s.doneLastWeek).toBe(4);
    expect(s.activeDaysLastWeek).toBe(2);
    expect(s.deltaPercent).toBe(50);
    expect(s.bestDay).toEqual({ label: "Çar", done: 3 });
    expect(s.perDay).toEqual([1, 0, 3, 0, 0, 0, 2]);
  });

  it("geçen hafta boşsa değişim null, hiç veri yoksa en iyi gün yok", () => {
    expect(weeklySummary([], today)).toMatchObject({ doneThisWeek: 0, deltaPercent: null, bestDay: null });
  });

  it("gelecek günleri saymaz", () => {
    const rows: HeatRow[] = [{ hm_day: "2026-10-24", hm_done: 9, hm_joker: 0 }];
    expect(weeklySummary(rows, "2026-10-21").doneThisWeek).toBe(0);
  });
});
