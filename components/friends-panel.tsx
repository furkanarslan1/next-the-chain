import Link from "next/link";
import { LuChevronRight, LuUserPlus } from "react-icons/lu";

export type TodayRow = { ft_user_id: string; ft_username: string; ft_state: string };
export type RankRow = { user_id: string; username: string | null; completed: number };

type Props = {
  today: TodayRow[];
  ranking: RankRow[];
  meId: string;
  shareToday: boolean;
  friendCount: number;
};

const STATE_RING: Record<string, string> = {
  done: "ring-emerald-400",
  partial: "ring-amber-400",
  waiting: "ring-white/20",
};
const STATE_LABEL: Record<string, string> = {
  done: "bugün tamamladı",
  partial: "bir kısmını tamamladı",
  waiting: "henüz tamamlamadı",
};

function hue(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        backgroundColor: `hsl(${hue(name)} 45% 38%)`,
      }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

const card = {
  backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)",
} as const;

// Ana sayfa: arkadaşların bugünkü durumu ve bu haftaki sıralama.
export function FriendsPanel({ today, ranking, meId, shareToday, friendCount }: Props) {
  if (friendCount === 0) {
    return (
      <Link
        href="/friends"
        data-tour="friends"
        className="flex items-center gap-3 rounded-2xl border border-dashed border-white/20 p-4 outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-ring"
        style={card}
      >
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/5 text-muted-foreground">
          <LuUserPlus className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium">Arkadaşlarını ekle</span>
          <span className="block text-xs text-muted-foreground">
            Birlikte yarışın, haftalık sıralamada yerini gör.
          </span>
        </span>
        <LuChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    );
  }

  const top = ranking.slice(0, 3);
  const myIndex = ranking.findIndex((r) => r.user_id === meId);
  const showMeSeparately = myIndex >= 3;

  return (
    <section data-tour="friends" className="space-y-4 rounded-2xl border border-white/10 p-4" style={card}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Arkadaşların</h2>
        <Link
          href="/friends"
          className="inline-flex items-center gap-0.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          Tümü
          <LuChevronRight className="size-4" aria-hidden />
        </Link>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Bugün</p>
        {!shareToday ? (
          <p className="text-sm text-muted-foreground">
            Arkadaşlarının bugünkü durumunu görmek için kendi durumunu da
            paylaşmalısın.{" "}
            <Link href="/friends#gizlilik" className="underline underline-offset-4 hover:text-foreground">
              Ayarı aç
            </Link>
          </p>
        ) : today.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Arkadaşlarından kimse durumunu paylaşmıyor ya da aktif zinciri yok.
          </p>
        ) : (
          <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 py-1.5">
            {today.map((f) => (
              <li key={f.ft_user_id} className="flex w-14 shrink-0 flex-col items-center gap-1.5">
                <span
                  role="img"
                  aria-label={`@${f.ft_username} ${STATE_LABEL[f.ft_state] ?? ""}`}
                  className={`rounded-full ring-2 ring-offset-2 ring-offset-transparent ${STATE_RING[f.ft_state] ?? "ring-white/20"}`}
                >
                  <Avatar name={f.ft_username} />
                </span>
                <span className="w-full truncate text-center text-[11px] text-muted-foreground">
                  {f.ft_username}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Bu hafta sıralama</p>
        <ol className="divide-y divide-white/10 overflow-hidden rounded-xl border border-white/10">
          {top.map((row, i) => (
            <Row key={row.user_id} place={i + 1} row={row} me={row.user_id === meId} />
          ))}
          {showMeSeparately && (
            <Row place={myIndex + 1} row={ranking[myIndex]} me />
          )}
        </ol>
      </div>
    </section>
  );
}

function Row({ place, row, me }: { place: number; row: RankRow; me: boolean }) {
  return (
    <li className={`flex items-center gap-3 px-3 py-2 ${me ? "bg-white/5" : ""}`}>
      <span className="w-5 text-center text-sm tabular-nums text-muted-foreground">{place}</span>
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        @{row.username}
        {me && <span className="ml-2 text-xs font-normal text-muted-foreground">sen</span>}
      </span>
      <span className="text-sm tabular-nums">{row.completed} halka</span>
    </li>
  );
}
