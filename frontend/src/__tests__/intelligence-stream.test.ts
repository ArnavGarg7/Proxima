import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { useIntelligenceStream } from '@/hooks/useIntelligenceStream';
import { streamComplete } from '@/lib/sse';

vi.mock('@/lib/sse', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/sse')>();
  return { ...actual, streamComplete: vi.fn() };
});

const mockStream = streamComplete as unknown as Mock;

const citation = {
  ref_key: '[Ref 1]',
  chunk_id: 'c1',
  document_id: 'doc-1',
  document_title: 'Doc.pdf',
  page_number: 2,
  snippet: 'evidence text',
};

describe('useIntelligenceStream', () => {
  beforeEach(() => {
    mockStream.mockReset();
  });

  it('streams chunks, qhe, and grounding into a done state', async () => {
    mockStream.mockImplementation(async (_body, { onData }: { onData: (p: string) => void }) => {
      onData('{"type":"chunk","content":"Hello "}');
      onData('{"type":"chunk","content":"world"}');
      onData('{"type":"qhe","eval":{"confidence_score":80,"quality_classification":"good","risk_classification":"low"}}');
      onData(
        '{"type":"grounding","eval":{"grounding_score":90,"grounding_status":"grounded"},' +
          '"citations":[' +
          JSON.stringify(citation) +
          '],"text":"Hello world [Ref 1]"}',
      );
      onData('[DONE]');
    });

    const { result } = renderHook(() => useIntelligenceStream());
    await act(async () => {
      await result.current.ask({ mode: 'library' }, 'question');
    });

    expect(result.current.status).toBe('done');
    expect(result.current.answer).toBe('Hello world');
    expect(result.current.finalText).toBe('Hello world [Ref 1]');
    expect(result.current.citations).toHaveLength(1);
    expect(result.current.qhe?.confidence_score).toBe(80);
    expect(result.current.grounding?.grounding_status).toBe('grounded');
    expect(result.current.error).toBeNull();
  });

  it('captures an error event and ends in the error state', async () => {
    mockStream.mockImplementation(async (_body, { onData }: { onData: (p: string) => void }) => {
      onData('{"type":"error","detail":"Insufficient evidence."}');
    });

    const { result } = renderHook(() => useIntelligenceStream());
    await act(async () => {
      await result.current.ask({ mode: 'document', documentId: 'd1' }, 'q');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Insufficient evidence.');
  });

  it('ends in the cancelled state when the request is aborted', async () => {
    mockStream.mockImplementation(
      (_body: unknown, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );

    const { result } = renderHook(() => useIntelligenceStream());
    let askPromise: Promise<void>;
    act(() => {
      askPromise = result.current.ask({ mode: 'library' }, 'q');
    });
    expect(result.current.status).toBe('streaming');

    act(() => result.current.cancel());
    await act(async () => {
      await askPromise;
    });

    expect(result.current.status).toBe('cancelled');
  });

  it('surfaces an HTTP failure message from streamComplete', async () => {
    const { IntelligenceHttpError } = await import('@/lib/sse');
    mockStream.mockRejectedValue(new IntelligenceHttpError(403, 'You do not have access to this document.'));

    const { result } = renderHook(() => useIntelligenceStream());
    await act(async () => {
      await result.current.ask({ mode: 'document', documentId: 'nope' }, 'q');
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('You do not have access to this document.');
  });
});
