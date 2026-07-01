import { useState } from 'react';
import { m, useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/cn';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { HeroCounter } from '@/components/landing/hero/HeroCounter';
import { ProductHeader } from './ProductHeader';
import { ProductMetric } from './ProductMetric';
import { ProductRevealRow } from './ProductRevealRow';
import type { ProductStatus } from './ProductStatusChip';
import { useShowcase } from './ProductShowcaseContext';
import { useShowcaseReveal } from './useShowcaseReveal';
import { INIT_END, COMPLETE_WINDOW, animSpan } from './productTimeline';
import { productData } from './productData';

/* Overlapping sub-sequences of the Animate phase: extract signals → score the
   specialist models → select the expert; the decision resolves at the tail. */
const SIG    = animSpan(0,    0.45);
const SCORE  = animSpan(0.30, 0.80);
const SELECT = animSpan(0.78, 1);
const DECISION = animSpan(0.80, 1);

/* ── Routing status progression ───────────────────────────────────────────── */
const STATE: ProductStatus[] = ['waiting', 'processing', 'complete', 'ready'];

function stageFor(p: number): number {
  if (p < INIT_END)           return 0; // Waiting
  if (p < SELECT[0])          return 1; // Routing…
  if (p < COMPLETE_WINDOW[0]) return 2; // <winner> Analyzer Selected
  return 3;                              // Analyzer Ready
}

/** Icon tint per specialist model (matches its Badge identity). */
const ICON_COLOR: Record<string, string> = {
  info:           'text-domain-medical',
  'domain-legal': 'text-domain-legal',
  'domain-code':  'text-domain-code',
  default:        'text-text-muted',
};

/** One specialist model row — confidence bar + counting percentage; the winner
 *  fills gold and gains a check as it's selected. */
function ModelRow({ label, icon, variant, score, selected, progress }: {
  label: string;
  icon: string;
  variant: BadgeVariant;
  score: number;
  selected: boolean;
  progress: MotionValue<number>;
}) {
  const widthPct = useTransform(progress, SCORE, ['0%', `${score}%`], { clamp: true });
  const pct      = useTransform(progress, SCORE, [0, score] as number[], { clamp: true });
  const check    = useTransform(progress, [SELECT[0], SELECT[0] + (SELECT[1] - SELECT[0]) * 0.5], [0, 1], { clamp: true });

  return (
    <div className="flex items-center gap-2">
      <span className={cn('material-symbols-outlined text-[14px]', ICON_COLOR[variant] ?? 'text-text-muted')}>{icon}</span>
      <span className={cn('w-12 shrink-0 font-sans text-[10px]', selected ? 'font-medium text-text-primary' : 'text-text-secondary')}>
        {label}
      </span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <m.div style={{ width: widthPct }} className={cn('h-full rounded-full', selected ? 'bg-gold-primary' : 'bg-text-muted/40')} />
      </div>
      <span className={cn('w-8 text-right font-mono text-[10px] font-semibold tabular-nums', selected ? 'text-gold-primary' : 'text-text-secondary')}>
        <HeroCounter value={pct} suffix="%" />
      </span>
      {selected
        ? <m.span style={{ opacity: check }} className="material-symbols-outlined w-3.5 text-[13px] text-conf-high">check</m.span>
        : <span className="w-3.5" />}
    </div>
  );
}

/**
 * RoutingShowcase — a live AI decision engine, choosing the specialist analyzer
 * for an incoming document.
 *
 * Driven entirely by the shared ProductShowcase progress (FXClock): the document
 * is received (muted → AI badge → processing), signals extract one by one, four
 * specialist models score in parallel (Clinical wins; bars fill, percentages
 * count via HeroCounter), the decision panel resolves, routing confirms, and the
 * Clinical analyzer activates. Built from the shared product primitives (header,
 * metric, reveal rows); no own timer / animation loop; only transform + opacity
 * + bar width. Decorative (aria-hidden); all content from productData.routing.
 */
export function RoutingShowcase() {
  const { progress } = useShowcase();
  const { document: doc, signals, models, decision } = productData.routing;
  const winner = models.find((mdl) => mdl.selected) ?? models[0];

  // Routing status — re-renders only when the stage changes (setState bails otherwise).
  const [stage, setStage] = useState(() => stageFor(progress.get()));
  useMotionValueEvent(progress, 'change', (p) => setStage(stageFor(p)));

  const statusLabel = stage === 0 ? 'Waiting'
    : stage === 1 ? 'Routing…'
    : stage === 2 ? `${winner.label} Analyzer Selected`
    : 'Analyzer Ready';

  const reveal = useShowcaseReveal(progress);

  // Incoming document — muted → received (brightens) → AI badge.
  const docBright = useTransform(progress, [0, INIT_END], [0.45, 1], { clamp: true });
  const docBadge  = useTransform(progress, [INIT_END * 0.5, INIT_END], [0, 1], { clamp: true });

  // Decision panel + analyzer card — reveal after scoring resolves.
  const decisionOpacity = useTransform(progress, DECISION, [0, 1], { clamp: true });
  const analyzerReveal  = useTransform(progress, [animSpan(0.95, 1)[0], COMPLETE_WINDOW[1]], [0.4, 1], { clamp: true });
  const analyzerActive  = stage >= 2;

  return (
    <m.div aria-hidden="true" style={{ opacity: reveal }} className="flex w-full max-w-md flex-col gap-3">
      <ProductHeader state={STATE[stage]} status={statusLabel} label="proxima · routing" />

      {/* Incoming document + extracted signals */}
      <div className="grid grid-cols-[auto_1fr] gap-3">
        <m.div
          style={{ opacity: docBright }}
          className={cn(
            'flex w-24 flex-col items-center gap-1 rounded-lg border bg-surface/60 p-3 transition-colors',
            stage >= 1 ? 'border-gold-primary/30' : 'border-border',
          )}
        >
          <span className="material-symbols-outlined text-[24px] text-text-secondary">description</span>
          <span className="font-mono text-[10px] text-text-primary">{doc.name}</span>
          <span className="font-sans text-[8px] uppercase tracking-wider text-text-muted">{doc.type}</span>
          <m.span style={{ opacity: docBadge }} className="mt-0.5">
            <Badge variant="info" size="sm" uppercase={false}>AI routing</Badge>
          </m.span>
        </m.div>

        <ProductMetric label="Signals" className="rounded-lg border border-border bg-surface/60 p-3">
          <div className="flex flex-col gap-1">
            {signals.map((s, i) => (
              <ProductRevealRow key={s} range={SIG} index={i} total={signals.length} progress={progress}>
                {s}
              </ProductRevealRow>
            ))}
          </div>
        </ProductMetric>
      </div>

      {/* Domain scoring — specialist models evaluated in parallel */}
      <ProductMetric label="Domain scoring" className="rounded-lg border border-border bg-surface/60 p-3">
        <div className="flex flex-col gap-1.5">
          {models.map((mdl) => (
            <ModelRow
              key={mdl.label}
              label={mdl.label}
              icon={mdl.icon}
              variant={mdl.variant as BadgeVariant}
              score={mdl.score}
              selected={mdl.selected}
              progress={progress}
            />
          ))}
        </div>
      </ProductMetric>

      {/* AI decision + analyzer activation */}
      <div className="grid grid-cols-2 gap-3">
        <m.div style={{ opacity: decisionOpacity }} className="flex flex-col gap-0.5 rounded-lg border border-gold-primary/30 bg-gold-primary/5 p-3">
          <span className="font-sans text-[8px] uppercase tracking-wider text-text-muted">{decision.headline}</span>
          <span className="font-display text-sm font-semibold text-text-primary">{decision.label}</span>
          <span className="font-mono text-lg font-bold text-gold-primary tabular-nums">{winner.score}%</span>
          <span className="font-sans text-[9px] leading-snug text-text-secondary">{decision.reason}</span>
        </m.div>

        <m.div
          style={{ opacity: analyzerReveal }}
          className={cn(
            'flex flex-col justify-center gap-1.5 rounded-lg border p-3 transition-colors',
            analyzerActive ? 'border-gold-primary/40 bg-gold-primary/5' : 'border-border bg-surface/60',
          )}
        >
          <span className="flex items-center gap-1.5">
            <span className={cn('material-symbols-outlined text-[15px]', analyzerActive ? 'text-gold-primary' : 'text-text-muted')}>memory</span>
            <span className="font-sans text-[11px] font-medium text-text-primary">{winner.label} Analyzer</span>
          </span>
          <Badge variant={stage >= 3 ? 'success' : analyzerActive ? 'info' : 'default'} size="sm">
            {stage >= 3 ? 'Ready' : analyzerActive ? 'Active' : 'Inactive'}
          </Badge>
        </m.div>
      </div>
    </m.div>
  );
}
