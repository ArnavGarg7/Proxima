/**
 * productTimeline.ts — the shared lifecycle every product showcase follows
 * (Stage 5E). One timing contract so no showcase invents its own.
 *
 *   Idle → Initialize → Animate → Complete → Hold → Restart → loop
 *
 * Stage 5E.1 declares the lifecycle + durations; nothing drives UI yet.
 */

export const ShowcasePhase = {
  Idle:       'idle',
  Initialize: 'initialize',
  Animate:    'animate',
  Complete:   'complete',
  Hold:       'hold',
  Restart:    'restart',
} as const;

export type ShowcasePhase = (typeof ShowcasePhase)[keyof typeof ShowcasePhase];

/** The ordered, timed phases of one showcase run (excludes Idle). */
export const SHOWCASE_SEQUENCE = [
  ShowcasePhase.Initialize,
  ShowcasePhase.Animate,
  ShowcasePhase.Complete,
  ShowcasePhase.Hold,
  ShowcasePhase.Restart,
] as const;

/** Duration (ms) of each timed phase. */
export const PRODUCT_TIMELINE: Record<(typeof SHOWCASE_SEQUENCE)[number], number> = {
  [ShowcasePhase.Initialize]: 600,
  [ShowcasePhase.Animate]:    2600,
  [ShowcasePhase.Complete]:   400,
  [ShowcasePhase.Hold]:       2600,
  [ShowcasePhase.Restart]:    600,
};

/** Total runtime of one showcase loop (ms). */
export const PRODUCT_LOOP_TOTAL = Object.values(PRODUCT_TIMELINE).reduce((sum, ms) => sum + ms, 0);

/**
 * Each phase's [start, end] window as a fraction of the whole loop (0–1).
 * Showcases map their sub-animations onto these windows of the overall progress
 * — so all effects complete by the end of Complete (the Hold window is settled).
 */
export const PHASE_WINDOWS: Record<(typeof SHOWCASE_SEQUENCE)[number], [number, number]> = (() => {
  const windows = {} as Record<(typeof SHOWCASE_SEQUENCE)[number], [number, number]>;
  let acc = 0;
  for (const phase of SHOWCASE_SEQUENCE) {
    const dur = PRODUCT_TIMELINE[phase];
    windows[phase] = [acc / PRODUCT_LOOP_TOTAL, (acc + dur) / PRODUCT_LOOP_TOTAL];
    acc += dur;
  }
  return windows;
})();

/** Overall-progress value representing the settled, fully-complete state
 *  (mid-Hold) — used to freeze a showcase under reduced motion. */
export const SETTLED_PROGRESS =
  (PHASE_WINDOWS[ShowcasePhase.Hold][0] + PHASE_WINDOWS[ShowcasePhase.Hold][1]) / 2;

/* ── Shared loop landmarks (fractions of overall 0–1 progress) ──────────────
   Every showcase maps its sub-effects onto these, so none re-derives timing. */

/** End of Initialize — where the whole-mockup reveal finishes fading in. */
export const INIT_END = PHASE_WINDOWS[ShowcasePhase.Initialize][1];
/** The Animate phase window — where the bulk of every showcase plays. */
export const ANIM_WINDOW = PHASE_WINDOWS[ShowcasePhase.Animate];
/** The Complete phase window — where results settle. */
export const COMPLETE_WINDOW = PHASE_WINDOWS[ShowcasePhase.Complete];
/** Start of Restart — where the whole-mockup reveal begins fading out. */
export const RESTART_START = PHASE_WINDOWS[ShowcasePhase.Restart][0];

/** Map a [0,1] fraction of the Animate phase to an absolute progress window. */
export function animSpan(from: number, to: number): [number, number] {
  const [a0, a1] = ANIM_WINDOW;
  const span = a1 - a0;
  return [a0 + from * span, a0 + to * span];
}
