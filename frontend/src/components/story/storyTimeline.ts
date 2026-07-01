/**
 * storyTimeline.ts — the landing narrative's section order + progress model.
 *
 * Single source of truth for the scroll story (Stage 5C). The ordered sections
 * form one continuous narrative; the thresholds describe when a section
 * activates, how much neighbouring sections overlap, and the reveal/completion
 * windows future milestones (5C.2+) animate against. No component hardcodes
 * these values.
 */

/** Ordered narrative sections (top → bottom). */
export const STORY_SECTIONS = [
  'hero',
  'capabilities',
  'features',
  'workflow',
  'analyzers',
  'cta',
  'footer',
] as const;

export type StorySectionId = (typeof STORY_SECTIONS)[number];

/** Progress + activation tuning. All scroll thresholds live here. */
export const STORY_TIMELINE = {
  /**
   * IntersectionObserver root margin — a generous band around the viewport
   * centre so neighbouring scenes overlap. The engine activates whichever
   * intersecting section is *closest to the viewport centre*, which keeps the
   * current section stable (no oscillation as boundaries cross the band edges).
   */
  rootMargin: '-35% 0px -35% 0px',
  /** Scrolling hysteresis (px/s): become "scrolling" above On, settle below Off
      — distinct thresholds stop isScrolling flickering at low speeds. */
  scrollIdleOn: 18,
  scrollIdleOff: 4,
  /** Fraction of a section scrolled before it counts as activated. */
  activation: 0.5,
  /** Overlap between adjacent sections' transitions (fraction of a section). */
  transitionOverlap: 0.18,
  /** Per-section reveal window (fraction of the section's scroll range). */
  reveal: { start: 0.0, end: 0.6 },
  /** Fraction at which a section is considered visually complete. */
  completion: 0.85,
} as const;
