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

/**
 * Component-level spacing conventions — all values are mobile-first Tailwind
 * class strings. Apply the whole string via `cn(layout.pagePx)` in JSX.
 */
export const layout = {
  /** Responsive horizontal page gutter: 16px → 24px → 32px */
  pagePx:        'px-4 sm:px-6 lg:px-8',
  /** Responsive vertical page padding: 24px → 32px */
  pagePy:        'py-6 sm:py-8',
  /** Responsive card body padding: 16px → 24px */
  cardPadding:   'p-4 sm:p-6',
  /** Compact card / panel padding: 16px → 20px */
  cardPaddingSm: 'p-4 sm:p-5',
  /** Section gap between cards: 16px → 24px */
  sectionGap:    'gap-4 sm:gap-6',
  /** Gap between inline items */
  inlineGap:     'gap-3',
  /** Standard max content width */
  maxWidth:      'max-w-[1400px]',
  /** Analysis workspace max width (allows ultra-wide without extreme stretching) */
  maxWidthWide:  'max-w-[1600px]',
  /** Navbar height — also set in globals.css as --nav-height */
  navbarHeight:  '60px',
} as const;
