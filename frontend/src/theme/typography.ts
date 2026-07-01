/**
 * Typography system — defines every text variant used in Proxima.
 *
 * Variant naming convention:
 *   display-xl / display-lg  — Hero and page-level display text (Playfair Display)
 *   h1 / h2 / h3             — Structural headings (Playfair Display)
 *   body-lg / body-md / body-sm — Body copy (Inter)
 *   label                    — Uppercase micro-labels (Inter, tracked)
 *   caption                  — Helper text and metadata (Inter, muted)
 *   mono                     — Code and technical values (JetBrains Mono)
 */

export type TypographyVariant =
  | 'display-xl'
  | 'display-lg'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'body-lg'
  | 'body-md'
  | 'body-sm'
  | 'label'
  | 'caption'
  | 'mono';

/**
 * Tailwind class bundles for each variant — mobile-first responsive scale.
 *
 * Heading sizes shrink gracefully on small screens. Desktop sizes (lg:) are
 * identical to the previous fixed values, so existing desktop layouts are
 * pixel-perfect unchanged. Body, label, caption, and mono are already
 * compact enough that no responsive scaling is needed.
 */
export const typographyStyles: Record<TypographyVariant, string> = {
  // Display headings — Playfair Display
  'display-xl': 'font-display text-2xl font-semibold leading-tight tracking-tight text-text-primary sm:text-3xl lg:text-4xl',
  'display-lg': 'font-display text-xl  font-semibold leading-tight tracking-tight text-text-primary sm:text-2xl lg:text-3xl',
  // Structural headings — Playfair Display
  'h1':         'font-display text-xl  font-semibold leading-snug text-text-primary sm:text-2xl',
  'h2':         'font-display text-lg  font-semibold leading-snug text-text-primary sm:text-xl',
  'h3':         'font-sans   text-base font-semibold leading-snug text-text-primary sm:text-lg',
  // Body — Inter (no responsive scaling — compact by default)
  'body-lg':    'font-sans   text-base leading-relaxed text-text-primary',
  'body-md':    'font-sans   text-sm   leading-relaxed text-text-primary',
  'body-sm':    'font-sans   text-xs   leading-relaxed text-text-secondary',
  'label':      'font-sans   text-xs   font-medium uppercase tracking-widest text-text-muted',
  'caption':    'font-sans   text-xs   leading-normal text-text-muted',
  'mono':       'font-mono   text-sm   leading-relaxed text-text-primary',
};

/** Default HTML element for each variant (can be overridden with `as` prop) */
export const typographyElements: Record<TypographyVariant, React.ElementType> = {
  'display-xl': 'h1',
  'display-lg': 'h2',
  'h1':         'h1',
  'h2':         'h2',
  'h3':         'h3',
  'body-lg':    'p',
  'body-md':    'p',
  'body-sm':    'p',
  'label':      'span',
  'caption':    'span',
  'mono':       'code',
};

import type React from 'react';
