import type { BadgeDef } from "@/lib/badges";
import { GROUP_COLOR } from "@/lib/badges";

// Altıgen rozet: içinde iç içe geçmiş iki halka, altta (varsa) sayısal hedef.
export function BadgeIcon({
  badge,
  earned,
  size = 64,
  className,
}: {
  badge: BadgeDef;
  earned: boolean;
  size?: number;
  className?: string;
}) {
  const color = earned ? GROUP_COLOR[badge.group] : "currentColor";
  return (
    <svg
      viewBox="-50 -50 100 100"
      width={size}
      height={size}
      aria-hidden
      className={`${earned ? "" : "text-muted-foreground/40"} ${className ?? ""}`}
    >
      <polygon
        points="0,-46 40,-23 40,23 0,46 -40,23 -40,-23"
        fill={earned ? `${color}22` : "none"}
        stroke={color}
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <g transform="rotate(-45)" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round">
        <rect x="-26" y="-10" width="30" height="20" rx="10" />
        <rect x="-4" y="-10" width="30" height="20" rx="10" />
      </g>
      {badge.target !== undefined && badge.target > 1 && (
        <text
          x="0"
          y="36"
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill={color}
          stroke="none"
        >
          {badge.target}
        </text>
      )}
    </svg>
  );
}
