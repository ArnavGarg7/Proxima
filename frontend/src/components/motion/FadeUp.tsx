import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { duration, easeArr, stagger } from '@/theme/motion';

interface FadeUpProps {
  children: React.ReactNode;
  className?: string;
  /** Base delay in seconds */
  delay?: number;
  /** Stagger index — auto-offset using stagger.base */
  index?: number;
}

const makeVariants = (delay: number) => ({
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: duration.slow / 1000, ease: easeArr.out, delay } },
});

/**
 * FadeUp — opacity 0 → 1 with subtle upward lift (y: 8 → 0).
 *
 * Use for: cards, panels, section content, results appearing.
 */
export function FadeUp({ children, className, delay = 0, index = 0 }: FadeUpProps) {
  const reduced      = useReducedMotion();
  const totalDelay   = delay + index * stagger.base;

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={makeVariants(totalDelay)}
    >
      {children}
    </m.div>
  );
}
