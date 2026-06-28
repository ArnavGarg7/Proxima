/**
 * Spacing scale — based on a 4px base unit.
 * Use these constants when computing dynamic styles in JS.
 * In Tailwind markup, use the equivalent utility (e.g. `p-4` = space[4]).
 */
export const space = {
  0:  '0px',
  px: '1px',
  0.5:'2px',
  1:  '4px',
  1.5:'6px',
  2:  '8px',
  2.5:'10px',
  3:  '12px',
  3.5:'14px',
  4:  '16px',
  5:  '20px',
  6:  '24px',
  7:  '28px',
  8:  '32px',
  9:  '36px',
  10: '40px',
  11: '44px',
  12: '48px',
  14: '56px',
  16: '64px',
  20: '80px',
  24: '96px',
} as const;

/** Component-level spacing conventions */
export const layout = {
  /** Standard card padding */
  cardPadding:    'p-6',
  /** Compact card padding */
  cardPaddingSm:  'p-4',
  /** Page outer padding */
  pagePadding:    'p-8',
  /** Section gap between cards */
  sectionGap:     'gap-6',
  /** Gap between inline items */
  inlineGap:      'gap-3',
  /** Max content width */
  maxWidth:       'max-w-[1400px]',
  /** Navbar height */
  navbarHeight:   '60px',
} as const;
