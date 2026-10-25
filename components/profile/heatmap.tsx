import { WEEKDAY_LABELS } from "@/lib/chains";
import type { HeatCell } from "@/lib/profile-stats";

const MONTHS = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];
const LEVEL_OPACITY = [0, 0.28, 0.5, 0.75, 1];

// Ayın 1'ini içeren hafta sütununun üstüne ay adı yazılır; ilk sütunda 1'i yoksa onun ayı yazılır.
function monthLabel(week: HeatCell[], isFirstColumn: boolean) {
  const firstOfMonth = week.find((c) => c.date.endsWith("-01"));
  if (firstOfMonth) return MONTHS[Number(firstOfMonth.date.slice(5, 7)) - 1];
  return isFirstColumn ? MONTHS[Number(week[6].date.slice(5, 7)) - 1] : "";
}

// GitHub tarzı takvim: her kare bir gün; renk o gün tamamlanan zincir sayısı, halka joker günü.
export function Heatmap({ weeks, color = "#2fd27c" }: { weeks: HeatCell[][]; color?: string }) {
  const activeDays = weeks.flat().filter((c) => c.done > 0).length;

  return (
    <section aria-label={`Son ${weeks.length} haftalık tamamlama haritası`} className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Isı haritası</h2>
        <p className="text-xs text-muted-foreground">
          Son {weeks.length} haftada <span className="tabular-nums text-foreground">{activeDays}</span> aktif gün
        </p>
      </div>

      <div
        className="overflow-x-auto rounded-2xl border border-white/10 p-3"
        style={{ backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)" }}
      >
        <div className="flex min-w-max gap-1.5">
          {/* gün adları */}
          <div className="flex flex-col gap-[3px] pt-4 pr-1 text-[10px] leading-[14px] text-muted-foreground" aria-hidden>
            {WEEKDAY_LABELS.map((label, i) => (
              <span key={label} className="h-[14px]">
                {i % 2 === 0 ? label : ""}
              </span>
            ))}
          </div>

          <div className="flex gap-[3px]">
            {weeks.map((week, w) => (
              <div key={week[0].date} className="flex flex-col gap-[3px]">
                <span className="h-3 text-[10px] leading-3 text-muted-foreground" aria-hidden>
                  {monthLabel(week, w === 0)}
                </span>
                {week.map((cell) => (
                  <span
                    key={cell.date}
                    title={`${cell.date}: ${cell.done} zincir${cell.joker ? ", joker" : ""}`}
                    className={`relative size-[14px] rounded-[4px] ${cell.today ? "ring-2 ring-white/70" : ""} ${cell.future ? "border border-dashed border-white/10" : ""}`}
                    style={{
                      backgroundColor: cell.level > 0 ? color : cell.future ? "transparent" : "rgba(255,255,255,0.06)",
                      opacity: cell.level > 0 ? LEVEL_OPACITY[cell.level] : 1,
                    }}
                  >
                    {cell.joker && cell.level === 0 && (
                      <span aria-hidden className="absolute inset-[4px] rounded-full bg-amber-400/80" />
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-end gap-1.5 text-[10px] text-muted-foreground" aria-hidden>
          Az
          {LEVEL_OPACITY.map((o, i) => (
            <span
              key={i}
              className="size-[12px] rounded-[3px]"
              style={{ backgroundColor: i === 0 ? "rgba(255,255,255,0.06)" : color, opacity: i === 0 ? 1 : o }}
            />
          ))}
          Çok
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="relative size-[12px] rounded-[3px] bg-white/[0.06]">
              <span className="absolute inset-[3px] rounded-full bg-amber-400/80" />
            </span>
            Joker
          </span>
        </div>
      </div>
    </section>
  );
}
