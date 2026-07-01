import { m } from 'framer-motion';
import { cn } from '@/lib/cn';
import {
  lighting,
  type GlowAnchor,
  type GlowRadius,
  type AmbientAnim,
} from '@/theme/lighting';
import { useFX } from './FXContext';

interface AmbientGlowProps {
  /** Anchor within the canvas (top/bottom/left/right + optional centering). */
  position: GlowAnchor;
  /** Size in px — a number renders a circle, {w,h} renders an ellipse. */
  radius: GlowRadius;
  /** Core color as an "r, g, b" triplet (see lighting.glowColor). */
  color: string;
  /** Core alpha (0–1) before the intensity multiplier. */
  opacity: number;
  /** Blur radius in px (see lighting.glowBlur). */
  blur: number;
  /** Per-glow breathing config. Omit (or reduced-motion) → fully static. */
  anim?: AmbientAnim;
  className?: string;
}

/**
 * AmbientGlow — a single radial glow with optional slow "breathing".
 *
 * Stage 5A.2: when `anim` is supplied (and motion is allowed) the glow drifts,
 * scales, and dims within a tiny, imperceptible range — never synchronized
 * between glows because each gets its own duration / delay / drift. Under
 * prefers-reduced-motion (or with no `anim`) it renders fully static at its
 * resting visual state. Only transform + opacity animate.
 *
 * Fully reusable — every value comes from theme/lighting.ts. Renders inside an
 * FXLayer. Horizontal centering uses margin (not transform) so framer-motion
 * is free to own the element's transform.
 */
export function AmbientGlow({
  position,
  radius,
  color,
  opacity,
  blur,
  anim,
  className,
}: AmbientGlowProps) {
  const { intensity, reducedMotion } = useFX();
  const animated = !reducedMotion && !!anim;

  const alpha  = Math.min(opacity * intensity, lighting.maxGlowIntensity);
  const width  = typeof radius === 'number' ? radius : radius.w;
  const height = typeof radius === 'number' ? radius : radius.h;

  const horizontal = position.centerX
    ? { left: '50%', marginLeft: -width / 2 }
    : { left: position.left, right: position.right };

  return (
    <m.div
      aria-hidden="true"
      className={cn('absolute rounded-full', className)}
      style={{
        top: position.top,
        bottom: position.bottom,
        ...horizontal,
        width,
        height,
        background: `radial-gradient(ellipse at center, rgba(${color}, ${alpha}) 0%, transparent 70%)`,
        filter: `blur(${blur}px)`,
        willChange: 'transform',
      }}
      animate={
        animated
          ? {
              opacity: [...lighting.breath.opacity],
              scale:   [...lighting.breath.scale],
              x: [0, anim!.drift.x, 0],
              y: [0, anim!.drift.y, 0],
            }
          : undefined
      }
      transition={
        animated
          ? {
              duration: anim!.duration,
              delay: anim!.delay,
              repeat: Infinity,
              ease: 'easeInOut',
              times: [0, 0.5, 1],
            }
          : undefined
      }
    />
  );
}
