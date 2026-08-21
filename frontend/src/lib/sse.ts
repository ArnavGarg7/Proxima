/**
 * SSE-over-fetch for the intelligence stream (Stage 7F).
 *
 * `/api/intelligence/complete` is a POST with a JSON body, so `EventSource`
 * (GET-only) cannot be used. This module reads the response body as a stream and
 * parses SSE frames, tolerating partial TCP chunks and multiple frames per read.
 */
import { api } from '@/lib/axios';

/** Incremental SSE frame parser. Emits each frame's joined `data:` payload. */
export function createSSEParser(onData: (payload: string) => void) {
  let buffer = '';

  const emit = (frame: string) => {
    const data = frame
      .split('\n')
      .filter((line) => line.startsWith('data:'))
      .map((line) => line.slice(5).replace(/^ /, '')) // strip "data:" + one optional space
      .join('\n');
    if (data !== '') onData(data);
  };

  const drain = (final: boolean) => {
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      emit(buffer.slice(0, sep));
      buffer = buffer.slice(sep + 2);
    }
    if (final && buffer.trim() !== '') {
      emit(buffer);
      buffer = '';
    }
  };

  return {
    /** Feed a raw text chunk (may contain 0..n complete frames). */
    push(text: string) {
      buffer += text.replace(/\r\n/g, '\n');
      drain(false);
    },
    /** Emit any trailing frame that was not terminated by a blank line. */
    flush() {
      drain(true);
    },
  };
}

export class IntelligenceHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'IntelligenceHttpError';
  }
}

export interface StreamOptions {
  onData: (payload: string) => void;
  signal?: AbortSignal;
}

/** POST to /api/intelligence/complete and stream its SSE frames (cookie auth). */
export async function streamComplete(body: unknown, { onData, signal }: StreamOptions): Promise<void> {
  const base = api.defaults.baseURL || '';
  const res = await fetch(`${base}/api/intelligence/complete`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    const message =
      res.status === 403
        ? 'You do not have access to this document.'
        : `Request failed (${res.status}).`;
    throw new IntelligenceHttpError(res.status, message);
  }
  if (!res.body) {
    throw new IntelligenceHttpError(0, 'Streaming is not supported in this browser.');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const parser = createSSEParser(onData);

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    parser.push(decoder.decode(value, { stream: true }));
  }
  parser.flush();
}
