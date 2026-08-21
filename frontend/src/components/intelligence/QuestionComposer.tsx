import { useState, type KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface QuestionComposerProps {
  onSubmit: (question: string) => void;
  onCancel: () => void;
  streaming: boolean;
  disabled?: boolean;
}

/**
 * QuestionComposer — natural-language question input. Enter (or Cmd/Ctrl+Enter)
 * submits; Shift+Enter inserts a newline. While streaming, the primary action
 * becomes Cancel.
 */
export function QuestionComposer({ onSubmit, onCancel, streaming, disabled }: QuestionComposerProps) {
  const [value, setValue] = useState('');
  const canSubmit = value.trim().length > 0 && !streaming && !disabled;

  const submit = () => {
    const q = value.trim();
    if (q && !streaming && !disabled) onSubmit(q);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKeyDown}
        rows={3}
        placeholder="Ask a question about the selected documents…"
        aria-label="Question"
        disabled={disabled}
      />
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-xs text-text-muted">
          Press <kbd className="font-mono">Enter</kbd> to ask · <kbd className="font-mono">Shift+Enter</kbd> for a new line
        </span>
        {streaming ? (
          <Button
            variant="secondary"
            onClick={onCancel}
            leftIcon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">stop_circle</span>}
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            onClick={submit}
            disabled={!canSubmit}
            leftIcon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">send</span>}
          >
            Ask
          </Button>
        )}
      </div>
    </div>
  );
}
