import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';
import type { StorySectionId } from './storyTimeline';

/**
 * StoryContextValue — the single source of scroll/narrative state for the
 * landing page. No section computes scroll state on its own; every section
 * consumes this via useStory(). Continuous values are MotionValues, so
 * per-frame scroll updates never trigger React re-renders.
 */
export interface StoryContextValue {
  /** The section currently crossing the activation band. */
  currentSection: StorySectionId;
  /** Index of currentSection within STORY_SECTIONS. */
  activeIndex: number;
  /** Overall landing scroll progress, 0–1. */
  progress: MotionValue<number>;
  /** Scroll direction: 1 down, -1 up, 0 idle. */
  direction: MotionValue<number>;
  /** Scroll velocity in px/s. */
  scrollVelocity: MotionValue<number>;
  /** True while the visitor is actively scrolling. */
  isScrolling: boolean;
  /** Whether the user prefers reduced motion (story still progresses). */
  reducedMotion: boolean;
  /** Register a section element with the single observer; returns an unregister fn. */
  register: (section: StorySectionId, el: Element) => () => void;
}

/**
 * StoryContext — provided by StoryProvider, consumed via useStory(). Exported
 * as a context object (not a provider component) so this module stays
 * component-free for fast refresh.
 */
export const StoryContext = createContext<StoryContextValue | null>(null);

/** Read the landing story state. Must be used within a StoryProvider. */
export function useStory(): StoryContextValue {
  const ctx = useContext(StoryContext);
  if (ctx === null) {
    throw new Error('useStory must be used within a StoryProvider');
  }
  return ctx;
}

/** Convenience accessor for the overall 0–1 scroll progress MotionValue. */
export function useStoryProgress(): MotionValue<number> {
  return useStory().progress;
}

/**
 * StorySceneValue — per-scene state a StoryScene exposes to its children. All
 * values derive from the StoryEngine; nothing is recalculated here. Reserved for
 * future per-section effects (5C.3) — `progress` will power parallax.
 */
export interface StorySceneValue {
  /** This section's normalized 0–1 scroll progress. */
  progress: MotionValue<number>;
  /** Whether this is the section currently crossing the activation band. */
  isActive: boolean;
  /** Whether this section is still ahead in the narrative (below the active one). */
  isEntering: boolean;
  /** Whether this section is behind in the narrative (above the active one). */
  isLeaving: boolean;
  /** Depth layer for this scene. */
  depth: 'back' | 'mid' | 'front';
  /** Shared scroll direction (1 down, -1 up, 0 idle). */
  direction: MotionValue<number>;
}

export const StorySceneContext = createContext<StorySceneValue | null>(null);

/** Read the enclosing StoryScene's state. Must be used within a StoryScene. */
export function useStoryScene(): StorySceneValue {
  const ctx = useContext(StorySceneContext);
  if (ctx === null) {
    throw new Error('useStoryScene must be used within a StoryScene');
  }
  return ctx;
}

/**
 * StoryCameraValue — the shared cinematic motion model (Stage 5C.3). A virtual
 * camera derived entirely from the StoryEngine; all cinematic movement
 * (parallax, depth, background sync) originates from these MotionValues, so the
 * page gains depth without any per-component scroll math.
 */
export interface StoryCameraValue {
  /** Narrative depth 0–1 — deeper as the story progresses. */
  depth: MotionValue<number>;
  /** Smoothed focal scroll position 0–1 (the camera eases toward the scroll). */
  focus: MotionValue<number>;
  /** Overall scroll progress 0–1 (pass-through). */
  progress: MotionValue<number>;
  /** Scroll velocity px/s (pass-through). */
  velocity: MotionValue<number>;
  /** Damped, normalized momentum −1…1. */
  momentum: MotionValue<number>;
  /** Whether camera movement is disabled (reduced motion). */
  reducedMotion: boolean;
}

export const StoryCameraContext = createContext<StoryCameraValue | null>(null);

/** Read the Story Camera. Must be used within a StoryCameraProvider. */
export function useStoryCamera(): StoryCameraValue {
  const ctx = useContext(StoryCameraContext);
  if (ctx === null) {
    throw new Error('useStoryCamera must be used within a StoryCameraProvider');
  }
  return ctx;
}

/** Read the Story Camera if present (null otherwise) — for optional consumers. */
export function useStoryCameraOptional(): StoryCameraValue | null {
  return useContext(StoryCameraContext);
}
