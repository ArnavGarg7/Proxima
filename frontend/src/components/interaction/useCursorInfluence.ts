import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';
import { useTransform, type MotionValue } from 'framer-motion';
import { usePointer } from './InteractionContext';
import { interactionMotion } from './interactionMotion';

/**
 * Local cursor influence for a single element, derived entirely from the shared
 * global pointer (usePointer) — no additional pointer listeners. Values are
 * MotionValues so nothing re-renders on cursor movement. Influence decays
 * smoothly with distance (smoothstep, no abrupt threshold).
 */
export interface CursorInfluenceValue {
  /** Cursor distance from the element centre (px). */
  distance: MotionValue<number>;
  /** Smooth 0–1 influence, 1 at the centre decaying to 0 at the radius. */
  influence: MotionValue<number>;
  /** Cursor x/y relative to the element centre (px). */
  localX: MotionValue<number>;
  localY: MotionValue<number>;
  /** 1 while the cursor is within the influence radius, else 0. */
  isNear: MotionValue<number>;
}

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export function useCursorInfluence(ref: RefObject<HTMLElement>): CursorInfluenceValue {
  const { x: pointerX, y: pointerY } = usePointer();
  const radius = interactionMotion.cursorRadius;
  const center = useRef({ x: 0, y: 0 });

  // Cache element bounds — measured on mount, resize, and scroll only (never on
  // every pointer move). getBoundingClientRect stays out of the hot path.
  useEffect(() => {
    const measure = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      center.current = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    };
    measure();
    window.addEventListener('resize', measure, { passive: true });
    window.addEventListener('scroll', measure, { passive: true, capture: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [ref]);

  const localX = useTransform(pointerX, (x) => x - center.current.x);
  const localY = useTransform(pointerY, (y) => y - center.current.y);
  const distance = useTransform([localX, localY], ([x, y]: number[]) => Math.hypot(x, y));
  const influence = useTransform(distance, (d) => smoothstep(clamp01(1 - d / radius)));
  const isNear = useTransform(distance, (d): number => (d < radius ? 1 : 0));

  return { distance, influence, localX, localY, isNear };
}

/**
 * CursorInfluenceContext — a <CursorInfluence> wrapper publishes its element's
 * influence here so descendants (e.g. InteractionHighlight) can bias toward the
 * cursor without measuring anything themselves. Null when not inside a wrapper.
 */
export const CursorInfluenceContext = createContext<CursorInfluenceValue | null>(null);

/** Read the enclosing element's cursor influence (null if not provided). */
export function useCursorInfluenceContext(): CursorInfluenceValue | null {
  return useContext(CursorInfluenceContext);
}
