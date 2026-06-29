import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { duration, easeArr } from '@/theme/motion';

interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  /** Delay in seconds */
  delay?: number;
  /** When provided, wraps in AnimatePresence so exit animation plays */
  show?: boolean;
}

const makeVariants = (delay: number) => ({
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: duration.base / 1000, ease: easeArr.out, delay } },
  exit:    { opacity: 0, transition: { duration: duration.fast / 1000, ease: easeArr.in } },
});

const staticVariants = { hidden: {}, visible: {}, exit: {} };

/**
 * FadeIn — opacity 0 → 1.
 *
 * Use for: toasts, inline status messages, overlays, new content appearing.
 * When `show` is provided, wraps in AnimatePresence for exit animation.
 */
export function FadeIn({ children, className, delay = 0, show }: FadeInProps) {
  const reduced   = useReducedMotion();
  const variants  = reduced ? staticVariants : makeVariants(delay);

  if (show !== undefined) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div className={className} initial="hidden" animate="visible" exit="exit" variants={variants}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div className={className} initial="hidden" animate="visible" variants={variants}>
      {children}
    </motion.div>
  );
}
