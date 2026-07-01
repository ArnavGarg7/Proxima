import { useTransform, type MotionValue } from 'framer-motion';
import { INIT_END, RESTART_START } from './productTimeline';

/**
 * useShowcaseReveal — the whole-mockup reveal opacity every showcase uses: fade
 * in over Initialize, hold, fade out over Restart, so each one loops seamlessly
 * on one shared curve (no per-showcase reveal math).
 */
export function useShowcaseReveal(progress: MotionValue<number>): MotionValue<number> {
  return useTransform(progress, [0, INIT_END, RESTART_START, 1], [0, 1, 1, 0]);
}
