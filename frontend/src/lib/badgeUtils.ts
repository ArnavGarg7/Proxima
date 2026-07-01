import type { BadgeVariant } from '@/components/ui/Badge';

/**
 * Maps a numeric confidence score (0–1) to the correct Badge variant.
 * Thresholds mirror the backend confidence tier definitions.
 */
export function confidenceVariant(score: number): BadgeVariant {
  if (score >= 0.85) return 'conf-high';
  if (score >= 0.65) return 'conf-amber';
  if (score >= 0.45) return 'conf-low';
  return 'conf-critical';
}

/**
 * Maps an analyzer key string to the correct domain Badge variant.
 */
export function domainVariant(analyzer: string): BadgeVariant {
  if (analyzer === 'code')                               return 'domain-code';
  if (analyzer === 'clinical' || analyzer === 'medical') return 'domain-medical';
  if (analyzer === 'legal')                              return 'domain-legal';
  return 'default';
}
