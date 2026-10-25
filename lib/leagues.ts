export const TIERS = [
  { name: "Bronz", color: "#cd7f32" },
  { name: "Gümüş", color: "#b8c2d0" },
  { name: "Altın", color: "#ffb020" },
  { name: "Platin", color: "#4dd0e1" },
  { name: "Elmas", color: "#8aa4ff" },
] as const;

export function tierInfo(tier: number) {
  return TIERS[Math.min(Math.max(tier, 1), TIERS.length) - 1];
}

// Lig haftası Pazartesi 00:00 UTC'de başlar, sonuçlar sonraki Pazartesi 12:00 UTC'de kapanır.
export function weekCloseAt(weekStart: string) {
  return Date.parse(`${weekStart}T00:00:00Z`) + 7 * 86_400_000 + 12 * 3_600_000;
}

// Haftanın kapanışına kalan süre, okunur biçimde.
export function closesIn(weekStart: string) {
  return formatRemaining(weekCloseAt(weekStart) - Date.now());
}

export function formatRemaining(ms: number) {
  if (ms <= 0) return "Hafta kapanıyor";
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(hours / 24);
  if (days >= 1) return `${days} gün ${hours % 24} saat kaldı`;
  if (hours >= 1) return `${hours} saat kaldı`;
  return "1 saatten az kaldı";
}

export const OUTCOME_LABEL: Record<string, string> = {
  promoted: "Terfi ettin",
  demoted: "Düştün",
  stayed: "Ligde kaldın",
};
