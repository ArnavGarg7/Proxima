import React from 'react';
import { Card } from '@/components/ui/Card';

interface AnalysisEmptyStateProps {
  /** Material symbol for the analyzer */
  icon: string;
  title: string;
  description: string;
  /** Bullet list of what this analyzer produces */
  expectedOutput: string[];
  /** Supported document type labels (e.g. PDF, DOCX) */
  supportedTypes?: string[];
  /** Inline error message, if a run failed */
  error?: string | null;
  /** Action area — document selector + run button supplied by the page */
  children?: React.ReactNode;
}

/**
 * AnalysisEmptyState — premium onboarding shown before an analysis is run.
 *
 * Explains what the analyzer does, what output to expect, and which document
 * types are supported, then hosts the page-provided action (selector + run).
 * Replaces generic "no data" placeholders.
 */
export function AnalysisEmptyState({
  icon,
  title,
  description,
  expectedOutput,
  supportedTypes,
  error,
  children,
}: AnalysisEmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-void px-5 py-12 min-h-[calc(100vh-60px)]">
      <div className="w-full max-w-[560px]">
        <Card variant="info" className="flex flex-col gap-6">

          {/* Identity */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
              <span
                className="material-symbols-outlined text-[32px] text-gold-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {icon}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="font-display text-2xl font-semibold text-text-primary">{title}</h1>
              <p className="mx-auto max-w-md font-sans text-sm leading-relaxed text-text-secondary">
                {description}
              </p>
            </div>
          </div>

          {/* What you'll get */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
              What you&apos;ll get
            </span>
            <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {expectedOutput.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/10">
                    <span className="material-symbols-outlined text-[11px] text-gold-primary" aria-hidden="true">
                      check
                    </span>
                  </span>
                  <span className="font-sans text-xs text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Supported types */}
          {supportedTypes && supportedTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
                Supported
              </span>
              <div className="flex flex-wrap gap-1.5">
                {supportedTypes.map((t) => (
                  <span
                    key={t}
                    className="rounded border border-border bg-elevated px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-text-muted"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-lg border border-conf-critical/20 bg-conf-critical/8 px-3 py-2.5 text-conf-critical"
            >
              <span className="material-symbols-outlined text-[16px] mt-px shrink-0" aria-hidden="true">
                error_outline
              </span>
              <span className="font-sans text-sm">{error}</span>
            </div>
          )}

          {/* Action area */}
          {children && <div className="flex flex-col gap-3">{children}</div>}
        </Card>
      </div>
    </div>
  );
}
