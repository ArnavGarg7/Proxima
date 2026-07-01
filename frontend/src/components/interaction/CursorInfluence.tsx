import { useRef, type ReactNode } from 'react';
import { m, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useInteractionContext } from './InteractionContext';
import { useCursorInfluence, CursorInfluenceContext } from './useCursorInfluence';
import { interactionMotion } from './interactionMotion';

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

interface CursorInfluenceProps {
  children: ReactNode;
  /** Layout class for the (transparent) wrapper — defaults to inline-flex. */
  className?: string;
}

/**
 * CursorInfluence — a transparent behavioural wrapper (not a visual component)
 * that makes an important element subtly acknowledge the cursor. It measures its
 * own bounds, derives influence from the shared pointer, and:
 *   • magnetically translates toward the cursor (≤ magneticPull px, Soft spring,
 *     never aggressive), and
 *   • publishes the influence so the child's InteractionHighlight biases toward
 *     the cursor.
 * No tilt (rotateX/rotateY). Under reduced motion the magnetic translation is
 * removed (and the highlight bias is frozen by InteractionHighlight). Enable only
 * for eligible elements — never globally.
 */
export function CursorInfluence({ children, className }: CursorInfluenceProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { reducedMotion } = useInteractionContext();
  const influence = useCursorInfluence(ref);

  const pull = interactionMotion.magneticPull;
  const radius = interactionMotion.cursorRadius;

  const targetX = useTransform(
    [influence.localX, influence.influence],
    ([lx, inf]: number[]) => clamp(lx / radius, -1, 1) * pull * inf,
  );
  const targetY = useTransform(
    [influence.localY, influence.influence],
    ([ly, inf]: number[]) => clamp(ly / radius, -1, 1) * pull * inf,
  );
  const x = useSpring(targetX, interactionMotion.springs.soft);
  const y = useSpring(targetY, interactionMotion.springs.soft);

  return (
    <CursorInfluenceContext.Provider value={influence}>
      <m.div
        ref={ref}
        className={cn('inline-flex', className)}
        style={reducedMotion ? undefined : { x, y }}
      >
        {children}
      </m.div>
    </CursorInfluenceContext.Provider>
  );
}
