import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

interface LandingNavProps {
  /** Triggers the Google OAuth sign-in flow */
  onStart: () => void;
}

/* In-page anchor targets — sections rendered by Landing.tsx */
const NAV_LINKS = [
  { label: 'Solutions', id: 'solutions' },
  { label: 'Features',  id: 'features'  },
  { label: 'Workflow',  id: 'workflow'  },
  { label: 'Analyzers', id: 'analyzers' },
] as const;

/**
 * LandingNav — floating glass navigation bar.
 *
 * Fixed to the top, centered, with a translucent blurred surface and a
 * pill silhouette. Links smooth-scroll to in-page sections; the primary
 * actions kick off the sign-in flow.
 */
export function LandingNav({ onStart }: LandingNavProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto mt-4 w-full max-w-[1200px] px-4">
        <nav
          aria-label="Primary"
          className="flex items-center justify-between gap-4 rounded-full border border-border/70
            bg-surface/55 px-3 py-2 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]
            sm:px-4 sm:py-2.5"
        >
          {/* Brand */}
          <a
            href="#top"
            onClick={scrollTo('top')}
            className="flex items-center gap-2.5 pl-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 rounded-full"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold-bright to-gold-dim shadow-[0_0_12px_rgba(201,168,76,0.35)]">
              <span
                className="material-symbols-outlined text-[16px] text-void"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                blur_on
              </span>
            </span>
            <span className="font-display text-lg font-semibold text-text-primary">
              Proxima
            </span>
          </a>

          {/* Center links — hidden on small screens */}
          <div className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                href={`#${link.id}`}
                onClick={scrollTo(link.id)}
                className="rounded-full px-3 py-1.5 font-sans text-sm text-text-secondary
                  transition-colors duration-150 hover:bg-white/5 hover:text-text-primary
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              type="button"
              className={cn(
                'flex md:hidden h-8 w-8 items-center justify-center rounded-full',
                'text-text-secondary hover:text-text-primary hover:bg-white/5',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
              )}
              onClick={() => setMobileMenuOpen((o) => !o)}
              aria-expanded={mobileMenuOpen}
              aria-controls="landing-mobile-menu"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            >
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>

            <Button variant="ghost" size="sm" onClick={onStart} className="hidden sm:inline-flex">
              Log in
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={onStart}
              rightIcon={
                <span
                  className="material-symbols-outlined text-[15px]"
                  aria-hidden="true"
                >
                  arrow_forward
                </span>
              }
            >
              Start Free
            </Button>
          </div>
        </nav>

        {/* Mobile dropdown menu */}
        {mobileMenuOpen && (
          <div id="landing-mobile-menu" className="md:hidden mt-2 rounded-2xl border border-border/70 bg-surface/95 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.45)] overflow-hidden">
            <div className="p-3 flex flex-col gap-0.5">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={`#${link.id}`}
                  onClick={scrollTo(link.id)}
                  className="rounded-xl px-4 py-3 font-sans text-sm text-text-secondary
                    hover:bg-white/5 hover:text-text-primary transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-1 pt-1 border-t border-border">
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); onStart(); }}
                  className="w-full rounded-xl px-4 py-3 text-sm text-left text-text-secondary
                    hover:bg-white/5 hover:text-text-primary transition-colors duration-150
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
                >
                  Log in
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
