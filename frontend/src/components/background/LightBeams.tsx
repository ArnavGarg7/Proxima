import { m } from 'framer-motion';
import { lighting } from '@/theme/lighting';
import { useFX } from './FXContext';

/**
 * LightBeams — subtle directional lighting (Stage 5A.3).
 *
 * 2–3 oversized, softly-blurred gold shafts at different angles, widths, and
 * opacities (2–4%). Each drifts and rotates very slowly on a long 34–40s loop
 * and gently pulses opacity. Restrained, premium — think Vision Pro / Linear /
 * Arc, never gaming RGB.
 *
 * Only transform (translate + rotate) and opacity animate. Blur and width are
 * static (a static filter is cached onto the GPU layer). Matching first/last
 * keyframes make the loop seamless. Under reduced motion each beam renders
 * static at its resting angle. Renders inside an FXLayer; all values come from
 * lighting.beams.
 */
export function LightBeams() {
  const { intensity, reducedMotion } = useFX();
  const { blur, color, fade, list } = lighting.beams;

  return (
    <>
      {list.map((beam, i) => {
        const alpha = beam.opacity * intensity;

        return (
          <m.div
            key={i}
            aria-hidden="true"
            className="absolute"
            style={{
              top: beam.top,
              left: beam.left,
              right: beam.right,
              width: beam.width,
              height: beam.height,
              background: `linear-gradient(to bottom, transparent 0%, rgba(${color}, ${alpha}) 50%, transparent 100%)`,
              filter: `blur(${blur}px)`,
              transformOrigin: 'center',
              // Static angle when frozen; framer-motion owns transform when animating.
              transform: reducedMotion ? `rotate(${beam.rotate}deg)` : undefined,
              willChange: 'transform',
            }}
            animate={
              reducedMotion
                ? undefined
                : {
                    x: [0, beam.drift.x, 0],
                    y: [0, beam.drift.y, 0],
                    rotate: [beam.rotate, beam.rotate + beam.rotateBy, beam.rotate],
                    opacity: [...fade],
                  }
            }
            transition={
              reducedMotion
                ? undefined
                : {
                    duration: beam.duration,
                    delay: beam.delay,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    times: [0, 0.5, 1],
                  }
            }
          />
        );
      })}
    </>
  );
}
