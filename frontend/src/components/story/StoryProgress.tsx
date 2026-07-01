import { useEffect } from 'react';
import { useMotionValueEvent } from 'framer-motion';
import { useStory } from './StoryContext';
import { STORY_SECTIONS } from './storyTimeline';

/**
 * StoryProgress — the landing's progress model (Stage 5C).
 *
 * Not visible yet. It mirrors the narrative position onto two CSS custom
 * properties on the document root, written imperatively (no React re-render):
 *   • `--story-progress` — overall 0–1 scroll progress.
 *   • `--story-section`  — the active scene's normalized index (Hero 0 → Footer 1),
 *     driven by the StoryScene activation, so the model reflects the current
 *     chapter, not just raw scroll.
 * Future milestones can visualize these (a scroll rail, chapter dots, …).
 */
export function StoryProgress() {
  const { progress, activeIndex } = useStory();

  useMotionValueEvent(progress, 'change', (value) => {
    document.documentElement.style.setProperty('--story-progress', value.toFixed(4));
  });

  useEffect(() => {
    const denom = Math.max(1, STORY_SECTIONS.length - 1);
    document.documentElement.style.setProperty('--story-section', (activeIndex / denom).toFixed(4));
  }, [activeIndex]);

  return null;
}
