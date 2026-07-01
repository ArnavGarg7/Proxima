import { cn } from '@/lib/cn';

interface DividerProps {
  /** Optional label centered in the divider line */
  label?: string;
  /** Vertical divider (default is horizontal) */
  vertical?: boolean;
  /** Stronger border color */
  strong?: boolean;
  className?: string;
}

/**
 * Divider — a visual separator between sections.
 *
 * @example
 * <Divider />
 * <Divider label="OR" />
 * <Divider vertical className="h-6" />
 */
export function Divider({ label, vertical = false, strong = false, className }: DividerProps) {
  const borderColor = strong ? 'border-border-strong' : 'border-border';

  if (vertical) {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn('inline-block w-px self-stretch', borderColor, 'border-l', className)}
      />
    );
  }

  if (label) {
    return (
      <div role="separator" className={cn('flex items-center gap-3', className)}>
        <div className={cn('flex-1 border-t', borderColor)} />
        <span className="text-xs text-text-muted font-sans uppercase tracking-widest shrink-0">
          {label}
        </span>
        <div className={cn('flex-1 border-t', borderColor)} />
      </div>
    );
  }

  return (
    <hr
      role="separator"
      className={cn('border-0 border-t', borderColor, className)}
    />
  );
}
