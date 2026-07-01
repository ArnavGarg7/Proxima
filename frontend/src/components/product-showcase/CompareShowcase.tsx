import { m, useTransform, type MotionValue } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { HeroCounter } from '@/components/landing/hero/HeroCounter';
import { ProductHeader } from './ProductHeader';
import { ProductRing } from './ProductRing';
import { ProductMetric } from './ProductMetric';
import { ProductRevealRow } from './ProductRevealRow';
import { useShowcase } from './ProductShowcaseContext';
import { useShowcaseReveal } from './useShowcaseReveal';
import { ShowcasePhase, COMPLETE_WINDOW, animSpan } from './productTimeline';
import { productData } from './productData';

/** A right-pane line that crossfades from the base to the revised text + highlight. */
function CompareRow({ oldText, newText, changed, index, total, progress }: {
  oldText: string;
  newText: string;
  changed: boolean;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const startFrac = 0.12 + (index / total) * 0.5;
  const [start, end] = animSpan(startFrac, startFrac + 0.28);
  const oldOpacity = useTransform(progress, [start, end], changed ? [1, 0] : [1, 1], { clamp: true });
  const newOpacity = useTransform(progress, [start, end], changed ? [0, 1] : [0, 0], { clamp: true });
  const highlight  = useTransform(progress, [start, end], changed ? [0, 1] : [0, 0], { clamp: true });

  return (
    <div className="relative grid rounded border border-border/40 px-2 py-1">
      <m.span style={{ opacity: highlight }} className="pointer-events-none absolute inset-0 rounded bg-conf-amber/12" />
      <m.span style={{ opacity: oldOpacity }} className="relative col-start-1 row-start-1 font-sans text-[10px] leading-snug text-text-secondary">
        {oldText}
      </m.span>
      <m.span style={{ opacity: newOpacity }} className="relative col-start-1 row-start-1 font-sans text-[10px] leading-snug text-text-primary">
        {newText}
      </m.span>
    </div>
  );
}

/**
 * CompareShowcase — a miniature working version of Proxima's Compare analyzer.
 *
 * Two document panes start identical, then the revised pane's lines crossfade
 * with a held highlight as the comparison resolves; the confidence ring fills
 * (83→96), the difference counter counts (0→18), the status flips to complete,
 * the summary reveals one change at a time, and Export enables. Built from the
 * shared product primitives (header, ring, metric, reveal rows) and driven by
 * the shared ProductShowcase progress — no own timers; only transform + opacity
 * + SVG stroke. Decorative (aria-hidden); all data from productData.compare.
 */
export function CompareShowcase() {
  const { progress, phase } = useShowcase();
  const data = productData.compare;
  const [v1, v2] = data.versions;

  const comparing =
    phase === ShowcasePhase.Idle ||
    phase === ShowcasePhase.Initialize ||
    phase === ShowcasePhase.Animate;

  const reveal = useShowcaseReveal(progress);

  // Confidence (start → final) over the back half of Animate — drives the ring.
  const score = useTransform(progress, animSpan(0.4, 1), [data.confidence.start, data.confidence.final] as number[], { clamp: true });
  // Difference counter 0 → total.
  const diff  = useTransform(progress, animSpan(0.2, 0.95), [0, data.differences] as number[], { clamp: true });
  // Export enable — a small opacity transition during Complete (no movement).
  const exportOpacity = useTransform(progress, [COMPLETE_WINDOW[0] - 0.02, COMPLETE_WINDOW[1]], [0.45, 1], { clamp: true });

  const summaryRange: [number, number] = [animSpan(0.92, 1)[0], COMPLETE_WINDOW[1]];

  return (
    <m.div aria-hidden="true" style={{ opacity: reveal }} className="flex w-full max-w-sm flex-col gap-3">
      <ProductHeader
        state={comparing ? 'processing' : 'complete'}
        status={comparing ? 'Comparing…' : 'Comparison complete'}
        trailing={<ProductRing value={score} size={44} />}
      />

      {/* Document panes */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">{v1.tag} · {v1.label}</span>
          {v1.rows.map((row) => (
            <div key={row} className="rounded border border-border/40 px-2 py-1 font-sans text-[10px] leading-snug text-text-secondary">
              {row}
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface p-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">{v2.tag} · {v2.label}</span>
          {v2.rows.map((row, i) => (
            <CompareRow
              key={row}
              oldText={v1.rows[i]}
              newText={row}
              changed={data.changed[i]}
              index={i}
              total={v2.rows.length}
              progress={progress}
            />
          ))}
        </div>
      </div>

      {/* Footer — difference count, summary, export */}
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col gap-2.5">
          <ProductMetric label="Differences">
            <span className="font-mono text-sm font-semibold text-text-primary tabular-nums">
              <HeroCounter value={diff} />
            </span>
          </ProductMetric>
          <ProductMetric label="Summary">
            <div className="flex flex-col gap-0.5">
              {data.summary.map((text, i) => (
                <ProductRevealRow key={text} range={summaryRange} index={i} total={data.summary.length} progress={progress}>
                  {text}
                </ProductRevealRow>
              ))}
            </div>
          </ProductMetric>
        </div>
        <m.div style={{ opacity: exportOpacity }} className="shrink-0">
          <Button variant="primary" size="sm" disabled={comparing} tabIndex={-1}>
            Export
          </Button>
        </m.div>
      </div>
    </m.div>
  );
}
