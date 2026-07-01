import React, { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { duration, easeArr } from '@/theme/motion';

interface AnalysisInspectorProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * AnalysisInspector — the right-hand information companion.
 *
 * On mobile (< lg) the content is hidden behind a collapsible toggle.
 * The expand/collapse animates the content in with a fade + slide.
 * On lg+ it is always visible and sticky.
 */
export function AnalysisInspector({ children, className }: AnalysisInspectorProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduced = useReducedMotion();

  const contentVariants = reduced
    ? { hidden: {}, visible: {} }
    : {
        hidden:  { opacity: 0, y: -6 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: duration.slow / 1000, ease: easeArr.out },
        },
      };

  return (
    <aside aria-label="Analysis details" className={cn('flex flex-col gap-4', className)}>
      {/* Mobile toggle — hidden on lg+ */}
      <button
        type="button"
        className={cn(
          'flex lg:hidden items-center justify-between w-full py-1 text-left',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 rounded-md',
        )}
        onClick={() => setMobileOpen((o) => !o)}
        aria-expanded={mobileOpen}
        aria-controls="inspector-content"
      >
        <span className="font-sans text-sm font-medium text-text-primary">Analysis Details</span>
        <span
          className={cn(
            'material-symbols-outlined text-[20px] text-text-muted',
            'motion-safe:transition-transform motion-safe:duration-200',
            mobileOpen && 'rotate-180',
          )}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {/* Content: always visible on lg+, animated on mobile */}
      <div id="inspector-content" className="hidden lg:flex flex-col gap-4">
        {children}
      </div>

      {/* Mobile animated content */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="flex lg:hidden flex-col gap-4"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={contentVariants}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </aside>
  );
}

interface InspectorStatProps {
  icon?: string;
  label: string;
  value: React.ReactNode;
}

/**
 * InspectorStat — a single label/value row for use inside inspector Panels.
 */
export function InspectorStat({ icon, label, value }: InspectorStatProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 font-sans text-sm text-text-secondary">
        {icon && (
          <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">
            {icon}
          </span>
        )}
        {label}
      </span>
      <span className="font-mono text-sm tabular-nums text-text-primary">{value}</span>
    </div>
  );
}
