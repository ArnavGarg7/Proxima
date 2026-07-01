import { useState } from 'react';
import { m, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { ProductHeader } from './ProductHeader';
import { ProductRing } from './ProductRing';
import { ProductMetric } from './ProductMetric';
import { ProductRevealRow } from './ProductRevealRow';
import { ProductPipeline } from './ProductPipeline';
import { productMotion } from './productMotion';
import { useShowcase } from './ProductShowcaseContext';
import { useShowcaseReveal } from './useShowcaseReveal';
import { INIT_END, COMPLETE_WINDOW, animSpan } from './productTimeline';
import type { ProductStatus } from './ProductStatusChip';
import { productData } from './productData';

/* Overlapping sub-sequences of the Animate phase: classify → confidence →
   extract entities → assess risk; insights resolve on Complete. */
const CLASS = animSpan(0,    0.42);
const CONF  = animSpan(0.18, 0.62);
const ENT   = animSpan(0.34, 0.86);
const RISK  = animSpan(0.66, 1);
const INS: [number, number] = [animSpan(0.96, 1)[0], COMPLETE_WINDOW[1]];

/* ── Status header progression ────────────────────────────────────────────── */
const STATUS = ['Scanning Document', 'Running Models', 'Calculating Confidence', 'Ready'] as const;
const STATE: ProductStatus[] = ['scanning', 'processing', 'processing', 'ready'];

/** Map an overall-progress value to its status stage (0 scan → 3 ready). */
function stageFor(p: number): number {
  if (p < INIT_END)          return 0;
  if (p < CONF[0])           return 1;
  if (p < COMPLETE_WINDOW[0]) return 2;
  return 3;
}

/** One domain classifier chip — activates in turn; the winner stays lit + ✓,
 *  the rest softly dim once classification resolves. */
function DomainChip({ label, variant, isPrimary, index, total, progress }: {
  label: string;
  variant: BadgeVariant;
  isPrimary: boolean;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const span  = CLASS[1] - CLASS[0];
  const start = CLASS[0] + (index / total) * span * 0.7;
  const end   = start + span * 0.3;

  const opacity = useTransform(
    progress,
    isPrimary ? [start, end] : [start, end, CLASS[1], CLASS[1] + 0.05],
    isPrimary ? [0.3, 1]     : [0.3, 1, 1, 0.4],
    { clamp: true },
  );
  const check = useTransform(progress, [CLASS[1] - 0.02, CLASS[1]], [0, 1], { clamp: true });

  return (
    <m.div style={{ opacity }} className="flex items-center gap-1">
      <Badge variant={variant} size="sm" uppercase={false}>{label}</Badge>
      {isPrimary && (
        <m.span style={{ opacity: check }} className="material-symbols-outlined text-[13px] text-conf-high">
          check
        </m.span>
      )}
    </m.div>
  );
}

/** One surfaced insight, built from the Card primitive (static info surface). */
function InsightCard({ label, icon, index, total, progress }: {
  label: string;
  icon: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const span  = INS[1] - INS[0];
  const start = INS[0] + (index / total) * span * productMotion.revealSpread;
  const end   = start + span * productMotion.revealItemSpan;
  const opacity = useTransform(progress, [start, end], [0, 1], { clamp: true });
  const y       = useTransform(progress, [start, end], [productMotion.revealY, 0], { clamp: true });

  return (
    <m.div style={{ opacity, y }}>
      <Card variant="info" noPadding className="flex items-center gap-1.5 px-2 py-1.5">
        <span className="material-symbols-outlined text-[13px] text-gold-primary">{icon}</span>
        <span className="font-sans text-[10px] leading-snug text-text-secondary">{label}</span>
      </Card>
    </m.div>
  );
}

/**
 * IntelligenceShowcase — a miniature version of Proxima's intelligence layer,
 * appearing to perform a complete analysis on a document.
 *
 * Driven entirely by the shared ProductShowcase progress (FXClock): the status
 * header advances (scanning → running models → calculating confidence → ready),
 * the confidence ring fills (0 → 97), four domains classify in turn (Clinical
 * wins, the rest dim), entities extract one by one, the risk badge settles,
 * three insight cards surface, and the processing pipeline fills node by node.
 * Built from the shared product primitives (header, ring, metric, reveal rows,
 * pipeline); no own timer / animation loop; only transform + opacity + SVG
 * stroke. Decorative (aria-hidden); all content from productData.
 */
export function IntelligenceShowcase() {
  const { progress } = useShowcase();
  const conf     = productData.confidence;
  const dom      = productData.domain;
  const ents     = productData.entity.items;
  const risk     = productData.risk;
  const insights = productData.insights;
  const steps    = productData.timeline.steps;

  // Status stage — re-renders only when crossing a threshold (setState bails otherwise).
  const [stage, setStage] = useState(() => stageFor(progress.get()));
  useMotionValueEvent(progress, 'change', (p) => setStage(stageFor(p)));

  const reveal = useShowcaseReveal(progress);

  // Confidence ring — 0 → final over the middle of Animate.
  const score = useTransform(progress, CONF, [0, conf.final] as number[], { clamp: true });

  // Risk — interim assessment appears then crossfades to the settled verdict.
  const riskSpan    = RISK[1] - RISK[0];
  const riskInterim = useTransform(progress, [RISK[0], RISK[0] + riskSpan * 0.3, RISK[0] + riskSpan * 0.62], [0, 1, 0], { clamp: true });
  const riskFinal   = useTransform(progress, [RISK[0] + riskSpan * 0.5, RISK[1]], [0, 1], { clamp: true });

  return (
    <m.div aria-hidden="true" style={{ opacity: reveal }} className="flex w-full max-w-md flex-col gap-3">
      <ProductHeader state={STATE[stage]} status={STATUS[stage]} label="proxima · intelligence" />

      {/* Assessment row — confidence + domain classification + risk */}
      <div className="grid grid-cols-[auto_1fr] items-center gap-4 rounded-lg border border-border bg-surface/60 p-3">
        <ProductRing value={score} size={56} label="Confidence" />

        <div className="flex flex-col gap-2">
          <ProductMetric label="Domain">
            <div className="flex flex-wrap gap-1.5">
              {dom.domains.map((d, i) => (
                <DomainChip
                  key={d.label}
                  label={d.label}
                  variant={d.variant as BadgeVariant}
                  isPrimary={d.label === dom.primary}
                  index={i}
                  total={dom.domains.length}
                  progress={progress}
                />
              ))}
            </div>
          </ProductMetric>
          <ProductMetric label="Risk">
            <div className="relative grid w-fit">
              <m.span style={{ opacity: riskInterim }} className="col-start-1 row-start-1">
                <Badge variant={risk.interim.variant as BadgeVariant} size="sm">{risk.interim.label}</Badge>
              </m.span>
              <m.span style={{ opacity: riskFinal }} className="col-start-1 row-start-1">
                <Badge variant={risk.final.variant as BadgeVariant} size="sm">{risk.final.label}</Badge>
              </m.span>
            </div>
          </ProductMetric>
        </div>
      </div>

      {/* Entities + insights */}
      <div className="grid grid-cols-2 gap-3">
        <ProductMetric label="Entities" className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="flex flex-col gap-1">
            {ents.map((e, i) => (
              <ProductRevealRow key={e.label} range={ENT} index={i} total={ents.length} progress={progress} trailing={e.type}>
                {e.label}
              </ProductRevealRow>
            ))}
          </div>
        </ProductMetric>
        <ProductMetric label="Insights" className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="flex flex-col gap-1.5">
            {insights.map((ins, i) => (
              <InsightCard key={ins.label} label={ins.label} icon={ins.icon} index={i} total={insights.length} progress={progress} />
            ))}
          </div>
        </ProductMetric>
      </div>

      {/* Processing pipeline */}
      <ProductMetric label="Pipeline" className="rounded-lg border border-border bg-surface/60 px-3 pb-7 pt-2.5">
        <ProductPipeline steps={steps} progress={progress} />
      </ProductMetric>
    </m.div>
  );
}
