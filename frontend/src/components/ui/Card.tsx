import React from 'react';
import { cn } from '@/lib/cn';

export type CardVariant =
  | 'default'
  | 'metric'
  | 'result'
  | 'info'
  | 'glass'
  | 'interactive';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** Removes default padding — use when card content manages its own spacing */
  noPadding?: boolean;
  /** Accent color for the top border strip (metric variant) */
  accentColor?: 'gold' | 'success' | 'warning' | 'error' | 'info' | 'code' | 'medical' | 'legal';
  children: React.ReactNode;
  className?: string;
}

const baseStyles =
  'bg-surface border border-border rounded-lg transition-all duration-150 ' +
  'motion-safe:will-change-transform';

const variantStyles: Record<CardVariant, string> = {
  /** Standard card — subtle hover lift */
  default:
    'hover:border-border-strong hover:bg-elevated ' +
    'motion-safe:hover:-translate-y-0.5',

  /** Metric card — top accent border, lift on hover */
  metric:
    'border-t-2 ' +
    'motion-safe:hover:-translate-y-0.5',

  /** Result card — slightly more prominent, gold left accent */
  result:
    'border-l-2 border-l-gold-primary/50 hover:border-l-gold-primary hover:border-border-strong ' +
    'motion-safe:hover:-translate-y-0.5',

  /** Info panel — no hover state, softer appearance */
  info:
    'bg-elevated border-border',

  /** Glass card — translucent surface for overlays */
  glass:
    'bg-surface/60 backdrop-blur-sm border-border/50 hover:border-border ' +
    'motion-safe:hover:-translate-y-0.5',

  /** Interactive card — stronger hover signal, pointer cursor */
  interactive:
    'hover:border-gold-primary/50 hover:bg-elevated cursor-pointer ' +
    'motion-safe:hover:-translate-y-0.5 ' +
    'motion-safe:active:scale-[0.99] active:border-gold-primary',
};

const accentBorderColors: Record<NonNullable<CardProps['accentColor']>, string> = {
  gold:    'border-t-gold-primary',
  success: 'border-t-conf-high',
  warning: 'border-t-conf-amber',
  error:   'border-t-conf-critical',
  info:    'border-t-domain-medical',
  code:    'border-t-domain-code',
  medical: 'border-t-domain-medical',
  legal:   'border-t-domain-legal',
};

/**
 * Card — the core surface container in Proxima.
 *
 * @example
 * // Standard
 * <Card>…</Card>
 *
 * // Metric card with gold top stripe
 * <Card variant="metric" accentColor="gold">…</Card>
 *
 * // Clickable card
 * <Card variant="interactive" onClick={handleSelect}>…</Card>
 *
 * // Result output card
 * <Card variant="result">…</Card>
 */
export function Card({
  variant = 'default',
  noPadding = false,
  accentColor = 'gold',
  children,
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        baseStyles,
        variantStyles[variant],
        variant === 'metric' && accentBorderColors[accentColor],
        !noPadding && 'p-4 sm:p-6',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Card.Header — optional header section with bottom border */
export function CardHeader({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between pb-4 mb-4 border-b border-border', className)}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Card.Body — explicit body section (use when paired with CardHeader/CardFooter) */
export function CardBody({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex flex-col gap-3', className)} {...rest}>
      {children}
    </div>
  );
}

/** Card.Footer — optional footer section with top border */
export function CardFooter({ children, className, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center justify-between pt-4 mt-4 border-t border-border', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
