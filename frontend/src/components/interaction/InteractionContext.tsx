import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
  type FocusEvent as ReactFocusEvent,
} from 'react';
import { useMotionValue, useSpring, type MotionValue } from 'framer-motion';
import { interactionMotion, type SpringPreset } from './interactionMotion';

/** The standardized interaction lifecycle state for any interactive element. */
export type InteractionState = 'idle' | 'hover' | 'press' | 'focus' | 'disabled';

/**
 * InteractionContextValue — the single global interaction model. Pointer values
 * are MotionValues (updated by one listener, never React state), so reading them
 * never causes re-renders. Targets track what is currently hovered/pressed/
 * focused for future cinematic effects (cursor glow, magnetic, …).
 */
export interface InteractionContextValue {
  pointerX: MotionValue<number>;
  pointerY: MotionValue<number>;
  pointerVelocity: MotionValue<number>;
  lastInteraction: MotionValue<number>;
  hoverTarget: MotionValue<EventTarget | null>;
  pressedTarget: MotionValue<EventTarget | null>;
  focusTarget: MotionValue<EventTarget | null>;
  reducedMotion: boolean;
  setHoverTarget: (target: EventTarget | null) => void;
  setPressedTarget: (target: EventTarget | null) => void;
  setFocusTarget: (target: EventTarget | null) => void;
  markInteraction: () => void;
}

export const InteractionContext = createContext<InteractionContextValue | null>(null);

/** Read the global interaction model. Must be used within an InteractionProvider. */
export function useInteractionContext(): InteractionContextValue {
  const ctx = useContext(InteractionContext);
  if (ctx === null) {
    throw new Error('useInteractionContext must be used within an InteractionProvider');
  }
  return ctx;
}

/** Internal — read the model if present (so the per-element hooks degrade gracefully). */
function useInteractionContextOptional(): InteractionContextValue | null {
  return useContext(InteractionContext);
}

/** usePointer — the shared global pointer MotionValues (x / y / velocity). */
export function usePointer() {
  const { pointerX, pointerY, pointerVelocity } = useInteractionContext();
  return { x: pointerX, y: pointerY, velocity: pointerVelocity };
}

/** useHover — per-element hover state + handlers (reports to the global model). */
export function useHover() {
  const ctx = useInteractionContextOptional();
  const [isHovered, setHovered] = useState(false);
  const hoverProps = useMemo(
    () => ({
      onPointerEnter: (e: ReactPointerEvent) => {
        setHovered(true);
        ctx?.setHoverTarget(e.currentTarget);
        ctx?.markInteraction();
      },
      onPointerLeave: () => {
        setHovered(false);
        ctx?.setHoverTarget(null);
      },
    }),
    [ctx],
  );
  return { isHovered, hoverProps };
}

/** usePress — per-element press state + handlers. */
export function usePress() {
  const ctx = useInteractionContextOptional();
  const [isPressed, setPressed] = useState(false);
  const pressProps = useMemo(
    () => ({
      onPointerDown: (e: ReactPointerEvent) => {
        setPressed(true);
        ctx?.setPressedTarget(e.currentTarget);
        ctx?.markInteraction();
      },
      onPointerUp: () => {
        setPressed(false);
        ctx?.setPressedTarget(null);
      },
      onPointerLeave: () => setPressed(false),
    }),
    [ctx],
  );
  return { isPressed, pressProps };
}

/** useFocusInteraction — per-element focus state + handlers. */
export function useFocusInteraction() {
  const ctx = useInteractionContextOptional();
  const [isFocused, setFocused] = useState(false);
  const focusProps = useMemo(
    () => ({
      onFocus: (e: ReactFocusEvent) => {
        setFocused(true);
        ctx?.setFocusTarget(e.currentTarget);
      },
      onBlur: () => {
        setFocused(false);
        ctx?.setFocusTarget(null);
      },
    }),
    [ctx],
  );
  return { isFocused, focusProps };
}

/**
 * useInteraction — the unified lifecycle hook. Combines hover/press/focus into
 * one standardized state (Idle → Hover → Press → Release → Focus → Disabled) and
 * a single set of bindable handlers. Every future interactive component follows
 * this contract.
 */
export function useInteraction(options?: { disabled?: boolean }) {
  const { isHovered, hoverProps } = useHover();
  const { isPressed, pressProps } = usePress();
  const { isFocused, focusProps } = useFocusInteraction();
  const disabled = options?.disabled ?? false;

  const state: InteractionState = disabled
    ? 'disabled'
    : isPressed
      ? 'press'
      : isHovered
        ? 'hover'
        : isFocused
          ? 'focus'
          : 'idle';

  const bind = useMemo(() => {
    if (disabled) return {};
    return {
      onPointerEnter: hoverProps.onPointerEnter,
      // Leaving the element ends both hover and any in-progress press.
      onPointerLeave: () => {
        hoverProps.onPointerLeave();
        pressProps.onPointerLeave();
      },
      onPointerDown: pressProps.onPointerDown,
      onPointerUp: pressProps.onPointerUp,
      onFocus: focusProps.onFocus,
      onBlur: focusProps.onBlur,
    };
  }, [disabled, hoverProps, pressProps, focusProps]);

  return { state, isHovered, isPressed, isFocused, disabled, bind };
}

/**
 * useInteractionSpring — wraps a MotionValue in one of the shared spring presets,
 * automatically returning the raw value (no spring movement) under reduced
 * motion. The standard way to add interaction physics in 5D.2+.
 */
export function useInteractionSpring(
  source: MotionValue<number>,
  preset: SpringPreset = 'medium',
): MotionValue<number> {
  const { reducedMotion } = useInteractionContext();
  const spring = useSpring(source, interactionMotion.springs[preset]);
  return reducedMotion ? source : spring;
}

/**
 * useControlInteraction — the shared physics for every interactive control
 * (Button, IconButton, interactive Chip, …). Bundles the standard lifecycle
 * (useInteraction) with the spring-driven lift (soft), press compression (firm),
 * and a hover/focus highlight opacity (soft). Under reduced motion the springs
 * collapse to no movement, but the highlight indication is preserved.
 *
 * Returns the interaction state/handlers plus `motionStyle` (apply to the motion
 * element) and `highlightOpacity` (feed to <InteractionHighlight />).
 */
export function useControlInteraction(options?: {
  disabled?: boolean;
  lift?: number;
  press?: number;
}) {
  const interaction = useInteraction({ disabled: options?.disabled });
  const { reducedMotion } = useInteractionContext();
  const { isHovered, isPressed, isFocused } = interaction;

  const lift = options?.lift ?? interactionMotion.hoverLift;
  const press = options?.press ?? interactionMotion.pressDepth;

  const yMV = useMotionValue(0);
  const scaleMV = useMotionValue(1);
  const highlightMV = useMotionValue(0);

  useEffect(() => {
    // Reduced motion → no transform; indication comes from the highlight + CSS.
    yMV.set(reducedMotion ? 0 : isPressed ? 0 : isHovered ? lift : 0);
    scaleMV.set(reducedMotion ? 1 : isPressed ? press : 1);
    highlightMV.set(isHovered || isFocused ? 1 : 0);
  }, [reducedMotion, isHovered, isPressed, isFocused, lift, press, yMV, scaleMV, highlightMV]);

  const y = useInteractionSpring(yMV, 'soft');
  const scale = useInteractionSpring(scaleMV, 'firm');
  const highlightOpacity = useInteractionSpring(highlightMV, 'soft');

  return { ...interaction, motionStyle: { y, scale }, highlightOpacity };
}
