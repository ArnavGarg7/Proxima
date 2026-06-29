import { useState, useCallback } from 'react';

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

  const trigger = useCallback(() => {
    setActive(true);
    setTimeout(() => setActive(false), duration);
  }, [duration]);

  return { active, trigger };
}
