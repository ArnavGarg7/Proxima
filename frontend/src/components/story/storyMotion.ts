/**
 * storyMotion.ts — scroll-animation tokens for the landing narrative (Stage 5C).
 *
 * Every future scroll/parallax/reveal value lives here so the storytelling
 * milestones (5C.2+) stay token-driven and consistent. Reuses the global motion
 * easings (theme/motion). Nothing animates from these in 5C.1.
 */
import { easeArr } from '@/theme/motion';

export const storyMotion = {
  /** Distance (px) a revealing element travels into place (≤ 20 — subtle). */
  revealDistance: 16,
  /** Parallax depth multipliers by layer (relative to scroll). Reserved 5C.3. */
  parallaxDepth: {
    back:  0.12,
    mid:   0.28,
    front: 0.5,
  },
  /** Fade-in duration (s) for section reveals. */
  fadeDuration: 0.5,
  /** Easing for scale/zoom reveals (framer tuple). */
  scaleEase: easeArr.out,
  /** Easing for translate reveals (framer tuple). */
  revealEase: easeArr.emphasized,
  /** Inter-section spacing as a fraction of the viewport (transition breathing). */
  sectionSpacing: 0.1,
  /** Cross-section transition timing (s). */
  transitionTiming: 0.6,
  /** Momentum damping for velocity-driven effects (0–1; higher = smoother). */
  momentumDamping: 0.85,

  /* ── StoryScene dynamic-depth emphasis (Stage 5C.2 → 5C.3) ─────────────────
     A scene is fully emphasized while crossing the viewport centre and gently
     de-emphasized at its edges — active (centre) → adjacent (entering/leaving)
     → distant (off-screen). Almost invisible; only opacity + a tiny scale. */
  scene: {
    /* Wider centre plateau so a scene lingers in focus, with soft shoulders so
       adjacent scenes overlap (current settles → shared overlap → next focus). */
    emphasisStops:   [0, 0.28, 0.5, 0.72, 1],
    emphasisOpacity: [0.9, 0.96, 1, 0.96, 0.9],
    emphasisScale:   [0.99, 0.996, 1, 0.996, 0.99],
    /** Shared easing so every scene's emphasis reads as one motion family. */
    emphasisEase: easeArr.inOut,
  },

  /* ── Story Camera (Stage 5C.3, tuned 5C.4) ─────────────────────────────────
     A shared motion model derived from the Story Engine: multi-layer parallax,
     a narrative-depth curve, smoothed focus, and damped momentum — all subtle.
     Springs are over-damped + reasonably stiff so the camera feels attached to
     the scroll: no float, no noticeable lag, no snap. */
  /** Per-depth parallax range (px, total) — never exceeded. Tightened for calm. */
  parallaxRanges: { back: 5, mid: 10, front: 16 },
  /** Scroll progress → narrative depth (0 at Hero, 1 at the end). */
  cameraDepth: { input: [0, 1], output: [0, 1] },
  /** Spring smoothing for the camera's focus (a smoothed scroll position). */
  cameraFocus: { stiffness: 120, damping: 30, mass: 0.5 },
  /** Velocity normalization + over-damped spring for damped momentum. */
  cameraMomentum: { maxVelocity: 2000, stiffness: 90, damping: 30, mass: 0.5 },
  /** How much momentum leads the parallax (0–1; kept very subtle). */
  cameraInterpolation: 0.1,
  /** Background canvas opacity across the narrative depth (ambient variation). */
  cameraBackground: { opacity: [1, 0.97] },
} as const;
