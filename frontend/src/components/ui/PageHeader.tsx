import React from 'react';
import { cn } from '@/lib/cn';

interface BreadcrumbItem {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Breadcrumb trail rendered above the title */
  breadcrumbs?: BreadcrumbItem[];
  /** Content in the right slot — buttons, badges, status indicators */
  actions?: React.ReactNode;
  /** Add a bottom border separator below the header */
  bordered?: boolean;
  className?: string;
}

/**
 * PageHeader — the top-of-page title block used across all main pages.
 * Standardizes the title, subtitle, breadcrumbs, and action area.
 *
 * @example
 * <PageHeader
 *   title="Legal Intelligence"
 *   subtitle="Contract and regulatory document analysis"
 *   actions={<Button variant="secondary" size="sm">Export</Button>}
 * />
 *
 * <PageHeader
 *   breadcrumbs={[{ label: 'Templates', onClick: () => navigate('/templates') }, { label: 'NDA Review' }]}
 *   title="NDA Review"
 * />
 */
export function PageHeader({ title, subtitle, breadcrumbs, actions, bordered, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-1 pb-6', bordered && 'border-b border-border', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 mb-2">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" className="text-text-muted">
                  <path d="M3 2L7 5L3 8" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {crumb.href || crumb.onClick ? (
                <button
                  type="button"
                  onClick={crumb.onClick}
                  className="text-xs text-text-muted hover:text-text-secondary transition-colors font-sans focus-visible:outline-none focus-visible:underline"
                >
                  {crumb.label}
                </button>
              ) : (
                <span className={cn('text-xs font-sans', i === breadcrumbs.length - 1 ? 'text-text-secondary' : 'text-text-muted')}>
                  {crumb.label}
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-text-primary">
            {title}
          </h1>
          {subtitle && (
            <p className="font-sans text-sm text-text-secondary leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2 shrink-0 pt-1">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
