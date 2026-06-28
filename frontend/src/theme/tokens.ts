/**
 * Design tokens — single source of truth for Proxima's visual identity.
 * All values mirror tailwind.config.ts exactly. CSS custom properties
 * in globals.css also reference these values.
 *
 * Do NOT use raw hex values elsewhere — always reference these tokens
 * or their corresponding Tailwind utility class.
 */

export const colors = {
  // Surface stack (dark-first)
  void:    '#0A0A0A',
  surface: '#111111',
  elevated:'#1A1A1A',

  border: {
    default: '#2A2A2A',
    strong:  '#3A3A3A',
  },

  text: {
    primary:   '#F0EFE9',
    secondary: '#888880',
    muted:     '#555550',
  },

  gold: {
    primary: '#C9A84C',
    bright:  '#E5C76B',
    dim:     '#8A6F32',
  },

  // Semantic status
  status: {
    success:  '#22c55e',
    warning:  '#f59e0b',
    low:      '#f97316',
    critical: '#ef4444',
    info:     '#60A5FA',
  },

  // Domain identity
  domain: {
    code:    '#4ADE80',
    medical: '#60A5FA',
    legal:   '#C9A84C',
  },
} as const;

export const radius = {
  none: '0px',
  sm:   '4px',
  base: '6px',
  md:   '8px',
  lg:   '12px',
  xl:   '16px',
  full: '9999px',
} as const;

export const borderWidth = {
  thin:   '1px',
  base:   '1px',
  medium: '2px',
} as const;

export const opacity = {
  disabled: 0.4,
  muted:    0.6,
  overlay:  0.8,
} as const;

export const zIndex = {
  base:    0,
  raised:  10,
  dropdown:20,
  overlay: 30,
  modal:   40,
  toast:   50,
} as const;
