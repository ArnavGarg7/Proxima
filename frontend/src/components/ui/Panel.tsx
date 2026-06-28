import React from 'react';
import { cn } from '@/lib/cn';

interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Panel title shown in the header strip */
  title?: string;
  /** Optional subtitle below the title */
  subtitle?: string;
  /** Content rendered in the header's right slot (action buttons, badges, etc.) */
  headerAction?: React.ReactNode;
  /** Remove the default body padding */
  noPadding?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Panel — a titled section container with a header strip and padded body.
 * Use for major page sections that need a clear visual boundary.
 *
 * @example
 * <Panel title="Recent Analysis" headerAction={<Button variant="ghost" size="sm">View All</Button>}>
 *   <ActivityTimeline items={timeline} />
 * </Panel>
 */
export function Panel({
  title,
  subtitle,
  headerAction,
  noPadding = false,
  children,
  className,
  ...rest
}: PanelProps) {
  const hasHeader = Boolean(title || headerAction);

  return (
    <div
      className={cn('bg-surface border border-border rounded-lg overflow-hidden', className)}
      {...rest}
    >
      {hasHeader && (
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-elevated/50">
          <div className="flex flex-col gap-0.5">
            {title && (
              <span className="text-xs font-medium uppercase tracking-widest text-text-muted font-sans">
                {title}
              </span>
            )}
            {subtitle && (
              <span className="text-xs text-text-muted font-sans">{subtitle}</span>
            )}
          </div>
          {headerAction && <div className="shrink-0">{headerAction}</div>}
        </div>
      )}

      <div className={cn(!noPadding && 'p-5')}>
        {children}
      </div>
    </div>
  );
}

/**
 * SidebarSection — a variant of Panel designed for narrow sidebar columns.
 * Uses tighter padding and a lighter border.
 */
interface SidebarSectionProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function SidebarSection({ title, children, className, ...rest }: SidebarSectionProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)} {...rest}>
      {title && (
        <span className="text-[10px] font-medium uppercase tracking-widest text-text-muted font-sans px-1">
          {title}
        </span>
      )}
      {children}
    </div>
  );
}
