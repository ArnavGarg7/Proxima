import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { lighting, type FXLayerNameValue } from '@/theme/lighting';

interface FXLayerProps {
  children?: ReactNode;
  /** Semantic stacking layer — resolves to a numeric z-index internally. */
  layer: FXLayerNameValue;
  className?: string;
}

/**
 * FXLayer — the GPU-friendly wrapper every cinematic effect renders inside.
 *
 * Responsibilities:
 *   • absolute positioning (fills its positioned parent — the canvas)
 *   • z-index management (resolved from the semantic `layer` via lighting.layers)
 *   • pointer-events-none (purely decorative, never intercepts input)
 *   • overflow safety (effects can bleed; the layer clips them)
 *   • transform isolation (own GPU compositing layer via translateZ(0))
 *   • will-change hint (keeps compositing on the GPU, off the main thread)
 *
 * Numeric z-indices stay encapsulated in the lighting system — callers only
 * ever name a layer (FXLayerName.Mesh, FXLayerName.Ambient, …).
 */
export function FXLayer({ children, layer, className }: FXLayerProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{
        zIndex: lighting.layers[layer],
        // Isolate into a dedicated GPU compositing layer so paint stays cheap
        // and the effect never forces reflow of page content.
        transform: 'translateZ(0)',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  );
}
