import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { ProductShowcase } from '@/components/product-showcase/ProductShowcase';
import { CompareShowcase } from '@/components/product-showcase/CompareShowcase';
import { IntelligenceShowcase } from '@/components/product-showcase/IntelligenceShowcase';
import { RoutingShowcase } from '@/components/product-showcase/RoutingShowcase';
import { Reveal } from './Reveal';
import { duration } from '@/theme/motion';
import { EASE_OUT } from './landingMotion';

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
    visual:  <ProductShowcase type="routing"><RoutingShowcase /></ProductShowcase>,
  },
  {
    eyebrow: 'Quantified confidence',
    title:   'Every answer comes with a score',
    desc:    'Each extraction is graded for reliability so you know exactly what to trust — and what to review. Low-confidence findings are surfaced, not hidden.',
    bullets: ['Per-field confidence scoring', 'Hallucination-risk flags', 'Reviewer-ready output'],
    chrome:  'proxima · confidence',
    visual:  <ProductShowcase type="confidence"><IntelligenceShowcase /></ProductShowcase>,
  },
  {
    eyebrow: 'Compare & audit',
    title:   'See what changed, instantly',
    desc:    'Diff two versions of a contract or audit a single document for quality. Material changes and risk areas are highlighted side by side.',
    bullets: ['Clause-level comparison', 'Deterministic audit pass', 'Change highlighting'],
    chrome:  'proxima · compare',
    visual:  <ProductShowcase type="compare"><CompareShowcase /></ProductShowcase>,
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
