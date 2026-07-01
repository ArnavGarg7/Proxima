import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { EASE_OUT } from './landingMotion';
import { duration } from '@/theme/motion';

/* Dynamic variant — accepts a per-instance delay via `custom` */
const revealVariants = {
  hidden:  { opacity: 0, y: 18 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: duration.enter / 1000, ease: EASE_OUT, delay },
  }),
};

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger offset in seconds */
  delay?: number;
  /** Fraction of the element that must be visible before it reveals */
  amount?: number;
}

/**
 * Reveal — fades + lifts its children into view on scroll, once.
 *
 * Honors prefers-reduced-motion by rendering a plain div (no transform,
 * fully visible from the start).
 */
export function Reveal({ children, className, delay = 0, amount = 0.25 }: RevealProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      variants={revealVariants}
      custom={delay}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
    >
      {children}
    </motion.div>
  );
}
