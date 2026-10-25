import { spiralLayout } from "@/lib/chains";

type Props = {
  length: number;
  color: string;
  // Bugün tamamlanmadıysa sıradaki halka yanıp söner.
  pending: boolean;
  // Az önce eklenen son halkayı vurgular.
  justAdded?: boolean;
  className?: string;
};

export function ChainVisual({ length, color, pending, justAdded, className }: Props) {
  const total = length + (pending ? 1 : 0);
  const { scale, links } = spiralLayout(total);

  const len = scale * 1.0;
  const stroke = Math.max(scale * 0.17, 0.35);

  return (
    <svg
      viewBox="-50 -50 100 100"
      className={className}
      role="img"
      aria-label={`${length} halkalık zincir`}
    >
      {links.map((link, i) => {
        const isPending = pending && i === length;
        const isNew = justAdded && i === length - 1;
        // Çift halkalar cepheden, tek halkalar yandan görünür; birbirine geçmiş gibi durur.
        const wide = i % 2 === 0;
        const w = scale * (wide ? 0.62 : 0.24);
        return (
          <g
            key={i}
            transform={`translate(${link.x.toFixed(2)} ${link.y.toFixed(2)}) rotate(${link.angle.toFixed(1)})`}
          >
            <rect
              x={-len / 2}
              y={-w / 2}
              width={len}
              height={w}
              rx={w / 2}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              className={isPending ? "link-pending" : isNew ? "link-new" : undefined}
              style={isPending ? { color } : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}
