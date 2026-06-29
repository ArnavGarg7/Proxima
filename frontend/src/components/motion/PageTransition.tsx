import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { motionVariants } from '@/theme/motion';

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageTransition — wraps a page's root element with a subtle fade + lift.
 *
 * Use at the root of each page component. Does not affect layout.
 * Honors prefers-reduced-motion.
 *
 * @example
 * export default function Dashboard() {
 *   return (
 *     <PageTransition className="flex flex-col flex-1 min-w-0 overflow-y-auto">
 *       ...
 *     </PageTransition>
 *   );
 * }
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <m.div
      className={className}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={motionVariants.page}
    >
      {children}
    </m.div>
  );
}
