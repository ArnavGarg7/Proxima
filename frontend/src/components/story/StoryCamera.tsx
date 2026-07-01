import { useMemo, type ReactNode } from 'react';
import { useSpring, useTransform } from 'framer-motion';
import { useStory, StoryCameraContext, type StoryCameraValue } from './StoryContext';
import { storyMotion } from './storyMotion';

const clampUnit = (v: number) => (v > 1 ? 1 : v < -1 ? -1 : v);

/**
 * useProvideStoryCamera — builds the shared cinematic motion model from the
 * Story Engine. No new scroll observers, no timers: it derives everything from
 * the engine's already-shared `progress`/`scrollVelocity` MotionValues and a
 * couple of springs. Internal to this module.
 */
function useProvideStoryCamera(): StoryCameraValue {
  const { progress, scrollVelocity, reducedMotion } = useStory();

  const depth = useTransform(
    progress,
    [...storyMotion.cameraDepth.input] as number[],
    [...storyMotion.cameraDepth.output] as number[],
    { clamp: true },
  );
  const focus = useSpring(progress, storyMotion.cameraFocus);

  const normalized = useTransform(scrollVelocity, (v) =>
    clampUnit(v / storyMotion.cameraMomentum.maxVelocity),
  );
  const momentum = useSpring(normalized, {
    stiffness: storyMotion.cameraMomentum.stiffness,
    damping: storyMotion.cameraMomentum.damping,
    mass: storyMotion.cameraMomentum.mass,
  });

  return useMemo<StoryCameraValue>(
    () => ({ depth, focus, progress, velocity: scrollVelocity, momentum, reducedMotion }),
    [depth, focus, progress, scrollVelocity, momentum, reducedMotion],
  );
}

/**
 * StoryCameraProvider — the virtual Story Camera. Not a visual component; it
 * provides the shared motion model so BackgroundFX, StoryScene, and future
 * section visuals all move from one source. Must sit below StoryProvider (it
 * derives from the engine) and above any consumer (e.g. BackgroundFX).
 */
export function StoryCameraProvider({ children }: { children: ReactNode }) {
  const camera = useProvideStoryCamera();
  return <StoryCameraContext.Provider value={camera}>{children}</StoryCameraContext.Provider>;
}
