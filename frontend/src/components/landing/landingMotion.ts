/**
 * landingMotion — shared Framer Motion variants for the marketing page.
 *
 * All timing is derived from the Stage 4.1 motion tokens (theme/motion.ts)
 * so the landing page animates on the same rhythm as the rest of the app.
 * Pure constants — no component exports.
 */
import type { Variants } from 'framer-motion';
import { duration, easeArr } from '@/theme/motion';

/** ease.out as a Framer Motion array — re-exported from the motion token system */
export const EASE_OUT = easeArr.out;

const s = (ms: number) => ms / 1000;

/** Single element — fade up into place */
export const fadeUp: Variants = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: s(duration.enter), ease: EASE_OUT } },
};

/** Container that staggers its direct motion children */
export const staggerContainer: Variants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: s(duration.fast) },
  },
};

/** Item inside a staggerContainer */
export const staggerItem: Variants = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: s(duration.slow), ease: EASE_OUT } },
};

/** Tighter stagger for dense grids (cards) */
export const gridContainer: Variants = {
  hidden:  {},
  visible: {
    transition: { staggerChildren: 0.05 },
  },
};
