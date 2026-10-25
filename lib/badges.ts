export type BadgeGroup = "streak" | "total" | "social" | "league" | "special";

export type BadgeDef = {
  key: string;
  title: string;
  description: string;
  group: BadgeGroup;
  // Kilometre taşı rozetleri için hedef ve ilerleme kaynağı.
  target?: number;
  progress?: "best" | "total";
};

export const GROUP_COLOR: Record<BadgeGroup, string> = {
  streak: "#ff6a3d",
  total: "#4d8dff",
  social: "#2fd27c",
  league: "#ffb020",
  special: "#9b7bff",
};

export const BADGES: BadgeDef[] = [
  { key: "first_link", title: "İlk halka", description: "İlk halkanı ekledin.", group: "special", target: 1, progress: "total" },
  { key: "streak_7", title: "7 gün", description: "Bir zinciri 7 gün kırmadan sürdürdün.", group: "streak", target: 7, progress: "best" },
  { key: "streak_30", title: "30 gün", description: "Bir zincir, tam bir ay.", group: "streak", target: 30, progress: "best" },
  { key: "streak_100", title: "100 gün", description: "Yüz gün üst üste.", group: "streak", target: 100, progress: "best" },
  { key: "streak_365", title: "Bir yıl", description: "365 gün kesintisiz.", group: "streak", target: 365, progress: "best" },
  { key: "total_100", title: "100 halka", description: "Toplam 100 halka ekledin.", group: "total", target: 100, progress: "total" },
  { key: "total_500", title: "500 halka", description: "Toplam 500 halka ekledin.", group: "total", target: 500, progress: "total" },
  { key: "total_1000", title: "1000 halka", description: "Toplam 1000 halka ekledin.", group: "total", target: 1000, progress: "total" },
  { key: "first_friend", title: "İlk arkadaş", description: "İlk arkadaşını ekledin.", group: "social" },
  { key: "first_group", title: "Takım ruhu", description: "En az bir arkadaşınla ortak bir zincire katıldın.", group: "social" },
  { key: "comeback", title: "Geri dönüş", description: "Zincirin kırıldı, sen 7 gün üst üste yeniden kurdun.", group: "special" },
  { key: "first_promotion", title: "Yükseliş", description: "İlk kez bir üst lige çıktın.", group: "league" },
  { key: "perfect_week", title: "Kusursuz hafta", description: "Bir lig haftasını %100 ile bitirdin.", group: "league" },
];

export const BADGE_KEYS = BADGES.map((b) => b.key);

export function badgeByKey(key: string) {
  return BADGES.find((b) => b.key === key);
}
