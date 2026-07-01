import { createContext, useContext } from 'react';
import type { IntensityLevel, LightingLayers } from '@/theme/lighting';

/** Which effect layers are currently active. */
export interface FXEnabledEffects {
  ambient: boolean;
  mesh: boolean;
  beams: boolean;
  particles: boolean;
  spotlight: boolean;
  grain: boolean;
}

/**
 * FXContextValue — the shared rendering configuration every cinematic effect
 * reads from, instead of receiving the same props over and over.
 */
export interface FXContextValue {
  /** Numeric lighting multiplier — lighting.intensity[level]. */
  intensity: number;
  /** The selected intensity level. */
  intensityLevel: IntensityLevel;
  /** True when the user prefers reduced motion — effects render frozen. */
  reducedMotion: boolean;
  /** Which effect layers are enabled. */
  enabledEffects: FXEnabledEffects;
  /** Named z-index layer configuration (numeric values encapsulated). */
  layerConfig: LightingLayers;
}

/**
 * FXContext — provided by BackgroundFX, consumed via useFX(). The single
 * communication layer for the cinematic rendering engine.
 *
 * Exported as a context object (not a provider component) so this module stays
 * a clean non-component file — BackgroundFX renders <FXContext.Provider> itself.
 */
export const FXContext = createContext<FXContextValue | null>(null);

/** Read the cinematic rendering configuration. Must be used within BackgroundFX. */
export function useFX(): FXContextValue {
  const ctx = useContext(FXContext);
  if (ctx === null) {
    throw new Error('useFX must be used within a BackgroundFX provider');
  }
  return ctx;
}
