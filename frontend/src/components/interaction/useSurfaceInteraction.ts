import { useEffect } from 'react';
import { useMotionValue } from 'framer-motion';
import { useInteraction, useInteractionSpring, useInteractionContext } from './InteractionContext';
import { interactionMotion } from './interactionMotion';

/**
 * useSurfaceInteraction — the shared physics for interactive surfaces (cards,
 * panels, widgets, result blocks). Built on the Interaction Engine
 * (useInteraction + useInteractionSpring; usePointer is reserved for the 5D.4
 * cursor work) — no duplicated interaction logic.
 *
 * Surfaces lift slightly on hover (2px max, Soft spring) and — when
 * `interactive` (clickable) — compress on press (0.99, Firm spring, immediate
 * return, no bounce). A hover/focus highlight opacity feeds <InteractionHighlight />.
 * Under reduced motion the springs collapse to no movement while the highlight
 * indication is preserved. Truly static surfaces should not call this hook.
 *
 * Returns the interaction state/handlers plus `motionStyle` and `highlightOpacity`.
 */
export function useSurfaceInteraction(options?: { interactive?: boolean; disabled?: boolean }) {
  const interactive = options?.interactive ?? false;
  const interaction = useInteraction({ disabled: options?.disabled });
  const { reducedMotion } = useInteractionContext();
  const { isHovered, isPressed, isFocused } = interaction;

  const yMV = useMotionValue(0);
  const scaleMV = useMotionValue(1);
  const highlightMV = useMotionValue(0);

  useEffect(() => {
    const pressing = interactive && isPressed;
    // Reduced motion → no transform; the highlight + CSS carry the indication.
    yMV.set(reducedMotion ? 0 : isHovered && !pressing ? interactionMotion.surfaceLift : 0);
    scaleMV.set(reducedMotion ? 1 : pressing ? interactionMotion.surfacePress : 1);
    highlightMV.set(isHovered || isFocused ? 1 : 0);
  }, [reducedMotion, interactive, isHovered, isPressed, isFocused, yMV, scaleMV, highlightMV]);

  const y = useInteractionSpring(yMV, 'soft');
  const scale = useInteractionSpring(scaleMV, 'firm');
  const highlightOpacity = useInteractionSpring(highlightMV, 'soft');

  return { ...interaction, motionStyle: { y, scale }, highlightOpacity };
}
