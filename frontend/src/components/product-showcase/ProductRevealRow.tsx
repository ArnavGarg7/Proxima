import type { ReactNode } from 'react';
import { m, useTransform, type MotionValue } from 'framer-motion';
import { productMotion } from './productMotion';

interface ProductRevealRowProps {
  /** Absolute progress window this row group occupies. */
  range: [number, number];
  index: number;
  total: number;
  progress: MotionValue<number>;
  children: ReactNode;
  /** Optional right-aligned tag (e.g. an entity type). */
  trailing?: ReactNode;
  /** Leading check icon (default true). */
  check?: boolean;
}

/**
 * ProductRevealRow — one staggered "fade + slight rise + check" line, the shared
 * reveal used for summaries, extracted entities and document signals. Stagger,
 * fade distance and item span all come from productMotion tokens, so every
 * sequential reveal across the showcases moves on one rhythm.
 */
export function ProductRevealRow({ range, index, total, progress, children, trailing, check = true }: ProductRevealRowProps) {
  const span  = range[1] - range[0];
  const start = range[0] + (index / total) * span * productMotion.revealSpread;
  const end   = start + span * productMotion.revealItemSpan;
  const opacity = useTransform(progress, [start, end], [0, 1], { clamp: true });
  const y       = useTransform(progress, [start, end], [productMotion.revealY, 0], { clamp: true });

  return (
    <m.div style={{ opacity, y }} className="flex items-center gap-1.5">
      {check && <span className="material-symbols-outlined shrink-0 text-[12px] text-conf-high">check</span>}
      <span className="font-sans text-[10px] text-text-secondary">{children}</span>
      {trailing && <span className="ml-auto font-mono text-[8px] uppercase tracking-wider text-text-muted">{trailing}</span>}
    </m.div>
  );
}
