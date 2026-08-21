import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi } from 'vitest';
import { StreamingAnswer } from '@/components/intelligence/StreamingAnswer';
import type { Citation } from '@/hooks/useIntelligenceStream';

const citation: Citation = {
  ref_key: '[Ref 1]',
  chunk_id: 'c1',
  document_id: 'doc-1',
  document_title: 'Contract.pdf',
  page_number: 4,
  snippet: 'The governing law is Delaware.',
};

describe('StreamingAnswer citation rendering', () => {
  it('shows the raw stream with no citations before grounding arrives', () => {
    render(
      <StreamingAnswer
        answer="partial answer"
        finalText={null}
        citations={[]}
        status="streaming"
        activeRef={null}
        onSelectCitation={() => {}}
      />,
    );
    expect(screen.getByText(/partial answer/)).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a valid [Ref N] as an interactive chip and fires onSelect', () => {
    const onSelect = vi.fn();
    render(
      <StreamingAnswer
        answer=""
        finalText="Delaware law applies [Ref 1]."
        citations={[citation]}
        status="done"
        activeRef={null}
        onSelectCitation={onSelect}
      />,
    );
    const chip = screen.getByRole('button', { name: /Evidence reference 1/i });
    expect(chip).toHaveTextContent('1');
    fireEvent.click(chip);
    expect(onSelect).toHaveBeenCalledWith(citation);
  });

  it('renders [Ref unverified] as a non-interactive marker', () => {
    render(
      <StreamingAnswer
        answer=""
        finalText="This is speculative [Ref unverified]."
        citations={[]}
        status="done"
        activeRef={null}
        onSelectCitation={() => {}}
      />,
    );
    expect(screen.getByText('unverified')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('renders a valid ref with no matching citation as non-interactive', () => {
    render(
      <StreamingAnswer
        answer=""
        finalText="Missing evidence [Ref 5]."
        citations={[citation]}
        status="done"
        activeRef={null}
        onSelectCitation={() => {}}
      />,
    );
    // [Ref 5] has no citation → not clickable
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('unverified')).toBeInTheDocument();
  });
});
