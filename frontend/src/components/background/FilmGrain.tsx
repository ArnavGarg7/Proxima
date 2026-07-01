import { lighting } from '@/theme/lighting';

/**
 * FilmGrain — a whisper of static texture that removes digital perfection (5A.4).
 *
 * A static, desaturated fractal-noise texture at ~2% opacity, generated
 * procedurally as an inline SVG data URI (no PNG assets). It never animates —
 * no television static — and only becomes noticeable if you deliberately look
 * for it, so it is unaffected by reduced motion. Renders inside an FXLayer.
 */
export function FilmGrain() {
  const { texture, size, opacity } = lighting.grain;

  return (
    <div
      aria-hidden="true"
      className="absolute inset-0"
      style={{
        backgroundImage: texture,
        backgroundSize: size,
        backgroundRepeat: 'repeat',
        opacity,
      }}
    />
  );
}
