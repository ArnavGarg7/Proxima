import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';

/**
 * LandingBackground — fixed ambient backdrop for the marketing page.
 *
 * Layers (back to front):
 *   1. Solid void base
 *   2. Soft grid, masked to fade out toward the edges
 *   3. Top-centered gold radial glow (the "light source")
 *   4. Two low-opacity mesh blobs for depth — these drift slowly on scroll
 *      (parallax), in opposite directions
 *   5. A faint vignette that darkens the corners
 *
 * Decorative only — hidden from assistive tech. Parallax is disabled under
 * prefers-reduced-motion.
 */
export function LandingBackground() {
  const reduced = useReducedMotion() ?? false;
  const { scrollY } = useScroll();

  /* Opposed parallax drift — subtle, capped at ±60px over the first ~1200px */
  const warmY = useTransform(scrollY, [0, 1200], [0, reduced ? 0 : 60]);
  const coolY = useTransform(scrollY, [0, 1200], [0, reduced ? 0 : -60]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* Base */}
      <div className="absolute inset-0 bg-void" />

      {/* Soft grid — faded toward edges via radial mask */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(to right, var(--color-border-strong) 1px, transparent 1px),' +
            'linear-gradient(to bottom, var(--color-border-strong) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse 80% 50% at 50% 0%, #000 0%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 50% at 50% 0%, #000 0%, transparent 75%)',
        }}
      />

      {/* Top gold radial glow — primary light source */}
      <div className="absolute -top-48 left-1/2 -translate-x-1/2 w-[1000px] h-[640px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.10)_0%,transparent_70%)] blur-2xl" />

      {/* Mesh blob — warm, left (parallax down) */}
      <motion.div
        style={{ y: warmY }}
        className="absolute top-[22%] -left-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(138,111,50,0.10)_0%,transparent_70%)] blur-3xl"
      />

      {/* Mesh blob — cool, right (parallax up) */}
      <motion.div
        style={{ y: coolY }}
        className="absolute top-[34%] -right-40 w-[520px] h-[520px] rounded-full bg-[radial-gradient(circle,rgba(96,165,250,0.06)_0%,transparent_70%)] blur-3xl"
      />

      {/* Vignette — darkens corners for depth */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 100% 80% at 50% 40%, transparent 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </div>
  );
}
