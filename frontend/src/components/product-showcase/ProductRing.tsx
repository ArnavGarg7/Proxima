import { m, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/cn';
import { HeroCounter } from '@/components/landing/hero/HeroCounter';

interface ProductRingProps {
  /** 0–100 score; drives both the arc fill and the counter (one source). */
  value: MotionValue<number>;
  /** Diameter in px — geometry scales proportionally. */
  size?: number;
  /** Optional caption rendered beneath the ring. */
  label?: string;
}

/**
 * ProductRing — the shared confidence dial (same SVG stroke-dashoffset strategy
 * as the Hero). The arc and the HeroCounter both read the one `value` MotionValue,
 * so every showcase's score visual is identical — no duplicated ring geometry or
 * counter wiring.
 */
export function ProductRing({ value, size = 52, label }: ProductRingProps) {
  const stroke = Math.max(3, Math.round(size * 0.09));
  const radius = (size - stroke * 2) / 2;
  const circ   = 2 * Math.PI * radius;
  const dashoffset = useTransform(value, [0, 100], [circ, 0], { clamp: true });

  const ring = (
    <div className="relative flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--color-border)" strokeWidth={stroke} />
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <m.circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="var(--color-conf-high)" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={circ}
            style={{ strokeDashoffset: dashoffset }}
          />
        </g>
      </svg>
      <span className={cn('absolute font-mono font-semibold text-text-primary tabular-nums', size <= 48 ? 'text-[11px]' : 'text-xs')}>
        <HeroCounter value={value} suffix="%" />
      </span>
    </div>
  );

  if (!label) return ring;
  return (
    <div className="flex flex-col items-center gap-1">
      {ring}
      <span className="font-sans text-[9px] uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}
