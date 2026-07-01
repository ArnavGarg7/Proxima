/**
 * StoryEngine — orchestrates the landing narrative. Logic only; renders no UI.
 * StoryProvider wraps its return value in context.
 *
 * It is the single owner of scroll state: one IntersectionObserver tracks which
 * section is active, framer's scroll primitives provide overall progress +
 * velocity + direction, and it reads the shared FXClock (no independent timers /
 * animation clocks). Sections register their element here instead of creating
 * their own observers. Stage 5C.1 is architecture only — nothing animates yet.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useScroll, useVelocity, useTransform, useMotionValueEvent } from 'framer-motion';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { STORY_SECTIONS, STORY_TIMELINE, type StorySectionId } from './storyTimeline';
import type { StoryContextValue } from './StoryContext';

export function useProvideStory(): StoryContextValue {
  // Reduced-motion comes straight from the SSR-safe hook, so the Story Engine
  // no longer depends on FXClock — letting StoryProvider sit ABOVE BackgroundFX
  // (which can then read the Story Camera) without a module cycle.
  const reducedMotion = useReducedMotionSafe();

  // Shared scroll primitives (single rAF source inside framer — no new clock).
  const { scrollY, scrollYProgress } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const direction = useTransform(scrollVelocity, (v): number => (v > 1 ? 1 : v < -1 ? -1 : 0));

  const [currentSection, setCurrentSection] = useState<StorySectionId>(STORY_SECTIONS[0]);
  const [isScrolling, setIsScrolling] = useState(false);

  const elementsRef = useRef<Map<Element, StorySectionId>>(new Map());
  const intersectingRef = useRef<Set<Element>>(new Set());
  const observerRef = useRef<IntersectionObserver | null>(null);
  const activeRef = useRef<StorySectionId>(STORY_SECTIONS[0]);

  // Derive isScrolling from velocity with hysteresis — no timer. React bails out
  // when the value is unchanged, so this never re-renders mid-gesture.
  useMotionValueEvent(scrollVelocity, 'change', (v) => {
    const speed = Math.abs(v);
    setIsScrolling((prev) =>
      prev ? speed > STORY_TIMELINE.scrollIdleOff : speed > STORY_TIMELINE.scrollIdleOn,
    );
  });

  // The single IntersectionObserver. Sections register their element with us; on
  // every change we activate the intersecting section nearest the viewport
  // centre — stable regardless of scroll speed or overlap.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) intersectingRef.current.add(entry.target);
          else intersectingRef.current.delete(entry.target);
        }
        const center = window.innerHeight / 2;
        let bestSection: StorySectionId | null = null;
        let bestDist = Infinity;
        for (const el of intersectingRef.current) {
          const section = elementsRef.current.get(el);
          if (!section) continue;
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top + rect.height / 2 - center);
          if (dist < bestDist) {
            bestDist = dist;
            bestSection = section;
          }
        }
        if (bestSection !== null && activeRef.current !== bestSection) {
          activeRef.current = bestSection;
          setCurrentSection(bestSection);
        }
      },
      { rootMargin: STORY_TIMELINE.rootMargin, threshold: 0 },
    );
    observerRef.current = observer;
    // Observe anything registered before this effect ran (child effects first).
    for (const el of elementsRef.current.keys()) observer.observe(el);
    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, []);

  const register = useCallback((section: StorySectionId, el: Element) => {
    elementsRef.current.set(el, section);
    observerRef.current?.observe(el);
    return () => {
      observerRef.current?.unobserve(el);
      elementsRef.current.delete(el);
      intersectingRef.current.delete(el);
    };
  }, []);

  const activeIndex = STORY_SECTIONS.indexOf(currentSection);

  return useMemo<StoryContextValue>(
    () => ({
      currentSection,
      activeIndex,
      progress: scrollYProgress,
      direction,
      scrollVelocity,
      isScrolling,
      reducedMotion,
      register,
    }),
    [
      currentSection, activeIndex, scrollYProgress, direction,
      scrollVelocity, isScrolling, reducedMotion, register,
    ],
  );
}
