/**
 * Shadow system — Proxima uses elevation-based shadows on a dark background.
 * Shadows are subtle and dark — no harsh drop shadows.
 * Use CSS custom properties (defined in globals.css) for inline styles,
 * or the Tailwind shadow utilities for markup.
 */

export const shadows = {
  /** No elevation — flat surfaces */
  none: 'none',

  /** Cards and panels — first-level elevation */
  sm: '0 1px 3px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3)',

  /** Raised components — dropdowns, popovers */
  md: '0 4px 12px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)',

  /** Modals, overlays */
  lg: '0 10px 30px rgba(0,0,0,0.6), 0 4px 10px rgba(0,0,0,0.4)',

  /** Gold glow — for active/highlighted elements */
  glow: '0 0 0 3px rgba(201,168,76,0.25)',

  /** Error glow — for destructive actions */
  glowError: '0 0 0 3px rgba(239,68,68,0.25)',
} as const;

/**
 * Tailwind-compatible shadow classes.
 * Tailwind's built-in shadows use light-mode values; prefer CSS custom
 * properties for dark-mode accurate shadows in inline styles.
 */
export const shadowClasses = {
  none:   'shadow-none',
  sm:     'shadow-sm',
  md:     'shadow-md',
  lg:     'shadow-lg',
} as const;
