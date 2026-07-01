/**
 * ProductShowcaseEngine — orchestrates product showcases. Logic only; renders no
 * UI. ProductShowcaseProvider wraps its return value in context.
 *
 * Like the Hero engine, it consumes the shared FXClock (no new timer / rAF) so
 * every showcase synchronizes with the Living Canvas. Stage 5E.1 is architecture
 * only: the engine exposes the full control surface but stays idle (no active
 * demo, no driving), ready for 5E.2+ to plug showcases in.
 */
import { useCallback, useMemo, useState } from 'react';
import { useMotionValue } from 'framer-motion';
import { useFXClock } from '@/components/background/FXClock';
import type { ShowcaseType } from './productData';
import type { ProductShowcaseValue } from './ProductShowcaseContext';

export function useProvideProductShowcase(): ProductShowcaseValue {
  // Derive timing from the shared Living Canvas clock — no new timer.
  const clock = useFXClock();

  const [activeDemo, setActiveDemo] = useState<ShowcaseType | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const progress = useMotionValue(0);

  const restart = useCallback(() => {
    setIsPaused(false);
    setActiveDemo(null);
    progress.set(0);
  }, [progress]);

  const pause  = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);
  const setDemo = useCallback((demo: ShowcaseType | null) => setActiveDemo(demo), []);

  const isPlaying =
    !clock.reducedMotion && !isPaused && activeDemo !== null;

  return useMemo<ProductShowcaseValue>(
    () => ({
      activeDemo,
      progress,
      isPlaying,
      isPaused,
      reducedMotion: clock.reducedMotion,
      setActiveDemo: setDemo,
      restart,
      pause,
      resume,
    }),
    [activeDemo, progress, isPlaying, isPaused, clock.reducedMotion, setDemo, restart, pause, resume],
  );
}
