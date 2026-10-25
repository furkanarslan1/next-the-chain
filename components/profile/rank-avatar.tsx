import { useId } from "react";
import { RANKS } from "@/lib/ranks";

// Rütbeye göre değişen Halka mascotu. Gövde rengi ve aksesuar rütbeyle gelir; üst rütbelerde
// parıltı (aura) eklenir. Tamamı sade SVG: sunucuda çizilir, animasyonu yok.
const BODY = ["#e9dfcb", "#d58a56", "#a9b2bc", "#5aa9e6", "#ffb020", "#9db4ff", "#ff6a3d", "#f472b6"];
const BACK = ["#cbbf9f", "#8c5a33", "#6d7680", "#3f7fb3", "#ffd166", "#c8d4ff", "#ffb020", "#fdf4ff"];

// Aksesuarlar -50..50 görünüm alanında, gövdenin (x -40..28, y -18..28) üzerine çizilir.
function Accessory({ rank }: { rank: number }) {
  switch (rank) {
    case 0: // yumurta kabuğu
      return (
        <path
          d="M-36 -10 L-31 -24 L-25 -14 L-19 -26 L-13 -14 L-7 -25 L-1 -14 L5 -25 L10 -14 L16 -22 L22 -10 Z"
          fill="#f6efe0"
          stroke="#cbbf9f"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      );
    case 1: // deri önlük
      return (
        <g>
          <path d="M-32 12 H20 V28 a6 6 0 0 1 -6 6 H-26 a6 6 0 0 1 -6 -6 Z" fill="#6b4a2f" />
          <path d="M-22 12 V6 M10 12 V6" stroke="#6b4a2f" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    case 2: // kafa bandı
      return (
        <g>
          <rect x="-40" y="-13" width="68" height="8" rx="3" fill="#d84a4a" />
          <path d="M28 -11 L38 -18 L36 -8 L40 0 L28 -5 Z" fill="#d84a4a" />
        </g>
      );
    case 3: // çekiç
      return (
        <g transform="rotate(28 30 8)">
          <rect x="28" y="-4" width="5" height="34" rx="2" fill="#8b5a2b" />
          <rect x="19" y="-12" width="23" height="11" rx="2.5" fill="#dfe6ec" stroke="#8d99a4" strokeWidth="1.4" />
        </g>
      );
    case 4: // mezuniyet kepi
      return (
        <g>
          <path d="M-37 -19 L-6 -35 L25 -19 L-6 -10 Z" fill="#1f2937" />
          <path d="M-24 -14 V-6 Q-6 2 12 -6 V-14" fill="#111827" />
          <path d="M25 -19 L31 -2" stroke="#ffd166" strokeWidth="2" strokeLinecap="round" />
          <circle cx="31" cy="0" r="3" fill="#ffd166" />
        </g>
      );
    case 5: // sakal ve parıltı
      return (
        <g>
          <path d="M-30 14 Q-6 52 18 14 Q-6 26 -30 14 Z" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M34 -26 l2.4 5.6 5.6 2.4 -5.6 2.4 -2.4 5.6 -2.4 -5.6 -5.6 -2.4 5.6 -2.4 Z" fill="#fff" />
          <path d="M-44 -4 l1.6 3.6 3.6 1.6 -3.6 1.6 -1.6 3.6 -1.6 -3.6 -3.6 -1.6 3.6 -1.6 Z" fill="#fff" />
        </g>
      );
    case 6: // alevli taç
      return (
        <g>
          <path
            d="M-36 -12 Q-37 -26 -30 -34 Q-27 -26 -23 -22 Q-22 -34 -14 -42 Q-12 -30 -6 -24 Q0 -36 6 -42 Q8 -30 12 -24 Q18 -30 22 -36 Q24 -22 22 -12 Z"
            fill="#ff6a3d"
          />
          <path d="M-22 -12 Q-20 -22 -14 -28 Q-12 -20 -6 -16 Q0 -26 6 -30 Q8 -20 12 -12 Z" fill="#ffd166" />
        </g>
      );
    default: // altın taç
      return (
        <g>
          <path d="M-36 -12 L-33 -32 L-22 -20 L-6 -36 L10 -20 L21 -32 L24 -12 Z" fill="#ffd166" stroke="#e0a526" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="-6" cy="-24" r="3" fill="#f472b6" />
          <circle cx="-21" cy="-18" r="2.2" fill="#5aa9e6" />
          <circle cx="9" cy="-18" r="2.2" fill="#2fd27c" />
        </g>
      );
  }
}

export function RankAvatar({ rank, size = 64 }: { rank: number; size?: number }) {
  const index = Math.min(Math.max(rank, 0), RANKS.length - 1);
  const uid = useId().replace(/:/g, "");
  const aura = index >= 4;
  const body = BODY[index];

  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden className="shrink-0">
      <defs>
        <radialGradient id={`aura-${uid}`}>
          <stop offset="0.45" stopColor={RANKS[index].color} stopOpacity={index >= 6 ? 0.55 : 0.32} />
          <stop offset="1" stopColor={RANKS[index].color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`shine-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.3" />
          <stop offset="0.55" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        {index === 7 && (
          <linearGradient id={`ring-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ff6a3d" />
            <stop offset="0.33" stopColor="#ffd166" />
            <stop offset="0.66" stopColor="#2fd27c" />
            <stop offset="1" stopColor="#5aa9e6" />
          </linearGradient>
        )}
      </defs>

      {aura && <circle cx="-6" cy="4" r="48" fill={`url(#aura-${uid})`} />}
      {index === 7 && (
        <circle cx="-6" cy="4" r="44" fill="none" stroke={`url(#ring-${uid})`} strokeWidth="2.4" strokeDasharray="5 4" />
      )}

      {/* arkadaki halka */}
      <g transform="rotate(-38) translate(-6 -2)" fill="none" stroke={BACK[index]} strokeWidth="7" strokeLinecap="round">
        <rect x="-8" y="-24" width="62" height="40" rx="20" />
      </g>
      {/* ön halka (yüz) */}
      <rect x="-40" y="-18" width="68" height="46" rx="23" fill={body} />
      <rect x="-40" y="-18" width="68" height="46" rx="23" fill={`url(#shine-${uid})`} />
      {/* gözler */}
      <ellipse cx="-17" cy="0" rx="4.6" ry="5.4" fill="#fff" />
      <ellipse cx="3" cy="0" rx="4.6" ry="5.4" fill="#fff" />
      <circle cx="-16" cy="1" r="2.6" fill="#2a1208" />
      <circle cx="4" cy="1" r="2.6" fill="#2a1208" />
      {/* ağız ve yanaklar */}
      <path d="M-17 12 q10 9 20 0" fill="none" stroke="#2a1208" strokeWidth="3" strokeLinecap="round" />
      <circle cx="-30" cy="11" r="3.6" fill="#ff9d7d" opacity="0.6" />
      <circle cx="16" cy="11" r="3.6" fill="#ff9d7d" opacity="0.6" />

      <Accessory rank={index} />
    </svg>
  );
}

// Listelerde adın yanında küçük rütbe göstergesi.
export function RankMini({ rank, name, size = 24 }: { rank: number; name: string; size?: number }) {
  return (
    <span title={name} className="inline-flex shrink-0 items-center" role="img" aria-label={`Rütbe: ${name}`}>
      <RankAvatar rank={rank} size={size} />
    </span>
  );
}
