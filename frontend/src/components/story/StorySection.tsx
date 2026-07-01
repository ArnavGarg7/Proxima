import { forwardRef, useEffect, useRef, type ReactNode } from 'react';
import { useStory } from './StoryContext';
import type { StorySectionId } from './storyTimeline';

interface StorySectionProps {
  /** Narrative section id (see STORY_SECTIONS). */
  section: StorySectionId;
  children: ReactNode;
  /** Optional pass-through class (none by default — the wrapper is transparent). */
  className?: string;
}

/**
 * StorySection — the low-level registration wrapper.
 *
 * It registers its element with the StoryEngine's single observer (visibility +
 * activation) and forwards a ref to that element so a StoryScene can scroll-track
 * the *untransformed* node (the scene applies transforms to an inner element, so
 * measurements never feed back into the transform). Transparent block, no styling
 * — the page looks identical. StoryScene is the public abstraction; sections
 * should be wrapped in StoryScene, not StorySection directly.
 */
export const StorySection = forwardRef<HTMLDivElement, StorySectionProps>(
  function StorySection({ section, children, className }, ref) {
    const { register } = useStory();
    const innerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      const el = innerRef.current;
      if (!el) return;
      return register(section, el);
    }, [register, section]);

    const setRef = (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <div ref={setRef} data-story-section={section} className={className}>
        {children}
      </div>
    );
  },
);
