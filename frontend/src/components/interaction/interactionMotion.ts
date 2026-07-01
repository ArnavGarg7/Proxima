/**
 * interactionMotion.ts — interaction motion tokens + shared physics (Stage 5D).
 *
 * Single source of truth for every hover / press / focus value and the three
 * reusable spring presets (Soft · Medium · Firm). Components in Stage 5D.2+
 * consume these — no inline interaction values, no custom spring configs.
 */
import { easeArr } from '@/theme/motion';

export const interactionMotion = {
  /** Hover lift (px, translateY) for controls — kept to a 1px max. */
  hoverLift: -1,
  /** Press depth (scale) for tactile feedback — 0.98 max compression. */
  pressDepth: 0.98,
  /** Hover intent delay (ms) before committing a hover effect. */
  hoverDelay: 60,

  /** Surface (card / panel) hover lift — 2px max. */
  surfaceLift: -2,
  /** Surface press compression (interactive surfaces only) — 0.99 max. */
  surfacePress: 0.99,

  /* ── Shared physics — every interaction spring uses one of these ───────────
     Over-/critically-damped so feedback feels tactile but never wobbly. */
  springs: {
    soft:   { stiffness: 140, damping: 22, mass: 1 },
    medium: { stiffness: 260, damping: 26, mass: 1 },
    firm:   { stiffness: 420, damping: 32, mass: 1 },
  },

  /* ── Cursor intelligence (Stage 5D.4) ───────────────────────────────────────
     The pointer-influence falloff radius, the magnetic pull cap, and how far the
     highlight may bias toward the cursor. All deliberately subtle. */
  /** Influence falloff radius (px) around an element's centre. */
  cursorRadius: 160,
  /** Maximum magnetic translation toward the cursor (px). */
  magneticPull: 6,
  /** Maximum highlight bias toward the cursor (px). */
  highlightTravel: 12,

  /* ── Reserved for Stage 5D.5+ (not used yet) ──────────────────────────────── */
  /** Ripple expansion timing. */
  ripple: { duration: 600, ease: easeArr.out },
} as const;

/** One of the shared spring presets. */
export type SpringPreset = keyof typeof interactionMotion.springs;
