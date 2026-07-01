/**
 * Confidence helpers — shared across the Analysis Workspace.
 *
 * Operates on a 0–100 confidence scale (as returned by the analyzers).
 * Thresholds mirror the backend tiers used by `confidenceVariant` (0–1) in
 * badgeUtils, scaled ×100.
 */

export type ConfidenceTone = 'high' | 'amber' | 'low' | 'critical';

/** Tier key for a 0–100 confidence score */
export function confidenceTone(value: number): ConfidenceTone {
  if (value >= 85) return 'high';
  if (value >= 65) return 'amber';
  if (value >= 45) return 'low';
  return 'critical';
}

/** Human-readable label for a 0–100 confidence score */
export function confidenceLabel(value: number): string {
  switch (confidenceTone(value)) {
    case 'high':     return 'High Confidence';
    case 'amber':    return 'Moderate Confidence';
    case 'low':      return 'Low Confidence';
    default:         return 'Critical — Review Needed';
  }
}

/** CSS custom-property stroke/text color for a 0–100 confidence score */
export function confidenceColorVar(value: number): string {
  switch (confidenceTone(value)) {
    case 'high':     return 'var(--color-conf-high)';
    case 'amber':    return 'var(--color-conf-amber)';
    case 'low':      return 'var(--color-conf-low)';
    default:         return 'var(--color-conf-critical)';
  }
}

/** Tailwind text-color token class for a 0–100 confidence score */
export function confidenceTextClass(value: number): string {
  switch (confidenceTone(value)) {
    case 'high':     return 'text-conf-high';
    case 'amber':    return 'text-conf-amber';
    case 'low':      return 'text-conf-low';
    default:         return 'text-conf-critical';
  }
}
