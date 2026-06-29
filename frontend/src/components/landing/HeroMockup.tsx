import { motion, useReducedMotion } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useCountUp } from '@/hooks/useCountUp';
import { duration } from '@/theme/motion';
import { cn } from '@/lib/cn';
import { EASE_OUT } from './landingMotion';

/* ── Confidence ring geometry ────────────────────────────────────────────── */
const RING   = 76;
const STROKE = 5;
const RADIUS = (RING - STROKE * 2) / 2;          // 33
const CIRCUM = 2 * Math.PI * RADIUS;             // ≈ 207.3
const SCORE  = 97;
const OFFSET = CIRCUM * (1 - SCORE / 100);

/* ── Analysis pipeline rows ──────────────────────────────────────────────── */
const PIPELINE = [
  { label: 'Entities extracted',  state: 'done' as const },
  { label: 'Risk assessment',     state: 'done' as const },
  { label: 'Confidence scoring',  state: 'active' as const },
];

/**
 * HeroMockup — a faux product surface that previews what Proxima does.
 *
 * Built entirely from the design system (Card surfaces, Badge, tokens) rather
 * than a static image. Stage 4.4B adds subtle life: the ring draws in, metrics
 * count up, the live dot pulses, the upload bar fills, and a caret blinks.
 *
 * The whole panel is aria-hidden so screen readers skip the mock data, and all
 * motion is disabled under prefers-reduced-motion.
 */
export function HeroMockup() {
  const reduced = useReducedMotion() ?? false;

  const score    = useCountUp(SCORE, { duration: duration.enter * 3, delay: duration.page, immediate: reduced });
  const entities = useCountUp(128,   { duration: duration.enter * 3, delay: duration.page, immediate: reduced });
  const risk     = useCountUp(2,     { duration: duration.enter * 2, delay: duration.page, immediate: reduced });
  const progress = useCountUp(68,    { duration: duration.enter * 2, delay: duration.slow, immediate: reduced });

  return (
    <div aria-hidden="true" className="relative select-none">
      {/* Ambient lift glow behind the panel */}
      <div className="absolute -inset-6 rounded-[28px] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.10)_0%,transparent_70%)] blur-xl" />

      {/* Window frame */}
      <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-surface/90 shadow-[0_24px_64px_rgba(0,0,0,0.55)] backdrop-blur-sm">

        {/* Title bar */}
        <div className="flex items-center gap-3 border-b border-border bg-elevated/60 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-conf-critical/60" />
            <span className="h-3 w-3 rounded-full bg-conf-amber/60" />
            <span className="h-3 w-3 rounded-full bg-conf-high/60" />
          </div>
          <div className="ml-2 flex items-center gap-2 rounded-md border border-border bg-void/60 px-2.5 py-1">
            <span className="material-symbols-outlined text-[13px] text-text-muted">lock</span>
            <span className="font-mono text-[11px] text-text-muted">proxima.ai / analysis</span>
          </div>
          {/* Live badge — pulsing dot */}
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-conf-high/10 px-2 py-0.5">
            <motion.span
              className="h-1.5 w-1.5 rounded-full bg-conf-high"
              animate={reduced ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
              transition={reduced ? undefined : { duration: 1.8, ease: 'easeInOut', repeat: Infinity }}
            />
            <span className="font-sans text-[10px] font-medium uppercase tracking-wider text-conf-high">
              Live
            </span>
          </span>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5">

          {/* Document header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
                Document Analysis
              </span>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-domain-medical">
                  description
                </span>
                <span className="font-sans text-sm font-semibold text-text-primary">
                  Clinical_Trial_Report.pdf
                </span>
                {/* Blinking caret */}
                <motion.span
                  className="inline-block h-3.5 w-px bg-gold-primary"
                  animate={reduced ? undefined : { opacity: [1, 1, 0, 0] }}
                  transition={reduced ? undefined : { duration: 1.1, ease: 'linear', repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
                />
              </div>
            </div>
            <Badge variant="domain-medical" size="sm">Medical</Badge>
          </div>

          {/* Confidence + metrics row */}
          <div className="grid grid-cols-[auto_1fr] gap-4">
            {/* Ring */}
            <div className="flex items-center justify-center rounded-xl border border-border bg-void/40 px-4">
              <div className="relative flex items-center justify-center">
                <svg width={RING} height={RING} viewBox={`0 0 ${RING} ${RING}`}>
                  <circle
                    cx={RING / 2}
                    cy={RING / 2}
                    r={RADIUS}
                    fill="none"
                    stroke="var(--color-border)"
                    strokeWidth={STROKE}
                  />
                  <g transform={`rotate(-90 ${RING / 2} ${RING / 2})`}>
                    <motion.circle
                      cx={RING / 2}
                      cy={RING / 2}
                      r={RADIUS}
                      fill="none"
                      stroke="var(--color-conf-high)"
                      strokeWidth={STROKE}
                      strokeLinecap="round"
                      strokeDasharray={CIRCUM}
                      initial={{ strokeDashoffset: reduced ? OFFSET : CIRCUM }}
                      animate={{ strokeDashoffset: OFFSET }}
                      transition={reduced ? { duration: 0 } : { duration: duration.enter * 3 / 1000, ease: EASE_OUT, delay: duration.page / 1000 }}
                    />
                  </g>
                  <text
                    x="50%"
                    y="50%"
                    dominantBaseline="central"
                    textAnchor="middle"
                    className="fill-text-primary font-mono"
                    style={{ fontSize: '17px', fontWeight: 600 }}
                  >
                    {score}%
                  </text>
                </svg>
              </div>
            </div>

            {/* Metric stack */}
            <div className="flex flex-col justify-center gap-2">
              {[
                { k: 'Confidence', v: 'High'             },
                { k: 'Entities',   v: String(entities)   },
                { k: 'Risk flags', v: String(risk)       },
              ].map((m) => (
                <div key={m.k} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
                  <span className="font-sans text-xs text-text-muted">{m.k}</span>
                  <span className="font-mono text-xs font-semibold text-text-primary tabular-nums">{m.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Detected domains */}
          <div className="flex flex-col gap-2">
            <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
              Detected Domains
            </span>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="domain-medical" size="sm">Medical</Badge>
              <Badge variant="domain-legal"   size="sm">Legal</Badge>
              <Badge variant="info"           size="sm">Clinical</Badge>
            </div>
          </div>

          {/* Pipeline timeline */}
          <div className="flex flex-col gap-2.5">
            {PIPELINE.map((step) => (
              <div key={step.label} className="flex items-center gap-2.5">
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    step.state === 'done'
                      ? 'border-conf-high/40 bg-conf-high/15'
                      : 'border-gold-primary/40 bg-gold-primary/10',
                  )}
                >
                  {step.state === 'done' ? (
                    <span className="material-symbols-outlined text-[11px] text-conf-high">check</span>
                  ) : (
                    <motion.span
                      className="material-symbols-outlined text-[11px] text-gold-primary"
                      animate={reduced ? undefined : { rotate: 360 }}
                      transition={reduced ? undefined : { duration: 2, ease: 'linear', repeat: Infinity }}
                    >
                      autorenew
                    </motion.span>
                  )}
                </span>
                <span className="font-sans text-xs text-text-secondary">{step.label}</span>
                {step.state === 'active' && (
                  <span className="ml-auto font-sans text-[10px] text-text-muted">processing…</span>
                )}
              </div>
            ))}
          </div>

          {/* Upload footer — filling bar */}
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-void/40 p-3">
            <div className="flex items-center justify-between">
              <span className="font-sans text-xs text-text-secondary">Uploading Contract_v2.docx</span>
              <span className="font-mono text-[11px] text-text-muted tabular-nums">{progress}%</span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-border">
              <motion.div
                className="h-full origin-left rounded-full bg-gold-primary skeleton-shimmer"
                style={{ width: '68%' }}
                initial={{ scaleX: reduced ? 1 : 0 }}
                animate={{ scaleX: 1 }}
                transition={reduced ? { duration: 0 } : { duration: duration.enter * 2 / 1000, ease: EASE_OUT, delay: duration.slow / 1000 }}
              />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
