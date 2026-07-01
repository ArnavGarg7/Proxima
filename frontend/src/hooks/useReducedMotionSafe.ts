import { useSyncExternalStore } from 'react';

/**
 * useReducedMotionSafe — SSR-safe reader for the user's reduced-motion setting.
 *
 * Wraps the `prefers-reduced-motion: reduce` media query and returns a stable
 * boolean that stays in sync with OS-level changes. Built on
 * `useSyncExternalStore` so it never reads `window` during render (SSR-safe,
 * defaults to `false` on the server) and never tears between subscribers.
 *
 * Shared across the project — every cinematic effect (5A.2+) gates its motion
 * on this hook.
 */

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const mql = window.matchMedia(QUERY);
  mql.addEventListener('change', onChange);
  return () => mql.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(QUERY).matches;
}

/** Server snapshot — assume motion is allowed (no media query available). */
function getServerSnapshot(): boolean {
  return false;
}

export function useReducedMotionSafe(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
