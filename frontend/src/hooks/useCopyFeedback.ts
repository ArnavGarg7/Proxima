import { useState, useCallback } from 'react';

interface CopyFeedbackOptions {
  /** Duration of the "Copied" state in ms. Default: 2000 */
  resetDelay?: number;
}

export interface CopyFeedbackResult {
  copied: boolean;
  copy: (text: string) => void;
}

export function useCopyFeedback({ resetDelay = 2000 }: CopyFeedbackOptions = {}): CopyFeedbackResult {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    (text: string) => {
      navigator.clipboard?.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelay);
      }).catch(() => { /* ignore */ });
    },
    [resetDelay],
  );

  return { copied, copy };
}
