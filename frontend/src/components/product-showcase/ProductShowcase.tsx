import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useFXClock } from '@/components/background/FXClock';
import {
  useProductShowcase,
  ShowcaseInstanceContext,
  type ShowcaseInstanceValue,
} from './ProductShowcaseContext';
import {
  ShowcasePhase,
  SHOWCASE_SEQUENCE,
  PRODUCT_TIMELINE,
  PRODUCT_LOOP_TOTAL,
  SETTLED_PROGRESS,
} from './productTimeline';
import type { ShowcaseType } from './productData';

interface ProductShowcaseProps {
  /** Which demo dataset/visual this showcase renders. */
  type: ShowcaseType;
  children: ReactNode;
}

/** Map a time within the loop to its phase + overall 0–1 progress. */
function loopState(loopT: number): { phase: ShowcasePhase; overall: number } {
  const overall = loopT / PRODUCT_LOOP_TOTAL;
  let acc = 0;
  for (const phase of SHOWCASE_SEQUENCE) {
    const dur = PRODUCT_TIMELINE[phase];
    if (loopT < acc + dur) return { phase, overall };
    acc += dur;
  }
  return { phase: ShowcasePhase.Restart, overall };
}

/**
 * ProductShowcase — the wrapper every product mockup is placed inside.
 *
 * It derives this showcase's lifecycle from the shared FXClock (accumulating
 * clock deltas into a demo clock, mapped onto the product timeline) and exposes
 * `{ progress (overall 0–1, MotionValue), phase }` via useShowcase(). Per-frame
 * work writes to a MotionValue (no re-render); React state changes only on a
 * phase boundary. No independent timer / animation loop. Renders no DOM.
 *
 * Under reduced motion the FXClock is paused, so the showcase settles on its
 * fully-complete state (mid-Hold, progress fixed) with no movement.
 */
export function ProductShowcase({ type, children }: ProductShowcaseProps) {
  const { reducedMotion, isPaused } = useProductShowcase();
  const clock = useFXClock();

  const [phase, setPhase] = useState<ShowcasePhase>(
    reducedMotion ? ShowcasePhase.Hold : ShowcasePhase.Idle,
  );
  const progress = useMotionValue(reducedMotion ? SETTLED_PROGRESS : 0);

  const phaseRef     = useRef(phase);
  const demoTimeRef  = useRef(0);
  const prevClockRef = useRef(0);
  const initedRef    = useRef(false);
  const reducedRef   = useRef(reducedMotion);
  const pausedRef    = useRef(isPaused);
  reducedRef.current = reducedMotion;
  pausedRef.current  = isPaused;

  const applyPhase = useCallback((next: ShowcasePhase) => {
    if (phaseRef.current !== next) {
      phaseRef.current = next;
      setPhase(next);
    }
  }, []);

  // Drive the loop from the shared FXClock — no new timer.
  useMotionValueEvent(clock.time, 'change', (tSec) => {
    const tMs = tSec * 1000;
    if (!initedRef.current) {
      initedRef.current = true;
      prevClockRef.current = tMs;
      return;
    }
    const delta = tMs - prevClockRef.current;
    prevClockRef.current = tMs;
    if (reducedRef.current || pausedRef.current) return;

    demoTimeRef.current += delta;
    const loopT = demoTimeRef.current % PRODUCT_LOOP_TOTAL;
    const { phase: ph, overall } = loopState(loopT);
    progress.set(overall);
    applyPhase(ph);
  });

  // Settle on the complete state when reduced motion toggles (and on mount).
  useEffect(() => {
    demoTimeRef.current = 0;
    initedRef.current = false;
    if (reducedMotion) {
      progress.set(SETTLED_PROGRESS);
      applyPhase(ShowcasePhase.Hold);
    } else {
      progress.set(0);
      applyPhase(ShowcasePhase.Idle);
    }
  }, [reducedMotion, progress, applyPhase]);

  const value = useMemo<ShowcaseInstanceValue>(
    () => ({ type, progress, phase, reducedMotion }),
    [type, progress, phase, reducedMotion],
  );

  return (
    <ShowcaseInstanceContext.Provider value={value}>
      {children}
    </ShowcaseInstanceContext.Provider>
  );
}
