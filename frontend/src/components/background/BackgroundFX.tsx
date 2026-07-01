import { useMemo, type ReactNode } from 'react';
import { m, useMotionValue, useTransform } from 'framer-motion';
import { cn } from '@/lib/cn';
import { lighting, FXLayerName, type IntensityLevel } from '@/theme/lighting';
import { useReducedMotionSafe } from '@/hooks/useReducedMotionSafe';
import { useStoryCameraOptional } from '@/components/story/StoryContext';
import { storyMotion } from '@/components/story/storyMotion';
import { FXContext, type FXContextValue } from './FXContext';
import { FXClockContext, useProvideFXClock } from './FXClock';
import { FXLayer } from './FXLayer';
import { AmbientGlow } from './AmbientGlow';
import { MeshGradient } from './MeshGradient';
import { LightBeams } from './LightBeams';
import { ParticleField } from './ParticleField';
import { CursorSpotlight } from './CursorSpotlight';
import { FilmGrain } from './FilmGrain';

interface BackgroundFXProps {
  children: ReactNode;
  className?: string;
  /** Optional id for the root (e.g. "top" as an in-page scroll anchor). */
  id?: string;
  /** Global lighting intensity. Default "medium". */
  intensity?: IntensityLevel;

  /* ── Effect layers — all live as of Stage 5A.4 (engine feature-complete) ── */
  ambient?: boolean;
  mesh?: boolean;
  beams?: boolean;
  particles?: boolean;
  spotlight?: boolean;   // desktop fine-pointer only; off on touch / reduced motion
  grain?: boolean;
}

/**
 * BackgroundFX — master compositor + rendering provider for Proxima's cinematic
 * engine.
 *
 * Provides FXContext (intensity · reducedMotion · enabledEffects · layerConfig),
 * renders one fixed "canvas" behind the page, stacks the effect layers in a
 * fixed order, then renders page content above it — so a page wraps its whole
 * tree once and never paints its own background again. It is the only entry
 * point: effects are never imported by page sections directly.
 *
 * Composition (back → front):
 *   1. Background base   — charcoal fill + soft gold illumination + texture grid
 *   2. Ambient glow      — slow-breathing radial glows        (prop: `ambient`)
 *   3. Mesh gradient     — drifting oversized blobs           (prop: `mesh`)
 *   4. Light beams       — slow directional shafts            (prop: `beams`)
 *   5. Particle field    — sparse drifting gold motes         (prop: `particles`)
 *   6. Cursor spotlight  — soft pointer-following glow        (prop: `spotlight`)
 *   7. Film grain        — static ~2% noise texture           (prop: `grain`)
 *   8. Vignette          — frames the canvas
 *   ── Page content ──
 *
 * It also provides FXClock — a shared rAF timing service (time / progress) for
 * future cinematic experiences to sync against.
 *
 * This stage finalizes the engine: it is feature-complete. Lighting is driven
 * entirely by theme/lighting.ts; `intensity` scales every glow/mesh/beam/
 * particle/spotlight opacity via a single multiplier. The canvas is decorative
 * — hidden from assistive tech and ignores pointer events.
 */
export function BackgroundFX({
  children,
  className,
  id,
  intensity = 'medium',
  ambient = true,
  mesh = true,
  beams = true,
  particles = true,
  spotlight = true,
  grain = true,
}: BackgroundFXProps) {
  const reducedMotion = useReducedMotionSafe();
  const clock = useProvideFXClock(reducedMotion);

  // Story Camera synchronization (Stage 5C.3) — optional. When a Story Camera is
  // present (the landing page) the canvas opacity subtly varies with narrative
  // depth, so the background recedes as the story deepens. No camera / reduced
  // motion → identity (the Living Canvas Engine's default is untouched).
  const camera = useStoryCameraOptional();
  const fallbackDepth = useMotionValue(0);
  const depthMV = camera?.depth ?? fallbackDepth;
  const canvasSync = !!camera && !reducedMotion;
  const canvasOpacity = useTransform(
    depthMV,
    [0, 1],
    (canvasSync ? [...storyMotion.cameraBackground.opacity] : [1, 1]) as number[],
  );

  const fx = useMemo<FXContextValue>(
    () => ({
      intensity: lighting.intensity[intensity],
      intensityLevel: intensity,
      reducedMotion,
      enabledEffects: { ambient, mesh, beams, particles, spotlight, grain },
      layerConfig: lighting.layers,
    }),
    [intensity, reducedMotion, ambient, mesh, beams, particles, spotlight, grain],
  );

  return (
    <FXContext.Provider value={fx}>
      <FXClockContext.Provider value={clock}>
      <div id={id} className={cn('relative w-full', className)}>
        {/* ── Cinematic canvas — fixed, behind all content ───────────────── */}
        <m.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 overflow-hidden"
          style={{ zIndex: lighting.layers.canvas, opacity: canvasOpacity }}
        >
          {/* 1 · Background base — charcoal fill + gold illumination + grid
                (plain divs; they sit below every positive-z effect layer) */}
          <div className="absolute inset-0" style={{ background: lighting.base.fill }} />
          <div className="absolute inset-0" style={{ background: lighting.base.illumination }} />
          <div className="absolute inset-0" style={{ ...lighting.base.grid }} />

          {/* 2 · Ambient glow — slow breathing */}
          {ambient && (
            <FXLayer layer={FXLayerName.Ambient}>
              {/* Primary top-center light source */}
              <AmbientGlow
                position={lighting.glowPosition.topCenter}
                radius={lighting.glowRadius.hero}
                color={lighting.glowColor.gold}
                opacity={lighting.glowOpacity.ambient}
                blur={lighting.glowBlur.md}
                anim={lighting.ambientMotion.hero}
              />
              {/* Tighter, brighter hot-spot */}
              <AmbientGlow
                position={lighting.glowPosition.hotspot}
                radius={lighting.glowRadius.hotspot}
                color={lighting.glowColor.gold}
                opacity={lighting.glowOpacity.hotspot}
                blur={lighting.glowBlur.sm}
                anim={lighting.ambientMotion.hotspot}
              />
              {/* Warm depth glow — left */}
              <AmbientGlow
                position={lighting.glowPosition.left}
                radius={lighting.glowRadius.warm}
                color={lighting.glowColor.warm}
                opacity={lighting.glowOpacity.warm}
                blur={lighting.glowBlur.xl}
                anim={lighting.ambientMotion.warm}
              />
              {/* Cool depth glow — right */}
              <AmbientGlow
                position={lighting.glowPosition.right}
                radius={lighting.glowRadius.cool}
                color={lighting.glowColor.cool}
                opacity={lighting.glowOpacity.cool}
                blur={lighting.glowBlur.xl}
                anim={lighting.ambientMotion.cool}
              />
            </FXLayer>
          )}

          {/* 3 · Mesh gradient — drifting oversized blobs */}
          {mesh && (
            <FXLayer layer={FXLayerName.Mesh}>
              <MeshGradient />
            </FXLayer>
          )}

          {/* 4 · Light beams — slow directional shafts */}
          {beams && (
            <FXLayer layer={FXLayerName.Beams}>
              <LightBeams />
            </FXLayer>
          )}

          {/* 5 · Particle field — sparse drifting gold motes */}
          {particles && (
            <FXLayer layer={FXLayerName.Particles}>
              <ParticleField />
            </FXLayer>
          )}

          {/* 6 · Cursor spotlight — soft pointer-following glow (desktop only) */}
          {spotlight && (
            <FXLayer layer={FXLayerName.Cursor}>
              <CursorSpotlight />
            </FXLayer>
          )}

          {/* 7 · Film grain — static ~2% noise texture */}
          {grain && (
            <FXLayer layer={FXLayerName.Grain}>
              <FilmGrain />
            </FXLayer>
          )}

          {/* 8 · Vignette — frames the canvas, above the effect layers */}
          <FXLayer layer={FXLayerName.Vignette}>
            <div className="absolute inset-0" style={{ background: lighting.vignette }} />
          </FXLayer>
        </m.div>

        {/* ── Page content ───────────────────────────────────────────────── */}
        <div className="relative">{children}</div>
      </div>
      </FXClockContext.Provider>
    </FXContext.Provider>
  );
}
