import { motion, useTransform } from 'framer-motion';
import { useHeroConfidence } from '@/components/landing/hero-engine/heroSelectors';
import { HeroCounter } from '../HeroCounter';

/* ── Confidence ring geometry ────────────────────────────────────────────── */
const RING   = 76;
const STROKE = 5;
const RADIUS = (RING - STROKE * 2) / 2;          // 33
const CIRCUM = 2 * Math.PI * RADIUS;             // ≈ 207.3

/**
 * ConfidencePanel — the confidence ring, now driven by the Hero engine.
 *
 * When confidence begins, the gold stroke draws progressively (SVG
 * stroke-dashoffset, premium ease, no overshoot), the score counts 0 → final
 * via HeroCounter, and the "High" label fades in once the score settles. Before
 * the confidence phase the panel is just the empty track; under reduced motion
 * it renders fully settled. Ring color is the existing conf-high token.
 */
export function ConfidencePanel() {
  const { progress, score, label } = useHeroConfidence();
  const offset = CIRCUM * (1 - score / 100);

  const dashoffset    = useTransform(progress, [0, 1], [CIRCUM, offset]);
  const contentOpacity = useTransform(progress, [0, 0.06], [0, 1], { clamp: true });
  const labelOpacity   = useTransform(progress, [0.7, 1], [0, 1], { clamp: true });

  return (
    <div className="flex items-center justify-center rounded-xl border border-border/70 bg-void/60 px-4 shadow-[inset_0_2px_6px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(0,0,0,0.3)]">
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
              style={{ strokeDashoffset: dashoffset }}
            />
          </g>
        </svg>

        {/* Score + label overlay — fades in with the draw */}
        <motion.div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ opacity: contentOpacity }}
        >
          <span className="font-mono text-[17px] font-semibold text-text-primary tabular-nums">
            <HeroCounter value={progress} scale={score} suffix="%" />
          </span>
          <motion.span
            className="font-sans text-[10px] font-medium uppercase tracking-wider text-conf-high"
            style={{ opacity: labelOpacity }}
          >
            {label}
          </motion.span>
        </motion.div>
      </div>
    </div>
  );
}
