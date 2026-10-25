import { LuCheck } from "react-icons/lu";

type Props = { done: number; total: number };

// "Bugün 2/3 tamam" özeti: halka ilerleme göstergesi + kısa metin.
export function TodaySummary({ done, total }: Props) {
  if (total === 0) return null;

  const complete = done >= total;
  const ratio = Math.min(done / total, 1);
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const color = complete ? "#2fd27c" : "#ffb020";

  return (
    <section
      data-tour="summary"
      className="flex items-center gap-4 rounded-3xl border p-4"
      style={{
        borderColor: `${color}40`,
        backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)",
        backgroundImage: `linear-gradient(135deg, ${color}1c, transparent 65%)`,
      }}
      aria-label="Bugünün özeti"
    >
      <div className="relative size-[76px] shrink-0">
        <svg viewBox="0 0 76 76" className="size-full -rotate-90" aria-hidden>
          <circle cx="38" cy="38" r={radius} fill="none" stroke="currentColor" strokeWidth="7" className="text-white/10" />
          <circle
            cx="38"
            cy="38"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-semibold tabular-nums">
          {complete ? <LuCheck className="size-7" style={{ color }} aria-hidden /> : `${done}/${total}`}
        </span>
      </div>
      <div className="min-w-0 space-y-0.5">
        <p className="text-lg font-semibold">
          {complete ? "Bugünün halkaları tamam" : `Bugün ${done}/${total} tamam`}
        </p>
        <p className="text-sm text-muted-foreground">
          {complete
            ? "Harika gidiyorsun, yarın görüşürüz."
            : total - done === 1
              ? "1 zincirin seni bekliyor."
              : `${total - done} zincirin seni bekliyor.`}
        </p>
      </div>
    </section>
  );
}
