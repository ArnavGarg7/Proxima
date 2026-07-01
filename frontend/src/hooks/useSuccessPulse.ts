import { useState, useCallback, useEffect, useRef } from 'react';

interface SuccessPulseOptions {
  /** Duration of the active state in ms. Default: 1500 */
  duration?: number;
}

export interface SuccessPulseResult {
  active: boolean;
  trigger: () => void;
}

export function useSuccessPulse({ duration = 1500 }: SuccessPulseOptions = {}): SuccessPulseResult {
  const [active, setActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, []);

  const trigger = useCallback(() => {
    if (timerRef.current !== null) clearTimeout(timerRef.current);
    setActive(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setActive(false);
    }, duration);
  }, [duration]);

  return { active, trigger };
}
