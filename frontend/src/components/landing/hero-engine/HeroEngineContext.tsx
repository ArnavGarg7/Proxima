import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';
import type { HeroState, HeroPhase, HeroEvent } from './heroState';

/**
 * HeroEngineValue — the shared orchestration state every Hero component reads.
 * Animation state is never passed through props; components call useHeroEngine()
 * (or a selector). Continuous values are MotionValues, so per-frame updates
 * never trigger React re-renders.
 */
export interface HeroEngineValue {
  /** Current lifecycle state. */
  state: HeroState;
  /** The active timed phase, or null when idle/complete. */
  phase: HeroPhase | null;
  /** 0–1 progress within the current phase. */
  progress: MotionValue<number>;
  /** 0–1 upload-bar fill (eased; full once upload completes). */
  uploadProgress: MotionValue<number>;
  /** 0–1 routing-scan progress (full once a decision is made). */
  routingProgress: MotionValue<number>;
  /** 0–1 confidence draw (ring + score + metrics counters). */
  confidenceProgress: MotionValue<number>;
  /** 0–1 entity-extraction reveal. */
  extractionProgress: MotionValue<number>;
  /** 0–1 summary reveal. */
  summaryProgress: MotionValue<number>;
  /** Global content opacity for the seamless restart (1 active, 0 at the seam). */
  restartFade: MotionValue<number>;
  /** True while the timeline is actively advancing. */
  isRunning: boolean;
  /** True while the timeline is held. */
  isPaused: boolean;
  /** Whether the user prefers reduced motion (sequence settles, no movement). */
  reducedMotion: boolean;
  /** Subscribe to semantic milestones; returns an unsubscribe fn. */
  subscribe: (handler: (event: HeroEvent) => void) => () => void;
  /** Restart the demo from Idle. */
  restart: () => void;
  /** Hold the timeline. */
  pause: () => void;
  /** Resume a held timeline. */
  resume: () => void;
}

/**
 * HeroEngineContext — provided by HeroEngineProvider, consumed via
 * useHeroEngine(). Exported as a context object (not a provider component) so
 * this module stays component-free for fast refresh.
 */
export const HeroEngineContext = createContext<HeroEngineValue | null>(null);

/** Read the Hero orchestration state. Must be used within a HeroEngineProvider. */
export function useHeroEngine(): HeroEngineValue {
  const ctx = useContext(HeroEngineContext);
  if (ctx === null) {
    throw new Error('useHeroEngine must be used within a HeroEngineProvider');
  }
  return ctx;
}
