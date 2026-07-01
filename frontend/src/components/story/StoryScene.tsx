import { useMemo, useRef, type ReactNode } from 'react';
import { motion, useScroll, useTransform, cubicBezier } from 'framer-motion';
import {
  useStory,
  useStoryCamera,
  StorySceneContext,
  type StorySceneValue,
} from './StoryContext';
import { StorySection } from './StorySection';
import { storyMotion } from './storyMotion';
import { STORY_SECTIONS, type StorySectionId } from './storyTimeline';

type SceneDepth = 'back' | 'mid' | 'front';

/** Shared emphasis easing (token → framer EasingFunction), computed once. */
const E = storyMotion.scene.emphasisEase;
const EMPHASIS_EASE = cubicBezier(E[0], E[1], E[2], E[3]);

interface StorySceneProps {
  section: StorySectionId;
  /** Depth layer — drives the parallax range (back 6 / mid 12 / front 18 px). */
  depth?: SceneDepth;
  /** Set false for a fully static scene (e.g. the footer) — no camera motion. */
  cinematic?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * StoryScene — the public per-section abstraction, now cinematic (Stage 5C.3).
 *
 * Every cinematic value originates from the Story Camera + this section's own
 * scroll progress (from the Story Engine — no duplicated scroll math):
 *   • dynamic-depth emphasis — opacity/scale ease active → adjacent → distant,
 *     so the focus shifts between chapters without anything disappearing;
 *   • multi-layer parallax — a depth-scaled translateY (≤18px) the scene drifts
 *     by as it crosses the viewport, with a very subtle momentum lead from the
 *     camera so fast scrolls feel weightier.
 * Movement is tiny and entirely token-driven (storyMotion). Under reduced motion
 * (or `cinematic={false}`) only opacity changes — no transforms, so backdrop-blur
 * stays intact and the narrative still progresses.
 */
export function StoryScene({
  section,
  depth = 'mid',
  cinematic = true,
  className,
  children,
}: StorySceneProps) {
  const { currentSection, activeIndex, direction, reducedMotion } = useStory();
  const camera = useStoryCamera();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const sc = storyMotion.scene;
  const stops = [...sc.emphasisStops] as number[];
  // Same easing family + rhythm for every scene — none feels faster than another.
  const emphasisOptions = { clamp: true, ease: EMPHASIS_EASE } as const;
  const opacity = useTransform(scrollYProgress, stops, [...sc.emphasisOpacity] as number[], emphasisOptions);
  const scale = useTransform(scrollYProgress, stops, [...sc.emphasisScale] as number[], emphasisOptions);

  // Multi-layer parallax — centred so the active scene sits at its natural spot.
  const range = storyMotion.parallaxRanges[depth];
  const parallax = useTransform(scrollYProgress, [0, 1], [range / 2, -range / 2], { clamp: true });
  const lead = storyMotion.cameraInterpolation * range;
  const momentumLead = useTransform(camera.momentum, [-1, 1], [lead, -lead]);
  const y = useTransform([parallax, momentumLead], ([p, m]: number[]) => p + m);

  const index = STORY_SECTIONS.indexOf(section);
  const isActive = currentSection === section;

  const sceneValue = useMemo<StorySceneValue>(
    () => ({
      progress: scrollYProgress,
      isActive,
      isEntering: index > activeIndex,
      isLeaving: index < activeIndex,
      depth,
      direction,
    }),
    [scrollYProgress, isActive, index, activeIndex, depth, direction],
  );

  // Static / reduced motion → opacity only (no transform → backdrop-blur safe).
  const style = !cinematic
    ? {}
    : reducedMotion
      ? { opacity }
      : { opacity, y, scale };

  return (
    <StorySection section={section} className={className} ref={ref}>
      <StorySceneContext.Provider value={sceneValue}>
        <motion.div style={style} data-story-scene={section} className="will-change-transform">
          {children}
        </motion.div>
      </StorySceneContext.Provider>
    </StorySection>
  );
}
