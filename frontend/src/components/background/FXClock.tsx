import { createContext, useContext, useEffect, useMemo } from 'react';
import { useMotionValue, type MotionValue } from 'framer-motion';

/**
 * FXClockValue — a lightweight shared timing service for cinematic effects.
 *
 * Values are framer-motion MotionValues, so the clock updates every frame
 * *without* triggering React re-renders. Future stages (hero product demo,
 * routing animation, dashboard mockups) consume this to stay in sync instead
 * of spinning up independent timers.
 */
export interface FXClockValue {
  /** Seconds elapsed since the clock started (0 while reduced motion). */
  time: MotionValue<number>;
  /** Normalized 0–1 progress over a shared loop period (0 while reduced motion). */
  progress: MotionValue<number>;
  /** Mirrors the engine's reduced-motion state; the clock pauses when true. */
  reducedMotion: boolean;
}

/** Shared loop period (seconds) for the normalized `progress` timeline. */
const LOOP_SECONDS = 60;

export const FXClockContext = createContext<FXClockValue | null>(null);

/** Consume the shared cinematic clock. Must be used within BackgroundFX. */
export function useFXClock(): FXClockValue {
  const ctx = useContext(FXClockContext);
  if (ctx === null) {
    throw new Error('useFXClock must be used within a BackgroundFX provider');
  }
  return ctx;
}

/**
 * useProvideFXClock — builds the singleton clock value for BackgroundFX.
 *
 * requestAnimationFrame-driven; writes only to MotionValues (never React state,
 * so it never re-renders) and fully pauses under reduced motion. Pure timing —
 * no business logic, no rendering. The browser also throttles the rAF when the
 * tab is hidden.
 */
export function useProvideFXClock(reducedMotion: boolean): FXClockValue {
  const time = useMotionValue(0);
  const progress = useMotionValue(0);

  useEffect(() => {
    if (reducedMotion) {
      time.set(0);
      progress.set(0);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = (now - start) / 1000;
      time.set(t);
      progress.set((t % LOOP_SECONDS) / LOOP_SECONDS);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [reducedMotion, time, progress]);

  return useMemo(
    () => ({ time, progress, reducedMotion }),
    [time, progress, reducedMotion],
  );
}
