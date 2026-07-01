/**
 * heroState.ts — the Hero product-demo lifecycle (Stage 5B.1, architecture only).
 *
 * The complete lifecycle is declared now so every future Hero animation belongs
 * to one coordinated timeline. In Stage 5B.1 only `Idle` is active — the rest
 * exist as types/values but drive nothing yet.
 */

export const HeroState = {
  Idle:       'idle',
  Upload:     'upload',
  Routing:    'routing',
  Analysis:   'analysis',
  Confidence: 'confidence',
  Extraction: 'extraction',
  Summary:    'summary',
  Complete:   'complete',
  Pause:      'pause',
  Restart:    'restart',
} as const;

export type HeroState = (typeof HeroState)[keyof typeof HeroState];

/**
 * The ordered, timed phases the demo advances through. Excludes the terminal
 * `Complete` and the control states (`Idle`/`Pause`/`Restart`). These are the
 * phases the future timeline (heroTimeline.ts) assigns durations to.
 */
export const HERO_PHASES = [
  HeroState.Upload,
  HeroState.Routing,
  HeroState.Analysis,
  HeroState.Confidence,
  HeroState.Extraction,
  HeroState.Summary,
] as const;

export type HeroPhase = (typeof HERO_PHASES)[number];

/**
 * Linear order of every state, used to compare progress (e.g. is a timeline
 * node done/active/pending relative to the current state). Control states
 * (Pause/Restart) are -1 — they never participate in ordering.
 */
export const HERO_STATE_ORDER: Record<HeroState, number> = {
  [HeroState.Idle]:       0,
  [HeroState.Upload]:     1,
  [HeroState.Routing]:    2,
  [HeroState.Analysis]:   3,
  [HeroState.Confidence]: 4,
  [HeroState.Extraction]: 5,
  [HeroState.Summary]:    6,
  [HeroState.Complete]:   7,
  [HeroState.Pause]:     -1,
  [HeroState.Restart]:   -1,
};

/**
 * Semantic milestones emitted by the Hero engine's internal event bus. Panels
 * subscribe to these (useHeroEvent / useHeroEvents) for one-shot reactions
 * instead of polling phase equality. Internal to the engine — no business logic.
 */
export type HeroEvent =
  | 'onUploadFinished'
  | 'onRoutingFinished'
  | 'onAnalysisStarted'
  | 'onConfidenceStarted'
  | 'onExtractionStarted'
  | 'onSummaryReady'
  | 'onLoopRestart';
