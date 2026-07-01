/**
 * productMotion.ts — animation geometry tokens for product showcases (Stage 5E).
 *
 * Centralizes the window-driven reveal geometry so every showcase's staggered
 * reveals move on one rhythm. Progress-window animations (via animSpan) replaced
 * duration-based animations in 5E.2+, so timing is derived from productTimeline
 * rather than from duration tokens here.
 */

export const productMotion = {
  /* Window-driven reveal geometry (mapped onto progress, not duration-based) —
     shared by every showcase's staggered reveals so they move identically. */
  /** Vertical travel (px) for a fade-in reveal. */
  revealY:        6,
  /** Fraction of a reveal window the item start-times are spread across. */
  revealSpread:   0.7,
  /** Fraction of a reveal window each item takes to fade in. */
  revealItemSpan: 0.42,
} as const;
