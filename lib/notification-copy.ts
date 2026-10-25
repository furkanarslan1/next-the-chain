import { tierInfo } from "@/lib/leagues";
import type { PushPayload } from "@/lib/push";

type Data = Record<string, unknown>;

const str = (value: unknown, fallback = "") =>
  typeof value === "string" && value ? value.slice(0, 60) : fallback;

// Gelen kutusundaki olaylardan bildirim metni üretir.
export function copyFor(kind: string, data: Data): PushPayload | null {
  switch (kind) {
    case "friend_request":
      return {
        title: "Yeni arkadaşlık isteği",
        body: `@${str(data.from, "Biri")} sana arkadaşlık isteği gönderdi.`,
        url: "/friends",
        tag: "friend_request",
      };
    case "friend_accepted":
      return {
        title: "Arkadaşlık kabul edildi",
        body: `@${str(data.from, "Biri")} isteğini kabul etti.`,
        url: "/friends",
        tag: "friend_accepted",
      };
    case "group_invite":
      return {
        title: "Ortak zincire davet edildin",
        body: `@${str(data.owner, "Biri")} seni "${str(data.title, "ortak zincir")}" grubuna davet etti.`,
        url: "/groups",
        tag: "group_invite",
      };
    case "league_result": {
      const tier = tierInfo(Number(data.tier) || 1).name;
      const place = Number(data.place) || 0;
      return data.outcome === "promoted"
        ? {
            title: "Lige terfi ettin",
            body: `${tier} Lige yükseldin. Geçen hafta ${place}. sırada bitirdin.`,
            url: "/league",
            tag: "league_result",
          }
        : {
            title: "Bir alt lige düştün",
            body: `${tier} Ligdesin. Yeni haftada geri dönebilirsin.`,
            url: "/league",
            tag: "league_result",
          };
    }
    default:
      return null;
  }
}

export function riskCopy(count: number, longest: number): PushPayload {
  return {
    title: "Zincirin kırılma riskinde",
    body:
      count > 1
        ? `${count} zincirin bugün tamamlanmazsa kırılacak, joker hakkın kalmadı.`
        : `${longest} halkalık zincirin bugün tamamlanmazsa kırılacak, joker hakkın kalmadı.`,
    url: "/",
    tag: "risk",
  };
}

export function dailyCopy(count: number, longest: number): PushPayload {
  return {
    title: count > 1 ? `${count} zincirin bugün bekliyor` : "Zincirin bugün bekliyor",
    body:
      longest > 0
        ? `${longest} halkalık zincirin seni bekliyor. Kırılmasın!`
        : "Bugünün halkasını eklemeyi unutma.",
    url: "/",
    tag: "reminder",
  };
}
