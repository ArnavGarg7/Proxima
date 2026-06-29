import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motionVariants } from '@/theme/motion';

interface ScaleInProps {
  children: React.ReactNode;
  className?: string;
  show?: boolean;
}

/**
 * ScaleIn — scale 0.97 → 1 with fade.
 *
 * Use for: modals, popovers, dropdowns appearing.
 * When `show` is provided wraps in AnimatePresence for exit animation.
 */
export function ScaleIn({ children, className, show }: ScaleInProps) {
  const reduced = useReducedMotion();

  const variants = reduced
    ? { hidden: {}, visible: {}, exit: {} }
    : motionVariants.scaleIn;

  if (show !== undefined) {
    return (
      <AnimatePresence>
        {show && (
          <motion.div
            className={className}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      {children}
    </motion.div>
  );
}
