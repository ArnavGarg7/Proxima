import { useEffect, useState } from 'react';
import { cn } from '@/lib/cn';

export interface OutlineItem {
  /** DOM id of the target section */
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

interface AnalysisSidebarProps {
  /** Heading shown above the outline (default "On this page") */
  title?: string;
  items: OutlineItem[];
}

/**
 * AnalysisSidebar — sticky "outline" navigation for the analysis surface.
 *
 * Renders a jump list of the main sections with live counts. The currently
 * in-view section is highlighted via an IntersectionObserver, and clicking an
 * item smooth-scrolls to it. Keyboard accessible (real buttons).
 */
export function AnalysisSidebar({ title = 'On this page', items }: AnalysisSidebarProps) {
  const [active, setActive] = useState<string | undefined>(items[0]?.id);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-15% 0px -75% 0px', threshold: 0 },
    );

    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  const handleJump = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav aria-label="Document outline" className="flex flex-col gap-2">
      <span className="px-2 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
        {title}
      </span>

      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handleJump(item.id)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-left transition-colors duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
                  isActive
                    ? 'border-l-gold-primary bg-gold-primary/5 text-text-primary'
                    : 'border-l-transparent text-text-secondary hover:bg-elevated hover:text-text-primary',
                )}
              >
                {item.icon && (
                  <span
                    className={cn(
                      'material-symbols-outlined text-[16px]',
                      isActive ? 'text-gold-primary' : 'text-text-muted',
                    )}
                    aria-hidden="true"
                  >
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate font-sans text-sm">{item.label}</span>
                {item.count !== undefined && (
                  <span className="font-mono text-xs tabular-nums text-text-muted">{item.count}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
