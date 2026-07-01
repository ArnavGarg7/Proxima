/**
 * useCountUp — animates a number from 0 to `target` using requestAnimationFrame.
 * Easing: cubic ease-out for a premium deceleration feel.
 *
 * Pass `immediate: true` (when prefers-reduced-motion is active) to skip
 * the animation entirely and return the target value on the first render.
 */

import { useEffect, useRef, useState } from 'react';

interface CountUpOptions {
  /** Animation duration in milliseconds. Default 400. */
  duration?: number;
  /** Delay before starting in milliseconds. Default 0. */
  delay?: number;
  /** Skip animation and return the target immediately. */
  immediate?: boolean;
}

export function useCountUp(
  target: number,
  { duration = 400, delay = 0, immediate = false }: CountUpOptions = {},
): number {
  const [value, setValue] = useState(immediate ? target : 0);
  const rafRef   = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (immediate) {
      setValue(target);
      return;
    }

    setValue(0);
    startRef.current = null;

    const run = () => {
      const tick = (ts: number) => {
        if (startRef.current === null) startRef.current = ts;
        const t      = Math.min((ts - startRef.current) / duration, 1);
        const eased  = 1 - (1 - t) ** 3; // cubic ease-out
        setValue(Math.round(eased * target));
        if (t < 1) {
          rafRef.current = requestAnimationFrame(tick);
        } else {
          setValue(target); // guarantee exact final value
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    if (delay > 0) {
      timerRef.current = setTimeout(run, delay);
    } else {
      run();
    }

    return () => {
      if (rafRef.current  !== null) cancelAnimationFrame(rafRef.current);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [target, duration, delay, immediate]);

  return value;
}
