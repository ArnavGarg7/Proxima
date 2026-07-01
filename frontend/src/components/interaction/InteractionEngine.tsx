/**
 * InteractionEngine — builds the global interaction model. Logic only; renders
 * no UI. InteractionProvider wraps its return value in context.
 *
 * It owns the ONE global pointer listener (passive `pointermove`) and writes the
 * cursor position + velocity to MotionValues — so the whole app shares a single
 * pointer source with zero React re-renders and no duplicated listeners. Target
 * setters (hover/press/focus) likewise write MotionValues, never state.
 */
import { useCallback, useEffect, useMemo } from 'react';
import { useMotionValue, useVelocity, useTransform } from 'framer-motion';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import type { InteractionContextValue } from './InteractionContext';

export function useProvideInteraction(): InteractionContextValue {
  const reducedMotion = useReducedMotionSafe();

  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const lastInteraction = useMotionValue(0);
  const hoverTarget = useMotionValue<EventTarget | null>(null);
  const pressedTarget = useMotionValue<EventTarget | null>(null);
  const focusTarget = useMotionValue<EventTarget | null>(null);

  const vx = useVelocity(pointerX);
  const vy = useVelocity(pointerY);
  const pointerVelocity = useTransform([vx, vy], ([x, y]: number[]) => Math.hypot(x, y));

  // The single global pointer listener — passive, MotionValues only, no renders.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onMove = (e: PointerEvent) => {
      pointerX.set(e.clientX);
      pointerY.set(e.clientY);
      lastInteraction.set(performance.now());
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, [pointerX, pointerY, lastInteraction]);

  const setHoverTarget = useCallback((t: EventTarget | null) => hoverTarget.set(t), [hoverTarget]);
  const setPressedTarget = useCallback((t: EventTarget | null) => pressedTarget.set(t), [pressedTarget]);
  const setFocusTarget = useCallback((t: EventTarget | null) => focusTarget.set(t), [focusTarget]);
  const markInteraction = useCallback(() => lastInteraction.set(performance.now()), [lastInteraction]);

  return useMemo<InteractionContextValue>(
    () => ({
      pointerX,
      pointerY,
      pointerVelocity,
      lastInteraction,
      hoverTarget,
      pressedTarget,
      focusTarget,
      reducedMotion,
      setHoverTarget,
      setPressedTarget,
      setFocusTarget,
      markInteraction,
    }),
    [
      pointerX, pointerY, pointerVelocity, lastInteraction,
      hoverTarget, pressedTarget, focusTarget, reducedMotion,
      setHoverTarget, setPressedTarget, setFocusTarget, markInteraction,
    ],
  );
}
