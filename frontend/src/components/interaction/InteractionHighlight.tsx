import { m, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useInteractionContext } from './InteractionContext';
import { useCursorInfluenceContext } from './useCursorInfluence';
import { interactionMotion } from './interactionMotion';

const clamp = (v: number, min: number, max: number) => (v < min ? min : v > max ? max : v);

interface InteractionHighlightProps {
  /** Driven by useControlInteraction()/useSurfaceInteraction().highlightOpacity. */
  opacity: MotionValue<number>;
  className?: string;
}

/**
 * InteractionHighlight — the one reusable hover/focus highlight layer.
 *
 * A very subtle top sheen that springs in on hover/focus and fades on leave.
 * When the element sits inside a <CursorInfluence> wrapper, the sheen gently
 * biases toward the cursor (≤ highlightTravel px; opacity unchanged) so the
 * surface feels aware of the pointer — never chasing it. Outside a wrapper (the
 * common case) it's a static top sheen. Decorative, pointer-inert; rounds to its
 * parent. Under reduced motion the cursor bias is frozen.
 */
export function InteractionHighlight({ opacity, className }: InteractionHighlightProps) {
  const { reducedMotion } = useInteractionContext();
  const cursor = useCursorInfluenceContext();

  const zero = useMotionValue(0);
  const lx = cursor?.localX ?? zero;
  const ly = cursor?.localY ?? zero;
  const inf = cursor?.influence ?? zero;
  const radius = interactionMotion.cursorRadius;
  const travel = interactionMotion.highlightTravel;

  const biasX = useTransform([lx, inf], ([x, i]: number[]) => clamp(x / radius, -1, 1) * travel * i);
  const biasY = useTransform([ly, inf], ([y, i]: number[]) => clamp(y / radius, -1, 1) * travel * i);

  const biased = !!cursor && !reducedMotion;

  return (
    <m.span
      aria-hidden="true"
      style={biased ? { opacity, x: biasX, y: biasY } : { opacity }}
      className={cn(
        'pointer-events-none absolute inset-0 rounded-[inherit]',
        'bg-[linear-gradient(to_bottom,rgba(255,255,255,0.08),transparent_55%)]',
        className,
      )}
    />
  );
}
