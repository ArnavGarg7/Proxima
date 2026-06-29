import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { confidenceColorVar, confidenceTextClass } from '@/lib/confidence';
import { duration, easeArr } from '@/theme/motion';

export type ConfidenceRingSize = 'sm' | 'md' | 'lg';

interface ConfidenceRingProps {
  /** Confidence score on a 0–100 scale */
  value: number;
  size?: ConfidenceRingSize;
  /** Hide the numeric value in the center */
  hideValue?: boolean;
  className?: string;
}

const DIMS: Record<ConfidenceRingSize, { box: number; stroke: number; font: string }> = {
  sm: { box: 56,  stroke: 5, font: 'text-sm'  },
  md: { box: 88,  stroke: 7, font: 'text-2xl' },
  lg: { box: 120, stroke: 8, font: 'text-3xl' },
};

/**
 * ConfidenceRing — a circular progress indicator for a 0–100 confidence score.
 *
 * Fades in on mount so new results don't pop into view.
 * Color is derived from the confidence tier (high / amber / low / critical).
 * Accessible via role/aria-label.
 */
export function ConfidenceRing({ value, size = 'md', hideValue = false, className }: ConfidenceRingProps) {
  const reduced = useReducedMotion();
  const { box, stroke, font } = DIMS[size];
  const radius  = (box - stroke * 2) / 2;
  const circum  = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  const offset  = circum * (1 - clamped / 100);

  const Wrapper = reduced ? 'div' : motion.div;
  const wrapperProps = reduced
    ? {}
    : {
        initial:   { opacity: 0 },
        animate:   { opacity: 1 },
        transition: { duration: duration.slow / 1000, ease: easeArr.out },
      };

  return (
    <Wrapper
      className={cn('relative inline-flex items-center justify-center', className)}
      role="img"
      aria-label={`Confidence ${Math.round(clamped)} out of 100`}
      {...wrapperProps}
    >
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`}>
        {/* Track */}
        <circle
          cx={box / 2}
          cy={box / 2}
          r={radius}
          fill="none"
          stroke="var(--color-elevated)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <g transform={`rotate(-90 ${box / 2} ${box / 2})`}>
          <circle
            cx={box / 2}
            cy={box / 2}
            r={radius}
            fill="none"
            stroke={confidenceColorVar(clamped)}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circum}
            strokeDashoffset={offset}
          />
        </g>
      </svg>

      {!hideValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn('font-mono font-bold tabular-nums', font, confidenceTextClass(clamped))}>
            {Math.round(clamped)}
          </span>
        </div>
      )}
    </Wrapper>
  );
}
