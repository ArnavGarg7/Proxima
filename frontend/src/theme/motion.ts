/**
 * Motion system — timing and easing definitions for Proxima.
 *
 * STAGE 4.1: This file defines constants only.
 * Framer Motion AnimatePresence page transitions and stagger animations
 * are scheduled for Stage 4.4. Do not implement motion here yet.
 *
 * These constants are the single source of truth that CSS transitions,
 * Tailwind classes, and future Framer Motion variants should all derive from.
 */

/** Duration in milliseconds */
export const duration = {
  /** Micro-interactions: icon hover, checkbox tick */
  fast:  100,
  /** Standard interactions: button hover, input focus, card hover */
  base:  150,
  /** Emphasis transitions: panel open, badge change */
  slow:  250,
  /** Page-level transitions (future Framer Motion use) */
  page:  300,
  /** Complex reveals: staggered card grids */
  enter: 400,
} as const;

/** CSS easing curves */
export const ease = {
  /** General purpose — accelerate then decelerate */
  default: 'cubic-bezier(0.4, 0, 0.2, 1)',
  /** Enter — decelerating (element arriving) */
  out:     'cubic-bezier(0, 0, 0.2, 1)',
  /** Exit — accelerating (element leaving) */
  in:      'cubic-bezier(0.4, 0, 1, 1)',
  /** Playful spring — for emphasis, not default */
  spring:  'cubic-bezier(0.34, 1.56, 0.64, 1)',
} as const;

/** Tailwind transition class shortcuts — use in className props */
export const transition = {
  /** Colors, borders, text-color, opacity */
  colors: 'transition-colors duration-150',
  /** All properties — use sparingly */
  all:    'transition-all duration-150',
  /** Transform only — hover lift and scale */
  transform: 'transition-transform duration-150',
} as const;

/** Scale factors for interactive state (applied via Tailwind `scale-*`) */
export const scale = {
  /** Hover scale for cards and large interactive surfaces */
  cardHover:   1.01,
  /** Icon scale on parent hover */
  iconHover:   1.1,
  /** Button press feedback */
  buttonPress: 0.98,
} as const;

/** Translate values for lift effects */
export const lift = {
  /** btn-primary hover lift */
  button: '-1px',
  /** Card hover lift (future, Stage 4.4) */
  card:   '-2px',
} as const;

/**
 * Framer Motion variant blueprints — to be wired up in Stage 4.4.
 * Defined here now so all future animation work references a single spec.
 */
export const motionSpec = {
  pageEnter: {
    initial:  { opacity: 0, y: 8 },
    animate:  { opacity: 1, y: 0 },
    exit:     { opacity: 0, y: -4 },
    transition: { duration: duration.page / 1000, ease: ease.out },
  },
  cardStagger: {
    container: { transition: { staggerChildren: 0.05 } },
    item: {
      initial:  { opacity: 0, y: 12 },
      animate:  { opacity: 1, y: 0 },
      transition: { duration: duration.slow / 1000, ease: ease.out },
    },
  },
  fadeIn: {
    initial:  { opacity: 0 },
    animate:  { opacity: 1 },
    transition: { duration: duration.base / 1000 },
  },
} as const;
