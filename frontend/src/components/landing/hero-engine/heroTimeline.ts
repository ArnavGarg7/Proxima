/**
 * heroTimeline.ts — phase durations + the full demo loop for the Hero.
 *
 * Stage 5B.4–5B.5 completes the loop: Idle → Upload → Routing → Analysis →
 * Confidence → Extraction → Summary → Complete (hold) → Restart (fade-out) →
 * loop. The engine derives the current phase + per-phase progress from the
 * shared FXClock by walking these segments; HERO_BOUNDS gives each phase its
 * [start, end] window so signals can fill, hold, and reset deterministically.
 */
import { HeroState, type HeroPhase } from './heroState';

/** Duration (ms) of each timed phase. */
export const HERO_TIMELINE: Record<HeroPhase, number> = {
  [HeroState.Upload]:     2600,
  [HeroState.Routing]:    1800,
  [HeroState.Analysis]:   1400,
  [HeroState.Confidence]: 2400,
  [HeroState.Extraction]: 3200,
  [HeroState.Summary]:    2400,
};

/** Idle dwell (ms) — the calm "ready" beat at the top of each loop. */
export const HERO_IDLE_MS = 1400;
/** Completed-state hold (ms) — the product feels "finished" (the pause). */
export const HERO_COMPLETE_MS = 2400;
/** Restart fade-out (ms) — results dissolve before the seamless loop. */
export const HERO_RESTART_MS = 700;

/** The full active loop. Later milestones must not redesign this engine. */
export const HERO_LOOP: { state: HeroState; duration: number }[] = [
  { state: HeroState.Idle,       duration: HERO_IDLE_MS },
  { state: HeroState.Upload,     duration: HERO_TIMELINE[HeroState.Upload] },
  { state: HeroState.Routing,    duration: HERO_TIMELINE[HeroState.Routing] },
  { state: HeroState.Analysis,   duration: HERO_TIMELINE[HeroState.Analysis] },
  { state: HeroState.Confidence, duration: HERO_TIMELINE[HeroState.Confidence] },
  { state: HeroState.Extraction, duration: HERO_TIMELINE[HeroState.Extraction] },
  { state: HeroState.Summary,    duration: HERO_TIMELINE[HeroState.Summary] },
  { state: HeroState.Complete,   duration: HERO_COMPLETE_MS },
  { state: HeroState.Restart,    duration: HERO_RESTART_MS },
];

/** Total runtime of one loop (ms). */
export const HERO_LOOP_TOTAL = HERO_LOOP.reduce((sum, seg) => sum + seg.duration, 0);

/** [start, end] window (ms within the loop) for each state. */
export const HERO_BOUNDS: Record<string, { start: number; end: number }> = (() => {
  const bounds: Record<string, { start: number; end: number }> = {};
  let acc = 0;
  for (const seg of HERO_LOOP) {
    bounds[seg.state] = { start: acc, end: acc + seg.duration };
    acc += seg.duration;
  }
  return bounds;
})();
