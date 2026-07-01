import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useControlInteraction } from '@/components/interaction/InteractionContext';
import { InteractionHighlight } from '@/components/interaction/InteractionHighlight';

export type ChipVariant = 'default' | 'gold' | 'success' | 'warning' | 'error' | 'code' | 'medical' | 'legal';

interface ChipProps {
  variant?: ChipVariant;
  /** Renders a dismiss (×) button */
  onDismiss?: () => void;
  /** Renders the chip as a clickable element */
  onClick?: () => void;
  /** Shows a selected/active state */
  selected?: boolean;
  children: React.ReactNode;
  className?: string;
}

const baseStyles =
  'inline-flex items-center gap-1.5 text-xs font-sans font-medium rounded-full px-2.5 py-1 ' +
  'transition-colors duration-150 select-none';

const variantStyles: Record<ChipVariant, string> = {
  default: 'bg-elevated text-text-secondary border border-border hover:border-border-strong',
  gold:    'bg-gold-primary/10 text-gold-primary border border-gold-primary/30 hover:border-gold-primary',
  success: 'bg-conf-high/10 text-conf-high border border-conf-high/25',
  warning: 'bg-conf-amber/10 text-conf-amber border border-conf-amber/25',
  error:   'bg-conf-critical/10 text-conf-critical border border-conf-critical/25',
  code:    'bg-domain-code/10 text-domain-code border border-domain-code/25',
  medical: 'bg-domain-medical/10 text-domain-medical border border-domain-medical/25',
  legal:   'bg-domain-legal/10 text-domain-legal border border-domain-legal/25',
};

const selectedStyles: Record<ChipVariant, string> = {
  default: 'bg-elevated border-border-strong text-text-primary',
  gold:    'bg-gold-primary/20 border-gold-primary text-gold-bright',
  success: 'bg-conf-high/20 border-conf-high',
  warning: 'bg-conf-amber/20 border-conf-amber',
  error:   'bg-conf-critical/20 border-conf-critical',
  code:    'bg-domain-code/20 border-domain-code',
  medical: 'bg-domain-medical/20 border-domain-medical',
  legal:   'bg-domain-legal/20 border-domain-legal',
};

const interactiveStyles =
  'relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50';

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      aria-label="Remove"
      onClick={(e) => { e.stopPropagation(); onDismiss(); }}
      className="ml-0.5 rounded-full opacity-60 hover:opacity-100 transition-opacity focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary/50"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
        <path d="M2 2L8 8M8 2L2 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </button>
  );
}

/** Clickable chip — shares the Interaction Engine's lift / press / highlight. */
function InteractiveChip({
  className,
  onClick,
  onDismiss,
  children,
}: {
  className: string;
  onClick: () => void;
  onDismiss?: () => void;
  children: React.ReactNode;
}) {
  const { bind, motionStyle, highlightOpacity } = useControlInteraction();

  return (
    <m.span
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(); }}
      className={cn(className, interactiveStyles)}
      style={motionStyle}
      {...bind}
    >
      <InteractionHighlight opacity={highlightOpacity} />
      <span className="relative inline-flex items-center gap-1.5">
        {children}
        {onDismiss && <DismissButton onDismiss={onDismiss} />}
      </span>
    </m.span>
  );
}

/**
 * Chip — small pill for tags, filters, and dismissible selections. Interactive
 * chips (with onClick) lift on hover and compress on press via the shared
 * Interaction Engine; static chips render unchanged.
 *
 * @example
 * <Chip variant="gold" onDismiss={() => removeTag(tag)}>{tag}</Chip>
 * <Chip variant="code" selected={active === 'code'} onClick={() => setActive('code')}>Code</Chip>
 */
export function Chip({ variant = 'default', onDismiss, onClick, selected, children, className }: ChipProps) {
  const chipClass = cn(baseStyles, variantStyles[variant], selected && selectedStyles[variant], className);

  if (onClick) {
    return (
      <InteractiveChip className={chipClass} onClick={onClick} onDismiss={onDismiss}>
        {children}
      </InteractiveChip>
    );
  }

  return (
    <span className={chipClass}>
      {children}
      {onDismiss && <DismissButton onDismiss={onDismiss} />}
    </span>
  );
}
