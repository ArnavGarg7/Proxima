import React from 'react';
import { cn } from '@/lib/cn';
import { confidenceTextClass, confidenceLabel } from '@/lib/confidence';

interface AnalysisHeaderProps {
  /** Material symbol name for the analyzer glyph */
  icon: string;
  /** Small uppercase eyebrow above the title (e.g. "Analysis Workbench") */
  eyebrow?: string;
  /** Analyzer title */
  title: string;
  /** Current document name */
  documentName?: string;
  /** Status badge node (e.g. <Badge>) */
  status?: React.ReactNode;
  /** Overall confidence on a 0–100 scale */
  confidence?: number;
  /** Primary actions — Export, Re-run, Share */
  actions?: React.ReactNode;
}

/**
 * AnalysisHeader — the consistent top block for every analyzer.
 *
 * Title + analyzer glyph, a metadata row (document · status · confidence),
 * and a right-aligned action slot. Matches the premium header style used on
 * the Dashboard and Landing page.
 */
export function AnalysisHeader({
  icon,
  eyebrow = 'Analysis Workbench',
  title,
  documentName,
  status,
  confidence,
  actions,
}: AnalysisHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-start sm:justify-between">

      {/* Left — identity + meta */}
      <div className="flex min-w-0 items-start gap-4">
        {/* Glyph */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-surface">
          <span
            className="material-symbols-outlined text-[24px] text-gold-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          {eyebrow && (
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              {eyebrow}
            </span>
          )}
          <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-3xl">
            {title}
          </h1>

          {/* Meta row */}
          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            {documentName && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-elevated px-2.5 py-1 font-sans text-xs text-text-secondary">
                <span className="material-symbols-outlined text-[14px] text-text-muted" aria-hidden="true">
                  description
                </span>
                <span className="max-w-[140px] truncate sm:max-w-[220px]">{documentName}</span>
              </span>
            )}
            {status}
            {confidence !== undefined && (
              <span className="inline-flex items-center gap-1.5 font-sans text-xs">
                <span className="text-text-muted">Confidence</span>
                <span className={cn('font-mono font-semibold tabular-nums', confidenceTextClass(confidence))}>
                  {Math.round(confidence)}
                </span>
                <span className={cn('hidden sm:inline', confidenceTextClass(confidence))}>
                  · {confidenceLabel(confidence)}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right — actions */}
      {actions && (
        <div className="flex shrink-0 items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
