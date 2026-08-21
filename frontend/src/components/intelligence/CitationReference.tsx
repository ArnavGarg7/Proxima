import { cn } from '@/lib/cn';

interface CitationReferenceProps {
  /** e.g. "[Ref 1]" or "[Ref unverified]" */
  refKey: string;
  /** 1-based citation number, or null for an unverified reference */
  index: number | null;
  /** Only verified references are interactive */
  interactive: boolean;
  active?: boolean;
  onSelect?: () => void;
}

/**
 * CitationReference — renders an inline `[Ref N]` token. Verified references are
 * interactive chips (open the evidence panel); `[Ref unverified]` is visually
 * distinct and non-interactive. Citation identity comes only from the backend.
 */
export function CitationReference({ refKey, index, interactive, active, onSelect }: CitationReferenceProps) {
  if (!interactive) {
    return (
      <span
        data-ref={refKey}
        aria-label="Unverified reference"
        className="mx-0.5 inline-flex items-center rounded border border-conf-critical/30 bg-conf-critical/10 px-1.5 py-0.5 align-baseline font-mono text-[11px] font-semibold text-conf-critical"
        title="This reference could not be verified against the retrieved evidence"
      >
        unverified
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      title={`View evidence for reference ${index}`}
      aria-label={`Evidence reference ${index}`}
      className={cn(
        'mx-0.5 inline-flex items-center rounded border px-1.5 py-0.5 align-baseline font-mono text-[11px] font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
        active
          ? 'border-gold-primary bg-gold-primary/20 text-gold-bright'
          : 'border-gold-primary/30 bg-gold-primary/10 text-gold-primary hover:bg-gold-primary/20',
      )}
    >
      {index}
    </button>
  );
}
