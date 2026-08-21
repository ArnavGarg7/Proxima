/**
 * useIntelligenceStream (Stage 7F) — drives one /api/intelligence/complete
 * request and exposes the evolving answer, citations, grounding and status.
 *
 * The SSE contract (authoritative, from the backend) is:
 *   chunk    → { content }
 *   qhe      → { eval }
 *   grounding→ { eval, citations, text }   (text is the authoritative answer)
 *   error    → { detail }
 *   [DONE]
 * No other event types exist.
 */
import { useCallback, useRef, useState } from 'react';
import { streamComplete, IntelligenceHttpError } from '@/lib/sse';

export interface Citation {
  ref_key: string;
  chunk_id: string;
  document_id: string;
  document_title: string;
  page_number: number;
  snippet: string;
}

export interface GroundingEval {
  evidence_availability: boolean;
  citation_validity: number;
  evidence_coverage: number;
  grounding_score: number;
  insufficient_evidence: boolean;
  invalid_references: string[];
  grounding_status: 'grounded' | 'unverified' | 'insufficient_evidence' | string;
}

export interface QheEval {
  confidence_score: number;
  quality_classification: string;
  risk_classification: string;
}

export type IntelligenceScope =
  | { mode: 'document'; documentId: string }
  | { mode: 'selected'; documentIds: string[] }
  | { mode: 'library' };

export type StreamStatus = 'idle' | 'streaming' | 'finalizing' | 'done' | 'error' | 'cancelled';

export interface IntelligenceState {
  answer: string; // raw streamed text (chunks)
  finalText: string | null; // authoritative grounding.text (once grounded)
  citations: Citation[];
  grounding: GroundingEval | null;
  qhe: QheEval | null;
  status: StreamStatus;
  error: string | null;
}

const INITIAL: IntelligenceState = {
  answer: '',
  finalText: null,
  citations: [],
  grounding: null,
  qhe: null,
  status: 'idle',
  error: null,
};

/** Build the /complete request body from a scope + question. Never widens scope. */
export function buildScopeBody(scope: IntelligenceScope, userTask: string): Record<string, unknown> {
  const body: Record<string, unknown> = { user_task: userTask };
  if (scope.mode === 'document') body.document_id = scope.documentId;
  else if (scope.mode === 'selected') body.document_ids = scope.documentIds;
  else body.scope = 'library';
  return body;
}

export function useIntelligenceStream() {
  const [state, setState] = useState<IntelligenceState>(INITIAL);
  const abortRef = useRef<AbortController | null>(null);
  const answerRef = useRef('');
  const rafRef = useRef<number | null>(null);

  const flushAnswer = useCallback(() => {
    rafRef.current = null;
    const text = answerRef.current;
    setState((s) => (s.answer === text ? s : { ...s, answer: text }));
  }, []);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(flushAnswer);
  }, [flushAnswer]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const ask = useCallback(
    async (scope: IntelligenceScope, userTask: string) => {
      if (!userTask.trim()) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      answerRef.current = '';
      setState({ ...INITIAL, status: 'streaming' });

      const handle = (payload: string) => {
        if (payload === '[DONE]') return;
        let evt: { type?: string; content?: string; eval?: unknown; citations?: Citation[]; text?: string; detail?: string };
        try {
          evt = JSON.parse(payload);
        } catch {
          return; // ignore malformed frame
        }
        switch (evt.type) {
          case 'chunk':
            answerRef.current += evt.content ?? '';
            scheduleFlush();
            break;
          case 'qhe':
            setState((s) => ({ ...s, qhe: (evt.eval as QheEval) ?? null, status: 'finalizing' }));
            break;
          case 'grounding':
            setState((s) => ({
              ...s,
              grounding: (evt.eval as GroundingEval) ?? null,
              citations: evt.citations ?? [],
              finalText: evt.text ?? answerRef.current,
            }));
            break;
          case 'error':
            setState((s) => ({ ...s, status: 'error', error: evt.detail ?? 'Something went wrong.' }));
            break;
        }
      };

      try {
        await streamComplete(buildScopeBody(scope, userTask), { onData: handle, signal: controller.signal });
        if (rafRef.current != null) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
        setState((s) => ({
          ...s,
          answer: answerRef.current,
          status: s.status === 'error' ? 'error' : 'done',
        }));
      } catch (e) {
        if (controller.signal.aborted) {
          setState((s) => ({ ...s, status: 'cancelled' }));
        } else {
          const msg =
            e instanceof IntelligenceHttpError
              ? e.message
              : e instanceof Error
                ? e.message
                : 'Connection failed.';
          setState((s) => ({ ...s, status: 'error', error: msg }));
        }
      }
    },
    [scheduleFlush],
  );

  return { ...state, ask, cancel };
}
