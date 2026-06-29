import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { duration, easeArr, lift, scale } from '@/theme/motion';
import { cn } from '@/lib/cn';

interface HoverCardProps {
  children: React.ReactNode;
  className?: string;
  /** Remove the press-down scale (for non-clickable cards) */
  noPress?: boolean;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
  style?: React.CSSProperties;
  tabIndex?: number;
  role?: string;
  'aria-label'?: string;
}

/**
 * HoverCard — motion.div with the standard card hover behavior.
 *
 * Hover: translateY(-2px)
 * Press: scale(0.99)
 *
 * Use this when you need Framer Motion whileHover for cards that can't
 * use Tailwind motion-safe: classes (e.g., when transforms conflict).
 * For most cases, Card variant="interactive" is sufficient.
 */
export function HoverCard({ children, className, noPress = false, ...rest }: HoverCardProps) {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: lift.card }}
      whileTap={noPress ? undefined : { scale: scale.cardPress }}
      transition={{ duration: duration.fast / 1000, ease: easeArr.out }}
      className={cn('will-change-transform', className)}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
