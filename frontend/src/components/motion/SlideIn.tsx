import React from 'react';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motionVariants } from '@/theme/motion';

interface SlideInProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'left' | 'right';
  show?: boolean;
}

/**
 * SlideIn — directional fade + translate.
 *
 * Use for: drawers, side panels, filter overlays.
 * When `show` is provided wraps in AnimatePresence for exit animation.
 */
export function SlideIn({ children, className, direction = 'left', show }: SlideInProps) {
  const reduced = useReducedMotion();

  const variants = reduced
    ? { hidden: {}, visible: {}, exit: {} }
    : direction === 'right'
      ? motionVariants.slideInRight
      : motionVariants.slideInLeft;

  if (show !== undefined) {
    return (
      <AnimatePresence>
        {show && (
          <m.div
            className={className}
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={variants}
          >
            {children}
          </m.div>
        )}
      </AnimatePresence>
    );
  }

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      {children}
    </m.div>
  );
}
