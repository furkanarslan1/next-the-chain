import { spiralLayout } from "@/lib/chains";
import { GROUP_COLOR, type BadgeDef } from "@/lib/badges";

// Paylaşım kartları (ImageResponse/satori ile PNG). Satori sadece flexbox'ı destekler:
// birden fazla çocuğu olan her kutu display:flex olmalı. Bunlar bileşen değil, JSX döndüren
// düz fonksiyonlardır (satori yalnızca düz elemanlarla çalışır).
export const CARD_SIZE = { width: 1080, height: 1350 } as const;

const BG = "#14161c";
const MUTED = "#9aa1ad";

function Brand() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <svg width="48" height="48" viewBox="-50 -50 100 100">
        <g transform="rotate(-45)" fill="none" strokeWidth="9" strokeLinecap="round">
          <rect x="-44" y="-17" width="50" height="34" rx="17" stroke="#ff6a3d" />
          <rect x="-6" y="-17" width="50" height="34" rx="17" stroke="#ffb020" />
        </g>
      </svg>
      <div style={{ display: "flex", fontSize: 40, color: "#d6d9df" }}>The Chain</div>
    </div>
  );
}

function Footer({ username }: { username?: string | null }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 34,
        color: MUTED,
      }}
    >
      <div style={{ display: "flex" }}>{username ? `@${username}` : ""}</div>
      <div style={{ display: "flex" }}>next-the-chain.vercel.app</div>
    </div>
  );
}

export function chainCard(p: {
  color: string;
  length: number;
  best: number;
  title?: string | null;
  username?: string | null;
  kind: string;
}) {
  const { scale, links } = spiralLayout(p.length, 46);
  const len = scale;
  const stroke = Math.max(scale * 0.17, 0.35);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: "72px 72px 64px",
        backgroundColor: BG,
        backgroundImage: `radial-gradient(circle at 50% 40%, ${p.color}40 0%, ${BG} 62%)`,
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
        <Brand />
        <div style={{ display: "flex", fontSize: 34, color: MUTED }}>
          {p.kind === "quit" ? "Bırakıyorum" : "Her gün"}
        </div>
      </div>

      <svg width="720" height="720" viewBox="-50 -50 100 100">
        {links.map((link, i) => {
          const w = scale * (i % 2 === 0 ? 0.62 : 0.24);
          return (
            <g
              key={i}
              transform={`translate(${link.x.toFixed(2)} ${link.y.toFixed(2)}) rotate(${link.angle.toFixed(1)})`}
            >
              <rect
                x={-len / 2}
                y={-w / 2}
                width={len}
                height={w}
                rx={w / 2}
                fill="none"
                stroke={p.color}
                strokeWidth={stroke}
              />
            </g>
          );
        })}
      </svg>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 200, lineHeight: 1 }}>{p.length}</div>
          <div style={{ display: "flex", fontSize: 52, color: p.color }}>halka</div>
        </div>
        {p.title ? (
          <div
            style={{
              display: "flex",
              fontSize: 54,
              color: "#e6e8ec",
              maxWidth: 900,
              justifyContent: "center",
              textAlign: "center",
            }}
          >
            {p.title}
          </div>
        ) : null}
        <div style={{ display: "flex", fontSize: 34, color: MUTED, marginTop: 6 }}>
          En uzun zincir: {p.best}
        </div>
      </div>

      <Footer username={p.username} />
    </div>
  );
}

export function badgeCard(p: {
  badge: BadgeDef;
  earnedAt: string;
  username?: string | null;
}) {
  const color = GROUP_COLOR[p.badge.group];
  const date = new Date(p.earnedAt).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        height: "100%",
        padding: "72px 72px 64px",
        backgroundColor: BG,
        backgroundImage: `radial-gradient(circle at 50% 42%, ${color}44 0%, ${BG} 62%)`,
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center" }}>
        <Brand />
        <div style={{ display: "flex", fontSize: 34, color: MUTED }}>Yeni rozet</div>
      </div>

      <div style={{ display: "flex", position: "relative", width: 640, height: 640 }}>
        <svg width="640" height="640" viewBox="-50 -50 100 100">
          <polygon
            points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23"
            fill={`${color}22`}
            stroke={color}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <g transform="rotate(-45)" fill="none" stroke={color} strokeWidth="4.5" strokeLinecap="round">
            <rect x="-26" y="-10" width="30" height="20" rx="10" />
            <rect x="-4" y="-10" width="30" height="20" rx="10" />
          </g>
        </svg>
        {p.badge.target !== undefined && p.badge.target > 1 ? (
          // Satori SVG içinde <text> desteklemez; sayı üstte ayrı bir yazı olarak bindirilir.
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 0,
              right: 0,
              top: 470,
              justifyContent: "center",
              fontSize: 84,
              color,
            }}
          >
            {p.badge.target}
          </div>
        ) : null}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", fontSize: 96, color }}>{p.badge.title}</div>
        <div
          style={{
            display: "flex",
            fontSize: 42,
            color: "#e6e8ec",
            maxWidth: 880,
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {p.badge.description}
        </div>
        <div style={{ display: "flex", fontSize: 34, color: MUTED, marginTop: 8 }}>{date}</div>
      </div>

      <Footer username={p.username} />
    </div>
  );
}
