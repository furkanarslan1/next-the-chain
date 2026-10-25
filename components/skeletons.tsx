// Sayfa verisi gelene kadar gösterilen iskelet ekranlar. Sadece opacity animasyonu (ucuz);
// "hareketi azalt" ayarında animasyon kapanır.
function Bone({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded-2xl bg-white/[0.06] motion-reduce:animate-none ${className}`}
    />
  );
}

const status = { role: "status", "aria-label": "Yükleniyor" } as const;

// Ana sayfa: selamlama, özet, kutucuklar ve iki zincir kartı.
export function HomeSkeleton() {
  return (
    <div {...status} className="space-y-6">
      <div className="space-y-2">
        <Bone className="h-4 w-24" />
        <Bone className="h-8 w-48" />
      </div>
      <Bone className="h-[108px] rounded-3xl" />
      <Bone className="h-[104px]" />
      <div className="grid grid-cols-2 gap-3">
        <Bone className="h-[132px]" />
        <Bone className="h-[132px]" />
      </div>
      <Bone className="h-6 w-36" />
      <Bone className="h-[440px] rounded-3xl" />
    </div>
  );
}

// Liste sayfaları: birkaç satırlık bölümler.
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div {...status} className="space-y-6">
      <div className="space-y-3">
        <Bone className="h-5 w-32" />
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, i) => (
            <Bone key={i} className="h-14" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Bone className="h-5 w-40" />
        <Bone className="h-24" />
      </div>
    </div>
  );
}
