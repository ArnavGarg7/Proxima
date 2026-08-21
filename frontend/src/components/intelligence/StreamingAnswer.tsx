import { CitationReference } from './CitationReference';
import type { Citation, StreamStatus } from '@/hooks/useIntelligenceStream';

/** Split delimiter — matches both valid and unverified refs (capturing). */
const SPLIT_RE = /(\[Ref\s+\d+\]|\[Ref unverified\])/g;
const VALID_RE = /^\[Ref\s+\d+\]$/;

interface StreamingAnswerProps {
  answer: string;               // raw streamed text
  finalText: string | null;     // authoritative grounding.text
  citations: Citation[];
  status: StreamStatus;
  activeRef: string | null;
  onSelectCitation: (c: Citation) => void;
}

/**
 * StreamingAnswer — shows the raw streamed text while streaming; once the
 * authoritative `grounding.text` arrives it re-renders that text with `[Ref N]`
 * tokens replaced by interactive citation chips (and `[Ref unverified]` neutered).
 */
export function StreamingAnswer({ answer, finalText, citations, status, activeRef, onSelectCitation }: StreamingAnswerProps) {
  const streaming = status === 'streaming';

  // Before grounding arrives: render raw streamed text with a caret.
  if (finalText == null) {
    return (
      <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary" aria-live="polite">
        {answer}
        {streaming && answer === '' && <span className="text-text-muted">Thinking…</span>}
        {streaming && answer !== '' && (
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-gold-primary motion-safe:animate-pulse" aria-hidden="true" />
        )}
      </div>
    );
  }

  // After grounding: authoritative text with interactive references.
  const byKey = new Map(citations.map((c) => [c.ref_key, c]));
  const segments = finalText.split(SPLIT_RE);

  return (
    <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-primary">
      {segments.map((seg, i) => {
        if (seg === '[Ref unverified]') {
          return <CitationReference key={i} refKey={seg} index={null} interactive={false} />;
        }
        if (VALID_RE.test(seg)) {
          const c = byKey.get(seg);
          const n = seg.match(/\d+/)?.[0];
          return (
            <CitationReference
              key={i}
              refKey={seg}
              index={n ? Number(n) : null}
              interactive={!!c}
              active={activeRef === seg}
              onSelect={() => c && onSelectCitation(c)}
            />
          );
        }
        return <span key={i}>{seg}</span>;
      })}
    </div>
  );
}
