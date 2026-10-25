import { LuTrendingDown, LuTrendingUp } from "react-icons/lu";
import { WEEKDAY_LABELS } from "@/lib/chains";
import type { WeeklySummary as Summary } from "@/lib/profile-stats";

// "Bu hafta" özeti: toplam halka, aktif gün, geçen haftayla karşılaştırma ve günlük çubuklar.
export function WeeklySummary({ summary, todayIndex }: { summary: Summary; todayIndex: number }) {
  const { doneThisWeek, activeDaysThisWeek, jokerDaysThisWeek, doneLastWeek, deltaPercent, perDay, bestDay } = summary;
  const peak = Math.max(...perDay, 1);
  const up = deltaPercent !== null && deltaPercent >= 0;

  return (
    <section
      aria-label="Haftalık özet"
      className="space-y-4 rounded-2xl border border-white/10 p-4"
      style={{ backgroundColor: "color-mix(in oklab, var(--card) 85%, transparent)", backgroundImage: "linear-gradient(150deg, #4d8dff1c, transparent 60%)" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Bu hafta</h2>
          <p className="text-xs text-muted-foreground">Pazartesi&apos;den bugüne</p>
        </div>
        {deltaPercent !== null && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
              up ? "bg-emerald-500/15 text-emerald-300" : "bg-red-500/15 text-red-300"
            }`}
          >
            {up ? <LuTrendingUp className="size-3.5" aria-hidden /> : <LuTrendingDown className="size-3.5" aria-hidden />}
            Geçen haftaya göre %{Math.abs(deltaPercent)} {up ? "fazla" : "az"}
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 divide-x divide-white/10 text-center">
        <Metric value={doneThisWeek} label="halka" />
        <Metric value={`${activeDaysThisWeek}/7`} label="aktif gün" />
        <Metric value={doneLastWeek} label="geçen hafta" muted />
      </div>

      <div className="flex h-16 items-end gap-2" role="img" aria-label={`Günlük tamamlanan: ${perDay.join(", ")}`}>
        {perDay.map((v, i) => (
          <div key={WEEKDAY_LABELS[i]} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-12 w-full items-end">
              <div
                className={`w-full rounded-md ${i === todayIndex ? "bg-white/80" : v > 0 ? "bg-[#4d8dff]" : "bg-white/[0.07]"}`}
                style={{ height: `${v > 0 ? Math.max((v / peak) * 100, 14) : 8}%` }}
              />
            </div>
            <span className={`text-[10px] ${i === todayIndex ? "font-semibold text-foreground" : "text-muted-foreground"}`}>
              {WEEKDAY_LABELS[i]}
            </span>
          </div>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        {bestDay ? `En verimli gün ${bestDay.label} (${bestDay.done} halka).` : "Bu hafta henüz halka eklemedin."}
        {jokerDaysThisWeek > 0 && ` ${jokerDaysThisWeek} gün jokerle korundu.`}
      </p>
    </section>
  );
}

function Metric({ value, label, muted }: { value: number | string; label: string; muted?: boolean }) {
  return (
    <div className="px-2">
      <p className={`text-2xl font-semibold tabular-nums ${muted ? "text-muted-foreground" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
