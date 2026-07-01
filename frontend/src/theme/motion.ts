/**
 * Motion system — Proxima's unified animation tokens.
 *
 * Single source of truth for:
 *   - Duration values (ms)
 *   - Easing curves (CSS strings + Framer Motion arrays)
 *   - Scale / lift / opacity values
 *   - Framer Motion variant blueprints
 *   - Stagger + looping timing
 *
 * Philosophy: Fast. Precise. Confident.
 * Reference: Linear, Vercel, Cursor, Arc Browser.
 *
 * Performance rules — only animate opacity + transform.
 * Never animate: width, height, left, top, box-shadow.
 */

import type { Variants, Transition } from 'framer-motion';

// ─── Durations (milliseconds) ─────────────────────────────────────────────────

export const duration = {
  /** Micro-interaction: icon swap, state toggle */
  instant: 50,
  /** Standard hover, color swap */
  fast:    100,
  /** Button, input focus, most transitions */
  base:    150,
  /** Panel open, badge change, drawer */
  slow:    250,
  /** Page-level transitions */
  page:    300,
  /** Complex reveals, staggered grids */
  enter:   400,
} as const;

// ─── Looping animation durations (seconds) ────────────────────────────────────
// All repeating effects reference one of these so every loop on the same page
// runs at a consistent cadence.

export const loopDuration = {
  /** Blinking caret / cursor-blink rate (s). */
  blink:   1.1,
  /** Spinning icon — upload, process, routing (s). */
  spinner: 1.4,
  /** Ambient pulse — status dot, live indicator (s). */
  pulse:   1.8,
} as const;

// ─── Easings — CSS cubic-bezier strings ───────────────────────────────────────

export const ease = {
  /** Decelerate: element arriving — most common */
  out:      'cubic-bezier(0, 0, 0.2, 1)',
  /** Symmetric: shared-axis, reversible transitions */
  inOut:    'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Accelerate: element leaving */
  in:       'cubic-bezier(0.4, 0, 1, 1)',
  /** Constant speed: spinners, marquees */
  linear:   'linear',
  /** Calm deceleration: hero + modal entry */
  emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
  /** Playful spring — use sparingly, never as default */
  spring:   'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

// ─── Easings — Framer Motion arrays ───────────────────────────────────────────
// Framer Motion expects [x1, y1, x2, y2] tuples, not CSS strings.

export const easeArr = {
  out:        [0, 0, 0.2, 1]     as [number, number, number, number],
  inOut:      [0.4, 0, 0.2, 1]   as [number, number, number, number],
  in:         [0.4, 0, 1, 1]     as [number, number, number, number],
  emphasized: [0.2, 0, 0, 1]     as [number, number, number, number],
} as const;

// ─── Scale ────────────────────────────────────────────────────────────────────

export const scale = {
  /** Button press — immediate tactile feedback */
  press:      0.98,
  /** Card active press */
  cardPress:  0.99,
  /** Modal / dialog entry starting scale */
  dialogIn:   0.97,
  /** Hover scale for cards — cards LIFT, not scale */
  cardHover:  1.0,
  /** Icon hover scale on parent hover */
  iconHover:  1.1,
} as const;

// ─── Opacity ──────────────────────────────────────────────────────────────────

export const opacity = {
  hidden:   0,
  visible:  1,
  /** Backdrop / overlay */
  overlay:  0.6,
  /** Disabled elements */
  disabled: 0.4,
  /** Muted / secondary content */
  muted:    0.6,
} as const;

// ─── Lift — translateY for hover effects ──────────────────────────────────────

export const lift = {
  /** Primary button hover lift (px, as number for Framer) */
  button: -1,
  /** Card hover lift */
  card:   -2,
  /** Small element lift */
  small:  -1,
} as const;

// ─── Tailwind transition shorthand strings ────────────────────────────────────

export const transition = {
  colors:    'transition-colors duration-150',
  all:       'transition-all duration-150',
  transform: 'transition-transform duration-150',
  opacity:   'transition-opacity duration-150',
} as const;

// ─── Framer Motion transition presets ─────────────────────────────────────────

export const motionTransition: Record<string, Transition> = {
  instant: { duration: duration.instant / 1000, ease: easeArr.out  },
  fast:    { duration: duration.fast    / 1000, ease: easeArr.out  },
  base:    { duration: duration.base    / 1000, ease: easeArr.out  },
  slow:    { duration: duration.slow    / 1000, ease: easeArr.out  },
  page:    { duration: duration.page    / 1000, ease: easeArr.out  },
  enter:   { duration: duration.enter   / 1000, ease: easeArr.out  },
  exit:    { duration: duration.fast    / 1000, ease: easeArr.in   },
  overlay: { duration: duration.base    / 1000, ease: easeArr.inOut },
  dialog:  { duration: duration.slow    / 1000, ease: easeArr.emphasized },
};

// ─── Framer Motion variants ───────────────────────────────────────────────────
// All respect reduced motion — components must check useReducedMotion().

export const motionVariants: Record<string, Variants> = {
  /** Opacity fade only — toasts, tooltips, overlays */
  fadeIn: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: motionTransition.base },
    exit:    { opacity: 0, transition: motionTransition.exit },
  },

  /** Fade + subtle upward lift — cards, panels, inspector sections */
  fadeUp: {
    hidden:  { opacity: 0, y: 8 },
    visible: { opacity: 1, y: 0, transition: motionTransition.slow },
    exit:    { opacity: 0, y: -4, transition: motionTransition.exit },
  },

  /** Scale from 97% with fade — dialogs, popovers */
  scaleIn: {
    hidden:  { opacity: 0, scale: scale.dialogIn },
    visible: { opacity: 1, scale: 1, transition: motionTransition.slow },
    exit:    { opacity: 0, scale: scale.dialogIn, transition: motionTransition.exit },
  },

  /** Slide in from left — drawers */
  slideInLeft: {
    hidden:  { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0, transition: motionTransition.slow },
    exit:    { opacity: 0, x: -16, transition: motionTransition.exit },
  },

  /** Slide in from right */
  slideInRight: {
    hidden:  { opacity: 0, x: 16 },
    visible: { opacity: 1, x: 0, transition: motionTransition.slow },
    exit:    { opacity: 0, x: 16, transition: motionTransition.exit },
  },

  /** Backdrop fade — modal / drawer overlay */
  overlay: {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: motionTransition.overlay },
    exit:    { opacity: 0, transition: motionTransition.exit },
  },

  /** Dialog — scale + fade */
  dialog: {
    hidden:  { opacity: 0, scale: scale.dialogIn },
    visible: { opacity: 1, scale: 1, transition: motionTransition.dialog },
    exit:    { opacity: 0, scale: scale.dialogIn, transition: motionTransition.exit },
  },

  /** Page-level fade+lift */
  page: {
    initial:  { opacity: 0, y: 6 },
    animate:  { opacity: 1, y: 0, transition: motionTransition.page },
    exit:     { opacity: 0, y: -4, transition: motionTransition.exit },
  },

  /** Toast entry — fade + upward */
  toast: {
    hidden:  { opacity: 0, y: 8, scale: 0.98 },
    visible: { opacity: 1, y: 0, scale: 1, transition: motionTransition.base },
    exit:    { opacity: 0, y: 4, transition: motionTransition.exit },
  },
};

// ─── Stagger timing ───────────────────────────────────────────────────────────

export const stagger = {
  /** Dense grids, tight lists */
  fast: 0.05,
  /** Standard card grids and landing content */
  base: 0.08,
  /** Sparse layouts, hero content */
  slow: 0.10,
} as const;

// ─── Hover hierarchy — animation intensity by component importance ─────────────
// ★★★★★  Primary CTA: lift + press scale
// ★★★★☆  Card: translateY(-2px)
// ★★★☆☆  Nav Item: color only
// ★★☆☆☆  Chip: border + opacity
// ★☆☆☆☆  Badge: no animation

export const hoverHierarchy = {
  primaryCta: { lift: lift.button, press: scale.press },
  card:       { lift: lift.card,   press: scale.cardPress },
  navItem:    { lift: 0,           press: 1 },
  chip:       { lift: 0,           press: 1 },
  badge:      { lift: 0,           press: 1 },
} as const;
