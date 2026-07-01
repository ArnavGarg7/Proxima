import { Spinner } from '@/components/ui/Spinner';

interface AnalysisLoadingProps {
  title?: string;
  message?: string;
}

/**
 * AnalysisLoading — consistent full-surface loading state for analyzers.
 */
export function AnalysisLoading({
  title = 'Analyzing document…',
  message = 'Extracting structured intelligence',
}: AnalysisLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-1 flex-col items-center justify-center gap-4 bg-void min-h-[calc(100vh-60px)]"
    >
      <Spinner size="lg" />
      <div className="flex flex-col items-center gap-1.5 text-center">
        <h2 className="font-display text-xl font-semibold text-text-primary">{title}</h2>
        <p className="font-sans text-sm text-text-secondary">{message}</p>
      </div>
    </div>
  );
}
