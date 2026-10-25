import { WEEKDAY_LABELS, weekDates, weekStartOf } from "@/lib/chains";

// Isı haritası satırı (my_heatmap): o gün tamamlanan zincir ve kullanılan joker sayısı.
export type HeatRow = { hm_day: string; hm_done: number; hm_joker: number };

export type HeatCell = {
  date: string;
  done: number;
  joker: boolean;
  // 0 boş, 1-4 yoğunluk (tamamlanan zincir sayısı, 4 ve üstü aynı).
  level: 0 | 1 | 2 | 3 | 4;
  future: boolean;
  today: boolean;
};

function addDays(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function levelFor(done: number): HeatCell["level"] {
  if (done <= 0) return 0;
  return Math.min(done, 4) as HeatCell["level"];
}

// Son `weeks` haftayı sütun sütun (Pazartesi başlangıçlı) döndürür; en sağ sütun bu hafta.
export function buildHeatmap(rows: HeatRow[], today: string, weeks = 16): HeatCell[][] {
  const byDay = new Map(rows.map((r) => [r.hm_day, r]));
  const thisWeek = weekStartOf(today);
  const start = addDays(thisWeek, -(weeks - 1) * 7);

  return Array.from({ length: weeks }, (_, w) =>
    weekDates(addDays(start, w * 7)).map((date) => {
      const row = byDay.get(date);
      const done = row?.hm_done ?? 0;
      return {
        date,
        done,
        joker: (row?.hm_joker ?? 0) > 0,
        level: levelFor(done),
        future: date > today,
        today: date === today,
      };
    }),
  );
}

export type WeeklySummary = {
  doneThisWeek: number;
  activeDaysThisWeek: number;
  jokerDaysThisWeek: number;
  doneLastWeek: number;
  activeDaysLastWeek: number;
  // Geçen haftaya göre değişim (%); geçen hafta 0 ise null.
  deltaPercent: number | null;
  // Bu hafta günlük tamamlanan sayısı (Pzt..Paz; gelecek günler 0).
  perDay: number[];
  bestDay: { label: string; done: number } | null;
};

export function weeklySummary(rows: HeatRow[], today: string): WeeklySummary {
  const byDay = new Map(rows.map((r) => [r.hm_day, r]));
  const thisWeek = weekDates(weekStartOf(today));
  const lastWeek = weekDates(addDays(weekStartOf(today), -7));

  const total = (days: string[]) => days.reduce((sum, d) => sum + (byDay.get(d)?.hm_done ?? 0), 0);
  const active = (days: string[]) => days.filter((d) => (byDay.get(d)?.hm_done ?? 0) > 0).length;

  const perDay = thisWeek.map((d) => (d > today ? 0 : (byDay.get(d)?.hm_done ?? 0)));
  const doneLastWeek = total(lastWeek);
  const doneThisWeek = perDay.reduce((a, b) => a + b, 0);

  const bestIndex = perDay.reduce((best, v, i) => (v > perDay[best] ? i : best), 0);

  return {
    doneThisWeek,
    activeDaysThisWeek: perDay.filter((v) => v > 0).length,
    jokerDaysThisWeek: thisWeek.filter((d) => d <= today && (byDay.get(d)?.hm_joker ?? 0) > 0).length,
    doneLastWeek,
    activeDaysLastWeek: active(lastWeek),
    deltaPercent: doneLastWeek === 0 ? null : Math.round(((doneThisWeek - doneLastWeek) / doneLastWeek) * 100),
    perDay,
    bestDay: perDay[bestIndex] > 0 ? { label: WEEKDAY_LABELS[bestIndex], done: perDay[bestIndex] } : null,
  };
}
