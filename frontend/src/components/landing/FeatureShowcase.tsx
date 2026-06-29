import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';
import { duration } from '@/theme/motion';
import { EASE_OUT } from './landingMotion';

/* ─────────────────────────────────────────────────────────────────────────────
   Mini mock visuals — each feature gets a distinct, on-brand panel built from
   tokens (no images). All decorative, hence aria-hidden.
   ──────────────────────────────────────────────────────────────────────────── */

/** Visual 1 — intelligent routing: one document fans out to engines */
function RoutingVisual() {
  const engines = [
    { icon: 'medical_services', label: 'Clinical', cls: 'text-domain-medical', on: true  },
    { icon: 'gavel',            label: 'Legal',    cls: 'text-domain-legal',   on: false },
    { icon: 'code',             label: 'Code',     cls: 'text-domain-code',    on: false },
  ];
  return (
    <div aria-hidden="true" className="flex items-center gap-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex h-14 w-12 items-center justify-center rounded-md border border-border bg-elevated">
          <span className="material-symbols-outlined text-[22px] text-text-secondary">description</span>
        </div>
        <span className="font-mono text-[10px] text-text-muted">report.pdf</span>
      </div>

      <div className="flex flex-col gap-3">
        {engines.map((e) => (
          <div key={e.label} className="flex items-center gap-3">
            <span
              className={cn(
                'h-px w-10',
                e.on ? 'bg-gradient-to-r from-gold-primary/60 to-gold-primary' : 'bg-border',
              )}
            />
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2',
                e.on ? 'border-gold-primary/40 bg-gold-primary/5' : 'border-border bg-surface',
              )}
            >
              <span className={cn('material-symbols-outlined text-[16px]', e.cls)}>{e.icon}</span>
              <span className="font-sans text-xs font-medium text-text-secondary">{e.label}</span>
              {e.on && <span className="ml-1 h-1.5 w-1.5 rounded-full bg-gold-primary" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Visual 2 — quantified confidence: scored extraction rows */
function ConfidenceVisual() {
  const rows = [
    { label: 'Governing law',    pct: 98, variant: 'success' as const },
    { label: 'Payment terms',    pct: 91, variant: 'success' as const },
    { label: 'Liability clause', pct: 74, variant: 'warning' as const },
    { label: 'Ambiguous intent', pct: 42, variant: 'error'   as const },
  ];
  const barColor: Record<string, string> = {
    success: 'bg-conf-high',
    warning: 'bg-conf-amber',
    error:   'bg-conf-critical',
  };
  return (
    <div aria-hidden="true" className="flex w-full max-w-xs flex-col gap-3">
      {rows.map((r) => (
        <div key={r.label} className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs text-text-secondary">{r.label}</span>
            <span className="font-mono text-[11px] font-semibold text-text-primary tabular-nums">{r.pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
            <div className={cn('h-full rounded-full', barColor[r.variant])} style={{ width: `${r.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Visual 3 — compare & audit: side-by-side diff */
function CompareVisual() {
  const left  = ['Net 30 payment', 'Single jurisdiction', 'Auto-renewal'];
  const right = ['Net 45 payment', 'Dual jurisdiction', 'Manual renewal'];
  return (
    <div aria-hidden="true" className="grid w-full max-w-sm grid-cols-2 gap-3">
      {[
        { tag: 'v1', rows: left,  variant: 'default' as const },
        { tag: 'v2', rows: right, variant: 'warning' as const },
      ].map((col) => (
        <div key={col.tag} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-wider text-text-muted">{col.tag}</span>
            <Badge variant={col.variant} size="sm">
              {col.variant === 'warning' ? 'Changed' : 'Base'}
            </Badge>
          </div>
          {col.rows.map((row, i) => (
            <div
              key={row}
              className={cn(
                'rounded border px-2 py-1.5 font-sans text-[11px]',
                col.variant === 'warning' && i !== 0
                  ? 'border-conf-amber/30 bg-conf-amber/5 text-text-primary'
                  : 'border-border bg-void/40 text-text-secondary',
              )}
            >
              {row}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Feature definitions
   ──────────────────────────────────────────────────────────────────────────── */

interface Feature {
  eyebrow:  string;
  title:    string;
  desc:     string;
  bullets:  string[];
  /** Faux app label shown in the visual's chrome bar */
  chrome:   string;
  visual:   React.ReactNode;
}

const FEATURES: Feature[] = [
  {
    eyebrow: 'Intelligent routing',
    title:   'The right engine, automatically',
    desc:    'Proxima reads each document, detects its domain, and routes it to the specialized analyzer best suited to the content — no manual sorting.',
    bullets: ['Automatic domain detection', 'Purpose-built analyzers', 'Zero configuration'],
    chrome:  'proxima · routing',
    visual:  <RoutingVisual />,
  },
  {
    eyebrow: 'Quantified confidence',
    title:   'Every answer comes with a score',
    desc:    'Each extraction is graded for reliability so you know exactly what to trust — and what to review. Low-confidence findings are surfaced, not hidden.',
    bullets: ['Per-field confidence scoring', 'Hallucination-risk flags', 'Reviewer-ready output'],
    chrome:  'proxima · confidence',
    visual:  <ConfidenceVisual />,
  },
  {
    eyebrow: 'Compare & audit',
    title:   'See what changed, instantly',
    desc:    'Diff two versions of a contract or audit a single document for quality. Material changes and risk areas are highlighted side by side.',
    bullets: ['Clause-level comparison', 'Deterministic audit pass', 'Change highlighting'],
    chrome:  'proxima · compare',
    visual:  <CompareVisual />,
  },
];

/**
 * FeatureShowcase — alternating left/right feature rows.
 *
 * Each visual is framed as a mini product window (chrome bar + dots) so it
 * reads as software, not a UI box. Rows reveal on scroll; panels lift on hover.
 */
export function FeatureShowcase() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section id="features" className="relative py-28">
      <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-28 px-6 sm:px-8">
        {FEATURES.map((feat, i) => {
          const reversed = i % 2 === 1;
          return (
            <Reveal
              key={feat.title}
              className="grid grid-cols-1 items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              {/* Copy */}
              <div className={cn('flex flex-col gap-5', reversed && 'lg:order-2')}>
                <span className="font-sans text-xs font-medium uppercase tracking-widest text-gold-primary/80">
                  {feat.eyebrow}
                </span>
                <h2 className="font-display text-3xl font-semibold leading-tight text-text-primary">
                  {feat.title}
                </h2>
                <p className="font-sans text-base leading-relaxed text-text-secondary">
                  {feat.desc}
                </p>
                <ul className="flex flex-col gap-2.5">
                  {feat.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2.5">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/10">
                        <span className="material-symbols-outlined text-[13px] text-gold-primary">check</span>
                      </span>
                      <span className="font-sans text-sm text-text-primary">{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Visual — framed as a mini product window */}
              <div className={cn('flex justify-center lg:justify-start', reversed && 'lg:order-1')}>
                <motion.div
                  whileHover={reduced ? undefined : { y: -6 }}
                  transition={{ duration: duration.slow / 1000, ease: EASE_OUT }}
                  className="group w-full overflow-hidden rounded-2xl border border-border bg-surface/70 shadow-[0_16px_48px_rgba(0,0,0,0.4)] backdrop-blur-sm transition-colors duration-200 hover:border-border-strong"
                >
                  {/* Chrome bar */}
                  <div className="flex items-center gap-2 border-b border-border bg-elevated/50 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-conf-critical/50" />
                    <span className="h-2 w-2 rounded-full bg-conf-amber/50" />
                    <span className="h-2 w-2 rounded-full bg-conf-high/50" />
                    <span className="ml-2 font-mono text-[10px] text-text-muted">{feat.chrome}</span>
                  </div>
                  {/* Visual body */}
                  <div className="flex min-h-[160px] sm:min-h-[200px] items-center justify-center p-4 sm:p-8">
                    {feat.visual}
                  </div>
                </motion.div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
