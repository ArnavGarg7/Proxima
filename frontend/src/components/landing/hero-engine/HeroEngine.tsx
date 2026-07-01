/**
 * HeroEngine — orchestrates the full Hero product demonstration. Logic only;
 * renders no UI. HeroEngineProvider wraps its return value in context.
 *
 * The whole timeline is derived from the shared FXClock: the engine accumulates
 * clock deltas into a demo clock and maps it onto HERO_LOOP. Per-frame work
 * writes only to MotionValues (one per concern — no duplicates); React state
 * changes just once per phase boundary, where the engine also emits a semantic
 * event on its internal bus. There is no independent timer, interval, or rAF.
 *
 * Seamless restart: `restartFade` is 0 at the loop seam, ramps up over Idle,
 * holds at 1, and ramps down over the Restart segment — so the completed
 * results dissolve and the fresh state fades in while values reset unseen.
 *
 * Under reduced motion the FXClock is paused, so the demo settles on Complete
 * with every signal at 1 and no movement.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMotionValue, useMotionValueEvent } from 'framer-motion';
import { useFXClock } from '@/components/background/FXClock';
import { HeroState } from './heroState';
import type { HeroPhase, HeroEvent } from './heroState';
import { HERO_LOOP, HERO_LOOP_TOTAL, HERO_BOUNDS } from './heroTimeline';
import type { HeroEngineValue } from './HeroEngineContext';

/** Decelerating ease — fast start, slow finish. Premium, no overshoot. */
const easeOutCubic = (p: number) => 1 - Math.pow(1 - p, 3);

/** 0 before `start`, eased ramp across [start, end], 1 after. */
function fillSignal(loopT: number, start: number, end: number, ease: (p: number) => number) {
  if (loopT <= start) return 0;
  if (loopT >= end) return 1;
  return ease((loopT - start) / (end - start));
}

/** Map a time within the loop to its segment state + 0–1 progress. */
function phaseFor(loopT: number): { state: HeroState; p: number } {
  let acc = 0;
  for (const seg of HERO_LOOP) {
    if (loopT < acc + seg.duration) {
      return { state: seg.state, p: (loopT - acc) / seg.duration };
    }
    acc += seg.duration;
  }
  return { state: HERO_LOOP[HERO_LOOP.length - 1].state, p: 1 };
}

/** Milestone emitted when a phase becomes active (null = none). */
function eventFor(state: HeroState): HeroEvent | null {
  switch (state) {
    case HeroState.Routing:    return 'onUploadFinished';
    case HeroState.Analysis:   return 'onAnalysisStarted';
    case HeroState.Confidence: return 'onConfidenceStarted';
    case HeroState.Extraction: return 'onExtractionStarted';
    case HeroState.Summary:    return 'onSummaryReady';
    case HeroState.Idle:       return 'onLoopRestart';
    default:                   return null;
  }
}

const linear = (p: number) => p;

export function useProvideHeroEngine(): HeroEngineValue {
  const clock = useFXClock();
  const reducedMotion = clock.reducedMotion;

  const [state, setState] = useState<HeroState>(
    reducedMotion ? HeroState.Complete : HeroState.Idle,
  );
  const [isPaused, setIsPaused] = useState(false);

  const progress           = useMotionValue(reducedMotion ? 1 : 0);
  const uploadProgress     = useMotionValue(reducedMotion ? 1 : 0);
  const routingProgress    = useMotionValue(reducedMotion ? 1 : 0);
  const confidenceProgress = useMotionValue(reducedMotion ? 1 : 0);
  const extractionProgress = useMotionValue(reducedMotion ? 1 : 0);
  const summaryProgress    = useMotionValue(reducedMotion ? 1 : 0);
  const restartFade        = useMotionValue(reducedMotion ? 1 : 0);

  // Refs keep the per-frame callback correct without re-subscribing each render.
  const stateRef     = useRef(state);
  const reducedRef   = useRef(reducedMotion);
  const pausedRef    = useRef(isPaused);
  const demoTimeRef  = useRef(0);
  const prevClockRef = useRef(0);
  const initedRef    = useRef(false);
  const listenersRef = useRef<Set<(event: HeroEvent) => void>>(new Set());

  reducedRef.current = reducedMotion;
  pausedRef.current  = isPaused;

  const emit = useCallback((event: HeroEvent) => {
    listenersRef.current.forEach((fn) => fn(event));
  }, []);

  const subscribe = useCallback((handler: (event: HeroEvent) => void) => {
    listenersRef.current.add(handler);
    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  const applyState = useCallback((next: HeroState) => {
    if (stateRef.current !== next) {
      // Routing also means routing-finished once analysis begins.
      if (next === HeroState.Analysis) emit('onRoutingFinished');
      const event = eventFor(next);
      if (event) emit(event);
      stateRef.current = next;
      setState(next);
    }
  }, [emit]);

  // Drive the whole loop from the shared FXClock — no new timer.
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
    const loopT = demoTimeRef.current % HERO_LOOP_TOTAL;
    const { state: seg, p } = phaseFor(loopT);
    const B = HERO_BOUNDS;

    progress.set(p);
    uploadProgress.set(fillSignal(loopT, B[HeroState.Upload].start, B[HeroState.Upload].end, easeOutCubic));
    routingProgress.set(fillSignal(loopT, B[HeroState.Routing].start, B[HeroState.Routing].end, linear));
    confidenceProgress.set(fillSignal(loopT, B[HeroState.Confidence].start, B[HeroState.Confidence].end, easeOutCubic));
    extractionProgress.set(fillSignal(loopT, B[HeroState.Extraction].start, B[HeroState.Extraction].end, linear));
    summaryProgress.set(fillSignal(loopT, B[HeroState.Summary].start, B[HeroState.Summary].end, linear));

    // Seamless restart: 0 at the seam → up over Idle → 1 → down over Restart.
    const idleEnd = B[HeroState.Idle].end;
    const restartStart = B[HeroState.Restart].start;
    restartFade.set(
      loopT < idleEnd
        ? loopT / idleEnd
        : loopT >= restartStart
          ? Math.max(0, 1 - (loopT - restartStart) / (HERO_LOOP_TOTAL - restartStart))
          : 1,
    );

    applyState(seg);
  });

  // Settle the sequence when reduced motion toggles (and on mount).
  useEffect(() => {
    demoTimeRef.current = 0;
    initedRef.current = false;
    const settled = reducedMotion ? 1 : 0;
    progress.set(settled);
    uploadProgress.set(settled);
    routingProgress.set(settled);
    confidenceProgress.set(settled);
    extractionProgress.set(settled);
    summaryProgress.set(settled);
    restartFade.set(reducedMotion ? 1 : 0);
    applyState(reducedMotion ? HeroState.Complete : HeroState.Idle);
  }, [
    reducedMotion, progress, uploadProgress, routingProgress,
    confidenceProgress, extractionProgress, summaryProgress, restartFade, applyState,
  ]);

  const restart = useCallback(() => {
    setIsPaused(false);
    demoTimeRef.current = 0;
    initedRef.current = false;
    progress.set(0);
    uploadProgress.set(0);
    routingProgress.set(0);
    confidenceProgress.set(0);
    extractionProgress.set(0);
    summaryProgress.set(0);
    restartFade.set(0);
    applyState(HeroState.Idle);
  }, [
    progress, uploadProgress, routingProgress,
    confidenceProgress, extractionProgress, summaryProgress, restartFade, applyState,
  ]);

  const pause  = useCallback(() => setIsPaused(true), []);
  const resume = useCallback(() => setIsPaused(false), []);

  const phase: HeroPhase | null =
    HeroState.Idle === state ||
    HeroState.Complete === state ||
    HeroState.Restart === state
      ? null
      : (state as HeroPhase);

  const isRunning =
    !reducedMotion && !isPaused &&
    state !== HeroState.Idle && state !== HeroState.Complete && state !== HeroState.Restart;

  return useMemo<HeroEngineValue>(
    () => ({
      state, phase, progress, uploadProgress, routingProgress,
      confidenceProgress, extractionProgress, summaryProgress, restartFade,
      isRunning, isPaused, reducedMotion, subscribe, restart, pause, resume,
    }),
    [
      state, phase, progress, uploadProgress, routingProgress,
      confidenceProgress, extractionProgress, summaryProgress, restartFade,
      isRunning, isPaused, reducedMotion, subscribe, restart, pause, resume,
    ],
  );
}
