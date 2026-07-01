import { Link } from 'react-router-dom';
import proximaLogo from '@/assets/proxima-logo.png';

/* Footer link columns */
export const FOOTER_COLUMNS = [
  { title: 'Product',   links: ['Workspace', 'Templates', 'Analyzers'] },
  { title: 'Solutions', links: ['Legal', 'Healthcare', 'Clinical', 'Research'] },
  { title: 'Company',   links: ['About', 'Careers', 'Contact', 'Security'] },
  { title: 'Legal',     links: ['Privacy', 'Terms', 'Compliance', 'Status'] },
] as const;

export function LandingFooter() {
  return (
    <footer className="relative border-t border-border bg-surface/40 backdrop-blur-sm mt-auto z-10">
      <div className="mx-auto w-full max-w-[1400px] px-6 py-16 sm:px-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-10 lg:grid-cols-6">
          {/* Brand block */}
          <div className="col-span-2 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <img
                src={proximaLogo}
                alt=""
                aria-hidden="true"
                className="h-7 w-auto shrink-0"
              />
              <span className="brand-wordmark text-lg">Proxima</span>
            </div>
            <p className="max-w-xs font-sans text-sm leading-relaxed text-text-muted">
              AI-native document intelligence. Upload, analyze, and audit with
              confidence.
            </p>
          </div>

          {/* Link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="flex flex-col gap-3">
              <span className="font-sans text-xs font-medium uppercase tracking-widest text-text-muted">
                {col.title}
              </span>
              <ul className="flex flex-col gap-2">
                {col.links.map((link) => (
                  <li key={link}>
                    {col.title === 'Product' || col.title === 'Company' ? (
                      <Link
                        to={link === 'Analyzers' ? '/analyze' : `/${link.toLowerCase()}`}
                        className="font-sans text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary"
                      >
                        {link}
                      </Link>
                    ) : (
                      <span className="cursor-default font-sans text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary">
                        {link}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <div className="flex flex-col items-center gap-1 sm:items-start">
            <span className="font-sans text-xs text-text-muted">
              © {new Date().getFullYear()} Proxima. All rights reserved.
            </span>
            <span className="font-sans text-[11px] text-text-muted/70">
              Engineered by Arnav Garg
            </span>
          </div>
          <span className="font-mono text-xs text-text-muted">v4.0</span>
        </div>
      </div>
    </footer>
  );
}
