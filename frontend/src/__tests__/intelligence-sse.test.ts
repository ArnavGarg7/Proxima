import { describe, it, expect } from 'vitest';
import { createSSEParser } from '@/lib/sse';
import { buildScopeBody, type IntelligenceScope } from '@/hooks/useIntelligenceStream';

/** Collect every payload emitted by the parser for a scripted feed. */
function collect(feed: (p: ReturnType<typeof createSSEParser>) => void): string[] {
  const out: string[] = [];
  const parser = createSSEParser((payload) => out.push(payload));
  feed(parser);
  return out;
}

describe('createSSEParser', () => {
  it('emits a single well-formed frame', () => {
    const out = collect((p) => {
      p.push('data: {"type":"chunk","content":"Hello"}\n\n');
      p.flush();
    });
    expect(out).toEqual(['{"type":"chunk","content":"Hello"}']);
  });

  it('emits multiple frames from one chunk', () => {
    const out = collect((p) => {
      p.push('data: {"type":"chunk","content":"a"}\n\ndata: {"type":"chunk","content":"b"}\n\n');
      p.flush();
    });
    expect(out).toEqual(['{"type":"chunk","content":"a"}', '{"type":"chunk","content":"b"}']);
  });

  it('reassembles a frame split across TCP chunks', () => {
    const out = collect((p) => {
      p.push('data: {"type":"chu');
      p.push('nk","content":"Hi"}');
      p.push('\n\n');
      p.flush();
    });
    expect(out).toEqual(['{"type":"chunk","content":"Hi"}']);
  });

  it('parses qhe, grounding and error event payloads', () => {
    const out = collect((p) => {
      p.push('data: {"type":"qhe","eval":{"confidence_score":88}}\n\n');
      p.push('data: {"type":"grounding","eval":{"grounding_score":91},"citations":[],"text":"Final."}\n\n');
      p.push('data: {"type":"error","detail":"boom"}\n\n');
      p.flush();
    });
    expect(out.map((s) => JSON.parse(s).type)).toEqual(['qhe', 'grounding', 'error']);
  });

  it('surfaces the [DONE] sentinel as a payload', () => {
    const out = collect((p) => {
      p.push('data: [DONE]\n\n');
      p.flush();
    });
    expect(out).toEqual(['[DONE]']);
  });

  it('normalizes CRLF line endings', () => {
    const out = collect((p) => {
      p.push('data: {"type":"chunk","content":"x"}\r\n\r\n');
      p.flush();
    });
    expect(out).toEqual(['{"type":"chunk","content":"x"}']);
  });

  it('emits a trailing unterminated frame on flush', () => {
    const out = collect((p) => {
      p.push('data: {"type":"chunk","content":"tail"}');
      p.flush();
    });
    expect(out).toEqual(['{"type":"chunk","content":"tail"}']);
  });

  it('joins multi-line data payloads with newlines', () => {
    const out = collect((p) => {
      p.push('data: line1\ndata: line2\n\n');
      p.flush();
    });
    expect(out).toEqual(['line1\nline2']);
  });

  it('ignores non-data lines (comments / event names)', () => {
    const out = collect((p) => {
      p.push(': keep-alive\nevent: chunk\ndata: {"ok":true}\n\n');
      p.flush();
    });
    expect(out).toEqual(['{"ok":true}']);
  });
});

describe('buildScopeBody', () => {
  it('builds a single-document body', () => {
    const scope: IntelligenceScope = { mode: 'document', documentId: 'doc-1' };
    expect(buildScopeBody(scope, 'What is this?')).toEqual({
      user_task: 'What is this?',
      document_id: 'doc-1',
    });
  });

  it('builds a selected-documents body', () => {
    const scope: IntelligenceScope = { mode: 'selected', documentIds: ['a', 'b'] };
    expect(buildScopeBody(scope, 'Compare')).toEqual({
      user_task: 'Compare',
      document_ids: ['a', 'b'],
    });
  });

  it('builds a library-scope body', () => {
    const scope: IntelligenceScope = { mode: 'library' };
    expect(buildScopeBody(scope, 'Summarize everything')).toEqual({
      user_task: 'Summarize everything',
      scope: 'library',
    });
  });
});
