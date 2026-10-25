"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/tour/mascot";
import type { TourStep } from "@/components/tour/steps";

type Geometry = {
  rect: { x: number; y: number; w: number; h: number } | null;
  vw: number;
  vh: number;
  popH: number;
  // Hedef görünür alana kaydırıldıktan sonra ölçüldü mü? Önce kutu gizli kalır (yanlış yerde yanıp sönmesin).
  ready: boolean;
};

const PAD = 8;
const RADIUS = 18;

function findTarget(step: TourStep) {
  for (const selector of step.targets ?? []) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
}

// Görünüm alanı üzerinde, hedefin etrafında yuvarlak köşeli bir delik açan kırpma yolu.
function holePath(rect: NonNullable<Geometry["rect"]>, vw: number, vh: number) {
  const x = rect.x - PAD;
  const y = rect.y - PAD;
  const w = rect.w + PAD * 2;
  const h = rect.h + PAD * 2;
  const r = Math.min(RADIUS, w / 2, h / 2);
  return (
    `path(evenodd, "M-400 -400H${vw + 400}V${vh + 400}H-400Z ` +
    `M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}V${y + h - r}` +
    `A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}A${r} ${r} 0 0 1 ${x} ${y + h - r}` +
    `V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z")`
  );
}

// Hedefin ve ekranın o anki ölçüleri (sadece tarayıcıda çağrılır).
function readGeometry(step: TourStep | undefined, popH: number, ready: boolean): Geometry {
  const box = step ? findTarget(step)?.getBoundingClientRect() : undefined;
  return {
    rect: box ? { x: box.left, y: box.top, w: box.width, h: box.height } : null,
    vw: window.innerWidth,
    vh: window.innerHeight,
    popH,
    ready,
  };
}

type Props = {
  steps: TourStep[];
  onFinish: (reason: "done" | "skip") => void;
  // Sadece önizleme/test için: turu belirli bir adımda başlatır.
  initialIndex?: number;
};

// Ekranı bulanıklaştırıp hedef öğeyi net bırakan adım adım tanıtım turu.
// Sadece istemcide, sayfa yüklendikten sonra bağlanmalıdır (DOM'u okur).
export function ProductTour({ steps: allSteps, onFinish, initialIndex = 0 }: Props) {
  const router = useRouter();
  const titleId = useId();
  const popRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);

  // Sayfada hedefi olmayan adımlar baştan elenir (örn. zinciri olmayanda "lig" adımı).
  const [steps] = useState(() =>
    allSteps.filter((s) => !s.targets || s.targets.some((sel) => document.querySelector(sel))),
  );
  const [index, setIndex] = useState(() => Math.min(initialIndex, steps.length - 1));
  const [geo, setGeo] = useState<Geometry>(() => readGeometry(steps[Math.min(initialIndex, steps.length - 1)], 190, false));

  const step = steps[index];
  const isLast = index === steps.length - 1;

  const measure = useCallback(() => {
    setGeo(readGeometry(step, popRef.current?.offsetHeight ?? 190, true));
  }, [step]);

  // Adım değişince hedefi görünür alana getir, ölç ve odağı düğmeye taşı.
  useEffect(() => {
    if (!step) return;
    findTarget(step)?.scrollIntoView({ block: "center", inline: "nearest" });

    let raf = requestAnimationFrame(() => {
      measure();
      primaryRef.current?.focus({ preventScroll: true });
    });
    const onChange = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [step, measure]);

  // Tur açıkken sayfa kaydırması kilitli; kapanınca eski haline döner.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const finish = useCallback(
    (reason: "done" | "skip", href?: string) => {
      onFinish(reason);
      if (href) router.push(href);
    },
    [onFinish, router],
  );

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      finish("skip");
      return;
    }
    // Odağı pencerenin içinde tut.
    if (event.key === "Tab" && popRef.current) {
      const focusable = Array.from(popRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  if (!step) return null;

  // Pencere konumu: hedefin altına, sığmazsa üstüne; hedef yoksa ortaya.
  const { rect, vw, vh, popH } = geo;
  const popW = Math.min(360, (vw || 360) - 32);
  const left = Math.max(16, ((vw || 360) - popW) / 2);
  let top: number;
  if (!rect) {
    top = Math.max(16, ((vh || 640) - popH) / 2);
  } else {
    const holeTop = rect.y - PAD;
    const holeBottom = rect.y + rect.h + PAD;
    if (vh - holeBottom >= popH + 24) top = holeBottom + 14;
    else if (holeTop >= popH + 24) top = holeTop - popH - 14;
    else top = Math.max(16, vh - popH - 16);
  }

  const primaryLabel = isLast ? (step.action?.label ?? "Bitir") : index === 0 ? "Hadi başlayalım" : "İleri";

  const overlay = (
    <div onKeyDown={onKeyDown}>
      {/* Bulanık arka plan; hedefin olduğu yer kırpılarak net bırakılır. */}
      <div
        aria-hidden
        className="fixed inset-0 z-[60]"
        style={{
          backdropFilter: "blur(6px)",
          WebkitBackdropFilter: "blur(6px)",
          backgroundColor: "rgba(8, 9, 13, 0.6)",
          clipPath: rect && vw ? holePath(rect, vw, vh) : undefined,
        }}
      />
      {rect && (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[61] transition-all duration-200 motion-reduce:transition-none"
          style={{
            left: rect.x - PAD,
            top: rect.y - PAD,
            width: rect.w + PAD * 2,
            height: rect.h + PAD * 2,
            borderRadius: RADIUS,
            boxShadow: "0 0 0 2px rgba(255,255,255,0.85), 0 0 28px rgba(255,255,255,0.22)",
          }}
        />
      )}

      <div
        ref={popRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed z-[62] rounded-3xl border border-white/15 bg-popover p-4 text-popover-foreground shadow-2xl shadow-black/50"
        style={{ top, left, width: popW, opacity: geo.ready ? 1 : 0 }}
      >
        <div className="flex items-start gap-3">
          <Mascot mood={step.mood} size={60} />
          <div className="min-w-0 flex-1 space-y-1">
            <h2 id={titleId} className="text-base font-semibold leading-snug">
              {step.title}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground" aria-live="polite">
              {step.body}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <ol className="flex items-center gap-1.5" aria-label={`Adım ${index + 1} / ${steps.length}`}>
            {steps.map((s, i) => (
              <li
                key={s.id}
                aria-hidden
                className={`h-1.5 rounded-full transition-all motion-reduce:transition-none ${
                  i === index ? "w-5 bg-foreground" : "w-1.5 bg-white/25"
                }`}
              />
            ))}
          </ol>
          <div className="flex items-center gap-1">
            {!isLast && (
              <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => finish("skip")}>
                Atla
              </Button>
            )}
            {index > 0 && (
              <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setIndex((i) => Math.max(i - 1, 0))}>
                Geri
              </Button>
            )}
            <Button
              ref={primaryRef}
              size="sm"
              className="h-9 px-4"
              onClick={() => (isLast ? finish("done", step.action?.href) : setIndex((i) => i + 1))}
            >
              {primaryLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlay, document.body);
}
