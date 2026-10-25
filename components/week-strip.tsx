import { LuCheck } from "react-icons/lu";
import { WEEKDAY_LABELS } from "@/lib/chains";

export type DayState = "full" | "partial" | "none" | "future";
export type WeekDay = { state: DayState; today: boolean };

const STATE_LABEL: Record<DayState, string> = {
  full: "tüm zincirler tamam",
  partial: "bir kısmı tamam",
  none: "tamamlanmadı",
  future: "henüz gelmedi",
};

// Bu haftanın 7 günü: o gün tüm zincirler tamamsa dolu, kısmen tamamsa yarım.
export function WeekStrip({ days }: { days: WeekDay[] }) {
  return (
    <section
      aria-label="Bu hafta"
      className="rounded-2xl border border-white/10 p-3"
      style={{ backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)" }}
    >
      <p className="mb-2 text-xs font-medium text-muted-foreground">Bu hafta</p>
      <ol className="grid grid-cols-7 gap-1 text-center">
        {days.map((day, i) => (
          <li key={WEEKDAY_LABELS[i]} className="flex flex-col items-center gap-1.5">
            <span
              className={`text-[11px] ${day.today ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {WEEKDAY_LABELS[i]}
            </span>
            <span
              role="img"
              aria-label={`${WEEKDAY_LABELS[i]}: ${STATE_LABEL[day.state]}${day.today ? " (bugün)" : ""}`}
              className={`relative flex size-8 items-center justify-center rounded-full border ${
                day.state === "full"
                  ? "border-emerald-400 bg-emerald-400 text-black"
                  : day.state === "partial"
                    ? "border-amber-400/70 text-amber-300"
                    : day.state === "future"
                      ? "border-dashed border-white/15"
                      : "border-white/20"
              } ${day.today ? "ring-2 ring-white/60 ring-offset-2 ring-offset-transparent" : ""}`}
            >
              {day.state === "full" && <LuCheck className="size-4" aria-hidden />}
              {day.state === "partial" && (
                <span aria-hidden className="size-3 rounded-full bg-amber-400/80" />
              )}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
