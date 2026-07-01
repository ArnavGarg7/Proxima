import type { ReactNode } from 'react';
import { ProductStatusChip, type ProductStatus } from './ProductStatusChip';

interface ProductHeaderProps {
  /** Processing state → status chip icon. */
  state: ProductStatus;
  /** Status text shown in the chip. */
  status: string;
  /** Right-aligned screen label (mono), e.g. "proxima · routing". */
  label?: string;
  /** Right-aligned slot — overrides `label` (e.g. a metric ring). */
  trailing?: ReactNode;
}

/**
 * ProductHeader — the title bar shared by every showcase: a status chip on the
 * left, a screen label (or a small metric) on the right, over a hairline border.
 * Gives the Compare, Intelligence and Routing screens one identical chrome, so
 * they read as windows into the same application.
 */
export function ProductHeader({ state, status, label, trailing }: ProductHeaderProps) {
  return (
    <div className="flex items-center gap-1.5 border-b border-border pb-2">
      <ProductStatusChip state={state} label={status} />
      <span className="ml-auto flex items-center">
        {trailing ?? (
          <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">{label}</span>
        )}
      </span>
    </div>
  );
}
