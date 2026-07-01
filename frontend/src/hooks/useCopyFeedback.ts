import { useState, useCallback, useEffect, useRef } from 'react';

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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const copy = useCallback(
    (text: string) => {
      navigator.clipboard?.writeText(text).then(() => {
        if (timerRef.current !== null) clearTimeout(timerRef.current);
        setCopied(true);
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          setCopied(false);
        }, resetDelay);
      }).catch(() => { /* ignore */ });
    },
    [resetDelay],
  );

  return { copied, copy };
}
