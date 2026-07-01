import { createContext, useContext } from 'react';
import type { MotionValue } from 'framer-motion';
import type { ShowcaseType } from './productData';
import type { ShowcasePhase } from './productTimeline';

/**
 * ProductShowcaseValue — the shared engine state every showcase consumes. Like
 * the Hero engine, discrete state is React state (rare changes) and continuous
 * progress is a MotionValue (no per-frame re-renders).
 */
export interface ProductShowcaseValue {
  /** The showcase currently playing, or null when idle. */
  activeDemo: ShowcaseType | null;
  /** Overall 0–1 progress of the active showcase. */
  progress: MotionValue<number>;
  /** True while a showcase is advancing. */
  isPlaying: boolean;
  /** True while held. */
  isPaused: boolean;
  /** Whether motion is reduced (showcases freeze on their final state). */
  reducedMotion: boolean;
  /** Set/clear the active showcase (used by ProductShowcase wrappers, 5E.2+). */
  setActiveDemo: (demo: ShowcaseType | null) => void;
  restart: () => void;
  pause: () => void;
  resume: () => void;
}

/**
 * ProductShowcaseContext — provided by ProductShowcaseProvider, consumed via
 * useProductShowcase(). Component-free module (context + hooks) for fast refresh.
 */
export const ProductShowcaseContext = createContext<ProductShowcaseValue | null>(null);

/** Read the shared showcase engine. Must be used within a ProductShowcaseProvider. */
export function useProductShowcase(): ProductShowcaseValue {
  const ctx = useContext(ProductShowcaseContext);
  if (ctx === null) {
    throw new Error('useProductShowcase must be used within a ProductShowcaseProvider');
  }
  return ctx;
}

/**
 * ShowcaseInstanceValue — per-showcase state exposed by a <ProductShowcase>
 * wrapper to its children (the future visualizations). Local progress/phase are
 * derived from the shared engine; in 5E.1 they stay idle.
 */
export interface ShowcaseInstanceValue {
  type: ShowcaseType;
  /** This showcase's local 0–1 progress. */
  progress: MotionValue<number>;
  /** This showcase's current lifecycle phase. */
  phase: ShowcasePhase;
  reducedMotion: boolean;
}

export const ShowcaseInstanceContext = createContext<ShowcaseInstanceValue | null>(null);

/** Read the enclosing showcase's local state. Must be used within a ProductShowcase. */
export function useShowcase(): ShowcaseInstanceValue {
  const ctx = useContext(ShowcaseInstanceContext);
  if (ctx === null) {
    throw new Error('useShowcase must be used within a ProductShowcase');
  }
  return ctx;
}
