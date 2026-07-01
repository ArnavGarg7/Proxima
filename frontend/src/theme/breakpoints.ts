/**
 * Breakpoint strategy — Proxima uses standard Tailwind breakpoints with
 * clear semantic roles. All breakpoints are min-width (mobile-first).
 *
 * ┌──────────┬───────────┬───────────────────────────────────────────────────┐
 * │ Prefix   │ Min-width │ Semantic role                                     │
 * ├──────────┼───────────┼───────────────────────────────────────────────────┤
 * │ (base)   │   0 px    │ Single column · full-width cards · stacked panels │
 * │ sm       │ 640 px    │ 2-col grids · wider gutters · label tweaks        │
 * │ md       │ 768 px    │ 2-col analysis layouts · collapsible sidebars     │
 * │ lg       │ 1024 px   │ Inspector panel visible beside main content       │
 * │ xl       │ 1280 px   │ Outline sidebar visible · 3-panel workspace       │
 * │ 2xl      │ 1536 px   │ Wider max-width for ultra-wide monitors           │
 * └──────────┴───────────┴───────────────────────────────────────────────────┘
 *
 * Analysis workspace (AnalysisLayout):
 *   < 640 px   →  stacked: main → inspector (separated by border) → sidebar hidden
 *   640–1023   →  stacked: main → inspector (separator), sidebar hidden
 *   1024–1279  →  side-by-side: main | inspector
 *   1280 px+   →  three-panel: sidebar | main | inspector
 *
 * Grid patterns:
 *   1 col  (base)  →  full-width on phones
 *   2 col  (sm/md) →  cards and content columns
 *   3 col  (xl)    →  template grids, metric dashboards
 *
 * Typography responsive scale:
 *   display-xl: text-2xl → sm:text-3xl → lg:text-4xl
 *   display-lg: text-xl  → sm:text-2xl → lg:text-3xl
 *   h1:         text-xl  → sm:text-2xl
 *   h2:         text-lg  → sm:text-xl
 *   h3:         text-base → sm:text-lg
 */
export const breakpoints = {
  sm:  640,
  md:  768,
  lg:  1024,
  xl:  1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof breakpoints;
