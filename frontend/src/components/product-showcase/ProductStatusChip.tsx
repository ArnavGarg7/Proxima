import { m } from 'framer-motion';
import { cn } from '@/lib/cn';
import { loopDuration } from '@/theme/motion';

/** The shared processing states every showcase reports. */
export type ProductStatus = 'waiting' | 'scanning' | 'processing' | 'ready' | 'complete';

interface ProductStatusChipProps {
  /** Drives the icon + tint (one philosophy for every showcase). */
  state: ProductStatus;
  /** Status text (each showcase keeps its own wording). */
  label: string;
}

const ICON: Record<ProductStatus, { name: string; tint: string; spin: boolean }> = {
  waiting:    { name: 'schedule',          tint: 'text-text-muted',   spin: false },
  scanning:   { name: 'progress_activity', tint: 'text-gold-primary', spin: true  },
  processing: { name: 'progress_activity', tint: 'text-gold-primary', spin: true  },
  ready:      { name: 'check_circle',      tint: 'text-conf-high',    spin: false },
  complete:   { name: 'check_circle',      tint: 'text-conf-high',    spin: false },
};

/**
 * ProductStatusChip — the single processing indicator shared by every showcase.
 * A spinner while working, a check when done, a static glyph while waiting —
 * so a status reads identically across the Compare, Intelligence and Routing
 * screens. Consolidates the spinner/check/schedule logic each showcase used to
 * inline.
 */
export function ProductStatusChip({ state, label }: ProductStatusChipProps) {
  const icon = ICON[state];
  const cls = cn('material-symbols-outlined text-[15px]', icon.tint);

  return (
    <span className="flex items-center gap-1.5 font-sans text-[11px] font-medium text-text-secondary">
      {icon.spin ? (
        <m.span className={cls} animate={{ rotate: 360 }} transition={{ duration: loopDuration.spinner, ease: 'linear', repeat: Infinity }}>
          {icon.name}
        </m.span>
      ) : (
        <span className={cls}>{icon.name}</span>
      )}
      {label}
    </span>
  );
}
