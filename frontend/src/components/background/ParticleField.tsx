import { useMemo } from 'react';
import { m } from 'framer-motion';
import { lighting } from '@/theme/lighting';
import { breakpoints } from '@/theme/breakpoints';
import { useFX } from './FXContext';

const rand = (min: number, max: number) => min + Math.random() * (max - min);

/** Particle count per breakpoint — desktop 20–40, tablet 10–20, mobile 5–10. */
function particleCount(): number {
  if (typeof window === 'undefined') return 0;
  const w = window.innerWidth;
  if (w >= breakpoints.lg) return 28;  // desktop
  if (w >= breakpoints.sm) return 14;  // tablet
  return 7;                            // mobile
}

interface Particle {
  id: number;
  left: number;     // %
  bottom: number;   // %
  size: number;     // px
  opacity: number;  // base peak alpha (before intensity)
  driftUp: number;  // px
  driftX: number;   // px (signed)
  duration: number; // s
  delay: number;    // s
}

/**
 * ParticleField — sparse, soft gold circles for atmosphere (Stage 5A.3).
 *
 * Particles drift slowly upward with a slight sideways wander and fade in/out,
 * varying in size, opacity, duration, and delay. The random data is generated
 * exactly once (useMemo, empty deps) — never recreated on re-render — and only
 * transform + opacity animate (no filters, no layout-triggering properties).
 *
 * Soft circles only (radial gradient) — no sparkles, stars, or glowing dots —
 * at extremely low opacity, so movement is almost imperceptible. Under reduced
 * motion particles render static. Renders inside an FXLayer.
 */
export function ParticleField() {
  const { intensity, reducedMotion } = useFX();

  // Generate particle data once; random values are fixed for the component's life.
  const particles = useMemo<Particle[]>(() => {
    const t = lighting.particles;
    const count = particleCount();
    return Array.from({ length: count }, (_, id) => ({
      id,
      left: rand(0, 100),
      bottom: rand(-5, 25),
      size: rand(t.size[0], t.size[1]),
      opacity: rand(t.opacity[0], t.opacity[1]),
      driftUp: rand(t.driftUp[0], t.driftUp[1]),
      driftX: rand(t.driftX[0], t.driftX[1]) * (Math.random() < 0.5 ? -1 : 1),
      duration: rand(t.duration[0], t.duration[1]),
      delay: rand(0, t.maxDelay),
    }));
  }, []);

  const color = lighting.particles.color;

  return (
    <>
      {particles.map((p) => {
        const peak = Math.min(p.opacity * intensity, 1);

        return (
          <m.div
            key={p.id}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              bottom: `${p.bottom}%`,
              width: p.size,
              height: p.size,
              background: `radial-gradient(circle, rgba(${color}, 1) 0%, transparent 70%)`,
              // Frozen: faint static dot. Animated: framer-motion owns opacity.
              opacity: reducedMotion ? peak : undefined,
              willChange: 'transform, opacity',
            }}
            animate={
              reducedMotion
                ? undefined
                : {
                    y: [0, -p.driftUp * 0.33, -p.driftUp * 0.66, -p.driftUp],
                    x: [0, p.driftX * 0.4, p.driftX * 0.7, p.driftX],
                    opacity: [0, peak, peak, 0],
                  }
            }
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: p.duration,
                    delay: p.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    times: [0, 0.25, 0.75, 1],
                  }
            }
          />
        );
      })}
    </>
  );
}
