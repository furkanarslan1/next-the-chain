// Rütbeler: "aktif gün" sayısından (günde en az bir halka eklenen gün) hesaplanır, hiç düşmez.
// Eşikler ve adlar sadece burada tutulur; veritabanı yalnızca sayacı (profiles.active_days) saklar.
export type Rank = {
  index: number;
  name: string;
  // Bu rütbeye ulaşmak için gereken en az aktif gün.
  min: number;
  color: string;
  blurb: string;
};

const DEFINITIONS: Omit<Rank, "index">[] = [
  { name: "Çaylak", min: 0, color: "#d8cfc0", blurb: "Yolculuğa yeni başladın." },
  { name: "Çırak", min: 10, color: "#d58a56", blurb: "On gün! Zincir tutmayı öğreniyorsun." },
  { name: "Kalfa", min: 30, color: "#a9b2bc", blurb: "Bir ay boyunca vazgeçmedin." },
  { name: "Usta", min: 50, color: "#5aa9e6", blurb: "Elin artık işe alıştı." },
  { name: "Üstat", min: 100, color: "#ffb020", blurb: "Yüz gün: istikrar senin işin." },
  { name: "Bilge", min: 200, color: "#9db4ff", blurb: "Başkalarına yol gösterecek kadar tecrübelisin." },
  { name: "Efsane", min: 365, color: "#ff6a3d", blurb: "Bir yıl. Bu artık bir alışkanlık değil, kimlik." },
  { name: "Sonsuz Zincir", min: 1000, color: "#f472b6", blurb: "Bin gün. Zincirin hiç bitmiyor." },
];

export const RANKS: Rank[] = DEFINITIONS.map((rank, index) => ({ ...rank, index }));

export type RankInfo = {
  current: Rank;
  next: Rank | null;
  // Mevcut rütbeden sonrakine ilerleme (0-1); son rütbede 1.
  progress: number;
  // Sonraki rütbeye kalan aktif gün; son rütbede 0.
  daysToNext: number;
};

export function rankFor(activeDays: number): RankInfo {
  const days = Math.max(0, Math.floor(activeDays));
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (days >= rank.min) current = rank;
  }
  const next = RANKS[current.index + 1] ?? null;
  if (!next) return { current, next: null, progress: 1, daysToNext: 0 };

  const span = next.min - current.min;
  return {
    current,
    next,
    progress: Math.min((days - current.min) / span, 1),
    daysToNext: next.min - days,
  };
}
