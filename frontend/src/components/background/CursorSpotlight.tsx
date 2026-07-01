import { useEffect, useMemo, useRef } from 'react';
import { m, useMotionValue, useSpring } from 'framer-motion';
import { lighting } from '@/theme/lighting';
import { useFX } from './FXContext';

/**
 * CursorSpotlight — a luxurious lighting response, not a cursor effect (5A.4).
 *
 * A soft warm-gold radial that interpolates toward the pointer with spring
 * smoothing, so it follows with a gentle delay and never snaps — the page feels
 * like it is reacting to you, not chasing you. Heavy blur + sub-8% opacity means
 * there is no visible circle and no hard edge.
 *
 * Performance: pointer moves write straight to MotionValues (rAF-throttled),
 * never React state — so mousemove never triggers a React render. Only transform
 * + opacity animate, on a GPU-composited layer.
 *
 * Desktop fine-pointer only — disabled on touch devices and under reduced
 * motion (renders nothing). Reads tokens from lighting.cursor; renders inside an
 * FXLayer whose box is viewport-aligned (the canvas is fixed), so client
 * coordinates map directly.
 */
export function CursorSpotlight() {
  const { intensity, reducedMotion } = useFX();
  const c = lighting.cursor;

  // Only enable for a genuine fine pointer (mouse / trackpad) — never touch.
  const finePointer = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches,
    [],
  );
  const enabled = finePointer && !reducedMotion;

  const activeAlpha = Math.min(c.opacity * intensity * c.intensity, 1);
  const idleAlpha   = Math.min(c.idleOpacity * intensity * c.intensity, 1);

  const initX = typeof window !== 'undefined' ? window.innerWidth / 2 : 0;
  const initY = typeof window !== 'undefined' ? window.innerHeight / 2 : 0;

  const x = useMotionValue(initX);
  const y = useMotionValue(initY);
  const o = useMotionValue(idleAlpha);

  // Spring smoothing → the delayed, never-snapping follow.
  const sx = useSpring(x, c.smoothing);
  const sy = useSpring(y, c.smoothing);
  const so = useSpring(o, c.smoothing);

  const frame = useRef(0);
  const pos = useRef({ x: initX, y: initY });

  useEffect(() => {
    if (!enabled) return;

    // Throttle to one MotionValue write per frame.
    const flush = () => {
      x.set(pos.current.x);
      y.set(pos.current.y);
      frame.current = 0;
    };
    const onMove = (e: MouseEvent) => {
      pos.current.x = e.clientX;
      pos.current.y = e.clientY;
      o.set(activeAlpha);
      if (frame.current === 0) frame.current = requestAnimationFrame(flush);
    };
    const onLeave = () => o.set(idleAlpha);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
      if (frame.current) cancelAnimationFrame(frame.current);
      frame.current = 0;
    };
  }, [enabled, x, y, o, activeAlpha, idleAlpha]);

  if (!enabled) return null;

  return (
    <m.div
      aria-hidden="true"
      className="absolute left-0 top-0 rounded-full"
      style={{
        x: sx,
        y: sy,
        width: c.radius,
        height: c.radius,
        marginLeft: -c.radius / 2,
        marginTop: -c.radius / 2,
        opacity: so,
        background: `radial-gradient(circle, rgba(${c.color}, 1) 0%, transparent 70%)`,
        filter: `blur(${c.blur}px)`,
        willChange: 'transform, opacity',
      }}
    />
  );
}
