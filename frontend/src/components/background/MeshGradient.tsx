import { m } from 'framer-motion';
import { lighting } from '@/theme/lighting';
import { useFX } from './FXContext';

/**
 * MeshGradient — the slow, living mesh behind the page (Stage 5A.2).
 *
 * Several oversized radial-gradient blobs (charcoal · void · warm gold · bronze
 * — all existing Proxima colors) drift, scale, and rotate on long, mismatched
 * 24–30s loops. Each blob only ever animates `transform` + `opacity`; its blur
 * is a static filter (set once, never animated) that the browser caches onto
 * the GPU compositing layer, so per-frame cost is a cheap transform.
 *
 * The CSS gradient itself is never animated — movement comes purely from
 * transforms on the blob container. Mirrored repeat means there is no visible
 * loop seam. Under prefers-reduced-motion every blob freezes at its resting
 * position. Renders inside an FXLayer; reads intensity / reduced-motion from FX.
 */
export function MeshGradient() {
  const { intensity, reducedMotion } = useFX();

  return (
    <>
      {lighting.mesh.blobs.map((blob, i) => {
        const alpha = Math.min(blob.opacity * intensity, 1);

        return (
          <m.div
            key={i}
            aria-hidden="true"
            className="absolute rounded-full"
            style={{
              top: blob.top,
              bottom: blob.bottom,
              left: blob.left,
              right: blob.right,
              width: blob.size,
              height: blob.size,
              background: `radial-gradient(ellipse 72% 58% at 42% 44%, rgba(${blob.color}, ${alpha}) 0%, transparent 68%)`,
              filter: `blur(${lighting.mesh.blur}px)`,
              willChange: 'transform',
            }}
            animate={
              reducedMotion
                ? undefined
                : {
                    x: [0, blob.motion.x],
                    y: [0, blob.motion.y],
                    scale: [1, blob.motion.scale],
                    rotate: [0, blob.motion.rotate],
                  }
            }
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: blob.motion.duration,
                    delay: blob.motion.delay,
                    repeat: Infinity,
                    repeatType: 'mirror',
                    ease: 'easeInOut',
                  }
            }
          />
        );
      })}
    </>
  );
}
