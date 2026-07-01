import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';

/** Mirrors OutlineItem from AnalysisSidebar — kept local to avoid circular import */
interface MobileOutlineItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface AnalysisLayoutProps {
  /** Full-width page header rendered above the workspace */
  header: React.ReactNode;
  /** Left navigation column — visible on desktop (xl+) only */
  sidebar?: React.ReactNode;
  /** Right inspector column — visible on tablet (lg+) */
  inspector?: React.ReactNode;
  /** Jump-list items shown in the mobile "Contents" accordion (xl:hidden) */
  mobileContents?: MobileOutlineItem[];
  /** Main reading surface */
  children: React.ReactNode;
}

/**
 * AnalysisLayout — the responsive three-panel shell for every analyzer.
 *
 *   Desktop (xl):   [ sidebar | main | inspector ]
 *   Tablet  (lg):   [ main | inspector ]            (sidebar hidden)
 *   Mobile:         stacked  ( main → inspector )   (sidebar hidden)
 *
 * Side columns are sticky so they stay in view while the main surface scrolls.
 * The left sidebar collapses away first (it is pure navigation); the inspector
 * survives down to tablet because it carries the confidence/metadata companion.
 */

/** Mobile jump-list accordion — xl:hidden, rendered inside main */
function MobileContentsNav({ items }: { items: MobileOutlineItem[] }) {
  const [open, setOpen] = useState(false);

  const handleJump = (id: string) => {
    setOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="xl:hidden mb-5">
      <button
        type="button"
        className={cn(
          'flex w-full items-center justify-between rounded-lg border border-border bg-surface px-4 py-3',
          'font-sans text-sm font-medium text-text-secondary transition-colors hover:bg-elevated hover:text-text-primary',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
        )}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-contents-nav"
      >
        <span className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-text-muted" aria-hidden="true">
            list
          </span>
          Contents
        </span>
        <span
          className={cn(
            'material-symbols-outlined text-[20px] text-text-muted',
            'motion-safe:transition-transform motion-safe:duration-200',
            open && 'rotate-180',
          )}
          aria-hidden="true"
        >
          expand_more
        </span>
      </button>

      {open && (
        <nav
          id="mobile-contents-nav"
          aria-label="Page contents"
          className="mt-1 overflow-hidden rounded-lg border border-border bg-surface py-1"
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleJump(item.id)}
              className={cn(
                'flex w-full items-center gap-2.5 px-4 py-2.5 text-left',
                'font-sans text-sm text-text-secondary transition-colors duration-150',
                'hover:bg-elevated hover:text-text-primary',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-inset',
              )}
            >
              {item.icon && (
                <span
                  className="material-symbols-outlined shrink-0 text-[15px] text-text-muted"
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
              )}
              <span className="flex-1 truncate">{item.label}</span>
              {item.count !== undefined && (
                <span className="font-mono text-xs tabular-nums text-text-muted">{item.count}</span>
              )}
            </button>
          ))}
        </nav>
      )}
    </div>
  );
}

export function AnalysisLayout({ header, sidebar, inspector, mobileContents, children }: AnalysisLayoutProps) {
  const reduced = useReducedMotion();
  const cols =
    sidebar && inspector
      ? 'lg:grid-cols-[1fr_320px] xl:grid-cols-[248px_minmax(0,1fr)_320px]'
      : inspector
        ? 'lg:grid-cols-[minmax(0,1fr)_320px]'
        : sidebar
          ? 'xl:grid-cols-[248px_minmax(0,1fr)]'
          : '';

  return (
    <div className="flex-1 min-h-[calc(100vh-60px)] bg-void overflow-x-hidden">
      <m.div
        className="mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8"
        initial={reduced ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
      >

        {/* Header — full width */}
        <header className="mb-6 sm:mb-8">{header}</header>

        {/* Workspace grid */}
        <div className={cn('grid grid-cols-1 gap-6', cols)}>

          {/* Left sidebar — desktop only (xl+) */}
          {sidebar && (
            <div className="hidden xl:block min-w-0">
              <div className="xl:sticky xl:top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pr-1">
                {sidebar}
              </div>
            </div>
          )}

          {/* Main reading surface */}
          <main id="analysis-main" className="min-w-0">
            {/* Mobile jump-list — shows only when mobileContents provided and below xl */}
            {mobileContents && mobileContents.length > 0 && (
              <MobileContentsNav items={mobileContents} />
            )}
            {children}
          </main>

          {/* Right inspector — stacks under main on mobile with separator, sticky from lg up */}
          {inspector && (
            <div className="min-w-0 border-t border-border pt-6 lg:border-t-0 lg:pt-0">
              <div className="lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto lg:pr-1">
                {inspector}
              </div>
            </div>
          )}
        </div>
      </m.div>
    </div>
  );
}
