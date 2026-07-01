import React from 'react';
import { cn } from '@/lib/cn';

interface SectionHeaderProps {
  title: string;
  /** Secondary label or count shown to the right of the title */
  count?: number | string;
  /** Supplementary description below the title */
  description?: string;
  /** Content in the right action slot */
  action?: React.ReactNode;
  /** Show a top border above the section header */
  separated?: boolean;
  className?: string;
}

/**
 * SectionHeader — the label bar above a group of related content.
 * Replaces the `.panel-header` CSS class with a typed, composable component.
 *
 * @example
 * <SectionHeader title="Key Takeaways" count={takeaways.length} />
 * <SectionHeader title="Security Findings" action={<Badge variant="error">3 Critical</Badge>} />
 * <SectionHeader title="Activity" description="Last 30 days" separated />
 */
export function SectionHeader({ title, count, description, action, separated, className }: SectionHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-4',
        separated && 'pt-6 border-t border-border',
        className,
      )}
    >
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-text-muted font-sans">
            {title}
          </span>
          {count !== undefined && (
            <span className="text-xs text-text-muted font-sans tabular-nums">
              ({count})
            </span>
          )}
        </div>
        {description && (
          <span className="text-xs text-text-muted font-sans">{description}</span>
        )}
      </div>

      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
