export type Mood = "happy" | "wow" | "cheer";

// "Halka": yüzü olan turuncu bir zincir halkası; arkasında amber bir halka.
export function Mascot({ mood = "happy", size = 64 }: { mood?: Mood; size?: number }) {
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden className="shrink-0">
      {/* arkadaki halka */}
      <g transform="rotate(-38) translate(-6 -2)" fill="none" stroke="#ffb020" strokeWidth="7" strokeLinecap="round">
        <rect x="-8" y="-24" width="62" height="40" rx="20" />
      </g>
      {/* ön halka (yüz) */}
      <rect x="-40" y="-18" width="68" height="46" rx="23" fill="#ff6a3d" />
      <rect x="-40" y="-18" width="68" height="46" rx="23" fill="url(#shine)" />
      <defs>
        <linearGradient id="shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* gözler */}
      {mood === "cheer" ? (
        <g fill="none" stroke="#2a1208" strokeWidth="3.4" strokeLinecap="round">
          <path d="M-22 1 q5 -7 10 0" />
          <path d="M-2 1 q5 -7 10 0" />
        </g>
      ) : (
        <g>
          <ellipse cx="-17" cy="0" rx={mood === "wow" ? 5.4 : 4.6} ry={mood === "wow" ? 6.4 : 5.4} fill="#fff" />
          <ellipse cx="3" cy="0" rx={mood === "wow" ? 5.4 : 4.6} ry={mood === "wow" ? 6.4 : 5.4} fill="#fff" />
          <circle cx="-16" cy="1" r="2.6" fill="#2a1208" />
          <circle cx="4" cy="1" r="2.6" fill="#2a1208" />
        </g>
      )}
      {/* ağız */}
      {mood === "wow" ? (
        <ellipse cx="-7" cy="16" rx="4" ry="4.6" fill="#2a1208" />
      ) : (
        <path
          d={mood === "cheer" ? "M-18 11 q11 14 22 0 z" : "M-17 12 q10 9 20 0"}
          fill={mood === "cheer" ? "#2a1208" : "none"}
          stroke="#2a1208"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
      {/* yanaklar */}
      <circle cx="-30" cy="11" r="3.6" fill="#ff9d7d" opacity="0.7" />
      <circle cx="16" cy="11" r="3.6" fill="#ff9d7d" opacity="0.7" />
    </svg>
  );
}
