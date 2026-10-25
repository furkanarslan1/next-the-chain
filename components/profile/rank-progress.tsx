import { rankFor } from "@/lib/ranks";

// Mevcut rütbe ve bir sonrakine ilerleme çubuğu.
export function RankProgress({ activeDays }: { activeDays: number }) {
  const { current, next, progress, daysToNext } = rankFor(activeDays);

  return (
    <div className="space-y-2">
      <div className="h-2 overflow-hidden rounded-full bg-white/10" role="img" aria-label={`Rütbe ilerlemesi %${Math.round(progress * 100)}`}>
        <div className="h-full rounded-full" style={{ width: `${Math.max(progress * 100, 3)}%`, backgroundColor: current.color }} />
      </div>
      <p className="text-sm text-muted-foreground">
        {next ? (
          <>
            <span className="font-medium text-foreground">{next.name}</span> rütbesine{" "}
            <span className="tabular-nums">{daysToNext}</span> aktif gün kaldı
          </>
        ) : (
          "En yüksek rütbedesin."
        )}
      </p>
    </div>
  );
}
