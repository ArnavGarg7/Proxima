/**
 * ConfidenceCard — premium metric card for the Average Confidence stat.
 * Renders an animated circular progress ring alongside the count-up number.
 * Replaces the plain DashboardStatCard for this focal metric.
 */

import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { useCountUp } from '@/hooks/useCountUp';
import { duration } from '@/theme/motion';

interface ConfidenceCardProps {
  value: number; // 0–100
}

/* ── Ring geometry ──────────────────────────────────────────────────────────── */
const RING_SIZE   = 48;
const STROKE_W    = 2.5;
const RADIUS      = (RING_SIZE - STROKE_W * 2) / 2; // 21.5
const CIRCUMF     = 2 * Math.PI * RADIUS;            // ≈ 135.1

function accentColor(v: number): 'success' | 'warning' | 'error' {
  if (v >= 85) return 'success';
  if (v >= 70) return 'warning';
  return 'error';
}

/* Uses CSS custom properties so we stay in the token system */
function ringStroke(v: number): string {
  if (v >= 85) return 'var(--color-conf-high)';
  if (v >= 70) return 'var(--color-conf-amber)';
  return 'var(--color-conf-critical)';
}

/* ── Framer Motion ease — bezier arrays matching motion.ts ease.out ─────────── */
const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];

export function ConfidenceCard({ value }: ConfidenceCardProps) {
  const reduced = useReducedMotion() ?? false;

  /* Count-up — from 0 to value, 400ms after a 250ms delay */
  const displayed = useCountUp(Math.round(value), {
    duration:  duration.enter,         // 400ms
    delay:     reduced ? 0 : duration.slow, // 250ms — after card stagger settles
    immediate: reduced,
  });

  /* Ring offset — 0 = full, CIRCUMF = empty */
  const targetOffset = CIRCUMF * (1 - value / 100);

  return (
    <Card
      variant="metric"
      accentColor={accentColor(value)}
      className="flex flex-col gap-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[0_6px_24px_rgba(0,0,0,0.5)]"
    >
      {/* Label row + ring */}
      <div className="flex items-start justify-between gap-2">
        <span className="font-sans text-xs font-medium uppercase tracking-widest text-text-muted">
          Avg Confidence
        </span>

        {/*
         * SVG ring — track + animated progress arc.
         * The <g> rotates start position to 12 o'clock (standard clock direction).
         */}
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          aria-hidden="true"
          className="shrink-0 -mt-0.5 -mr-0.5"
        >
          {/* Background track */}
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke="var(--color-border)"
            strokeWidth={STROKE_W}
          />

          {/* Animated progress arc */}
          <g transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}>
            <motion.circle
              cx={RING_SIZE / 2}
              cy={RING_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringStroke(value)}
              strokeWidth={STROKE_W}
              strokeLinecap="round"
              strokeDasharray={CIRCUMF}
              initial={{ strokeDashoffset: CIRCUMF }}
              animate={{ strokeDashoffset: reduced ? targetOffset : targetOffset }}
              transition={
                reduced
                  ? { duration: 0 }
                  : {
                      duration: duration.enter / 1000,  // 0.4s
                      ease:     EASE_OUT,
                      delay:    duration.slow / 1000,   // 0.25s
                    }
              }
            />
          </g>
        </svg>
      </div>

      {/* Count-up value */}
      <div
        className="font-display text-[2rem] font-semibold leading-none text-text-primary tabular-nums"
        aria-label={`Average confidence: ${value}%`}
      >
        {displayed}%
      </div>
    </Card>
  );
}
