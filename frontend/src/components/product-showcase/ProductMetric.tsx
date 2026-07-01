import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface ProductMetricProps {
  /** Uppercase section/metric label. */
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * ProductMetric — a labelled block: one uppercase caption over its content.
 * The single visual language for every labelled region across the showcases
 * (confidence, differences, entities, risk, routing score, signals, pipeline),
 * so labels and spacing read identically on all three screens.
 */
export function ProductMetric({ label, children, className }: ProductMetricProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="font-sans text-[9px] uppercase tracking-wider text-text-muted">{label}</span>
      {children}
    </div>
  );
}
