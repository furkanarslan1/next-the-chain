import type { Database } from "@/types/database";

export type Chain = Database["public"]["Tables"]["chains"]["Row"];
export type ChainKind = "build" | "quit";

export const CHAIN_COLORS = [
  { name: "Kızıl", value: "#ff6a3d" },
  { name: "Amber", value: "#ffb020" },
  { name: "Limon", value: "#c6e03a" },
  { name: "Yeşil", value: "#2fd27c" },
  { name: "Turkuaz", value: "#22d3c5" },
  { name: "Mavi", value: "#4d8dff" },
  { name: "Mor", value: "#9b7bff" },
  { name: "Pembe", value: "#ff5fa2" },
] as const;

// Kullanıcının saat dilimine göre bugünün tarihi (YYYY-MM-DD).
export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

// Veritabanındaki plan_chain_limit() ile aynı olmalı (asıl zorlama orada).
export const PLAN_LIMITS = { free: 2, pro: 5, max: 10 } as const;
export type Plan = keyof typeof PLAN_LIMITS;

export const planLimit = (plan: string) =>
  PLAN_LIMITS[plan as Plan] ?? PLAN_LIMITS.free;

function shiftDay(day: string, delta: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export const yesterdayOf = (today: string) => shiftDay(today, -1);

// Haftanın Pazartesi'si; joker hakkı veritabanında da Pazartesi'de yenileniyor.
export function weekStartOf(today: string) {
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Pazar
  return shiftDay(today, -((dow + 6) % 7));
}

export type LinkPosition = { x: number; y: number; angle: number };

// Halkaları merkezden dışa doğru Arşimet spiraline dizer.
// Halka sayısı arttıkça ölçek küçülür; zincir her zaman 100x100 alana sığar.
export function spiralLayout(count: number, radius = 46) {
  const turnGap = 1.15; // spiral turları arası mesafe (halka boyu = 1)
  const pitch = 0.8; // ardışık halkalar arası yay uzunluğu
  const a = turnGap / (2 * Math.PI);

  const raw: LinkPosition[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.sqrt((2 * i * pitch) / a);
    const r = a * theta;
    const tx = a * Math.cos(theta) - a * theta * Math.sin(theta);
    const ty = a * Math.sin(theta) + a * theta * Math.cos(theta);
    raw.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      angle: (Math.atan2(ty, tx) * 180) / Math.PI,
    });
  }

  const maxR = Math.sqrt(2 * Math.max(count, 1) * pitch * a);
  const scale = Math.min(radius / (maxR + 0.8), 11);

  const xs = raw.map((p) => p.x * scale);
  const ys = raw.map((p) => p.y * scale);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;

  return {
    scale,
    links: raw.map((p, i) => ({ x: xs[i] - cx, y: ys[i] - cy, angle: p.angle })),
  };
}
