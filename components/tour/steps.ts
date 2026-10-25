import type { Mood } from "@/components/tour/mascot";

export type TourStep = {
  id: string;
  // İlk eşleşen öğe vurgulanır; hiçbiri yoksa adım atlanır. Boşsa ortada gösterilir.
  targets?: string[];
  title: string;
  body: string;
  mood: Mood;
  // Son adımda ana düğme bir bağlantıya gidebilir.
  action?: { label: string; href: string };
};

export type TourKind = "intro" | "chain" | "all";

const sel = (name: string) => `[data-tour="${name}"]`;

export function introSteps(hasChains: boolean): TourStep[] {
  return [
    {
      id: "welcome",
      title: "Merhaba, ben Halka!",
      body: "Zincirini kırmadan sürdürmen için sana eşlik edeceğim. Önemli yerleri bir dakikada gezdireyim mi?",
      mood: "cheer",
    },
    {
      id: "create",
      targets: [sel("create-chain")],
      title: "Her şey bir zincirle başlar",
      body: "Bir alışkanlık seç (kitap okumak, spor yapmak, sigarayı bırakmak) ve zincirini oluştur. Her gün bir halka ekleyeceksin.",
      mood: "happy",
    },
    {
      id: "summary",
      targets: [sel("summary")],
      title: "Bugünün durumu",
      body: "Burada bugün kaç zincirini tamamladığını görürsün. Hepsi bitince halka yeşile döner.",
      mood: "happy",
    },
    {
      id: "league",
      targets: [sel("league")],
      title: "Lig",
      body: "Her hafta aynı seviyedeki oyuncularla yarışırsın. Düzenli ol, üst lige çık.",
      mood: "wow",
    },
    {
      id: "badges",
      targets: [sel("badges")],
      title: "Rozetler",
      body: "Kilometre taşlarına ulaştıkça rozet kazanırsın. İstersen güzel bir kartla paylaşabilirsin.",
      mood: "cheer",
    },
    {
      id: "friends",
      targets: [sel("friends")],
      title: "Arkadaşların",
      body: "Arkadaş ekle, birbirinizin ilerlemesini görün ve haftalık sıralamada yarışın.",
      mood: "happy",
    },
    {
      id: "nav",
      targets: [sel("nav")],
      title: "Alt menü",
      body: "Gruplar: arkadaşlarınla ortak zincirler. Arkadaşlar: arama ve sıralama. Ayarlar: bildirimler ve hesap.",
      mood: "happy",
    },
    {
      id: "done",
      title: hasChains ? "Hazırsın!" : "Hazırsın, başlayalım!",
      body: hasChains
        ? "Bir sorun olursa Ayarlar'dan bu turu tekrar açabilirsin."
        : "İlk zincirini oluşturalım. Sonra bugünün halkasını ekleyip sana birkaç ipucu daha göstereceğim.",
      mood: "cheer",
      action: hasChains ? undefined : { label: "İlk zincirimi oluştur", href: "/chains/new" },
    },
  ];
}

export function chainSteps(): TourStep[] {
  return [
    {
      id: "checkin",
      targets: [sel("checkin"), sel("chain-card")],
      title: "Bugünün halkası",
      body: "Her gün bu düğmeye bas. Basmazsan ve jokerin kalmadıysa zincirin kırılır.",
      mood: "happy",
    },
    {
      id: "joker",
      targets: [sel("joker")],
      title: "Joker",
      body: "Haftada 2 jokerin var. Bir günü kaçırırsan otomatik harcanır ve zincirin korunur.",
      mood: "wow",
    },
    {
      id: "share",
      targets: [sel("share")],
      title: "Paylaş",
      body: "Zincirinin güzel bir kartını arkadaşlarınla paylaş. Adının görünüp görünmeyeceğini sen seçersin.",
      mood: "happy",
    },
    {
      id: "menu",
      targets: [sel("menu")],
      title: "Diğer işlemler",
      body: "Arşivleme, silme ve nüks bildirimi bu menüde.",
      mood: "happy",
    },
    {
      id: "notify",
      title: "Son bir ipucu",
      body: "Ayarlar'dan hatırlatmaları aç; akşam halkanı eklemediysen sana haber vereyim, zincirin kırılmasın.",
      mood: "cheer",
      action: { label: "Hatırlatmaları aç", href: "/settings" },
    },
  ];
}

export function stepsFor(kind: TourKind, hasChains: boolean): TourStep[] {
  if (kind === "intro") return introSteps(hasChains);
  if (kind === "chain") return chainSteps();
  // Zinciri olan mevcut kullanıcı: genel tur (son adım hariç) + zincir turu.
  return [...introSteps(true).slice(0, -1), ...chainSteps()];
}
