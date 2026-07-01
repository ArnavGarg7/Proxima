import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useSurfaceInteraction } from '@/components/interaction/useSurfaceInteraction';
import { InteractionHighlight } from '@/components/interaction/InteractionHighlight';

export type CardVariant =
  | 'default'
  | 'metric'
  | 'result'
  | 'info'
  | 'glass'
  | 'interactive';

/* Native div attrs minus the handlers framer's motion element redefines. */
type NativeDivProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragExit'
  | 'onDragLeave' | 'onDragOver' | 'onDrop'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

interface CardProps extends NativeDivProps {
  variant?: CardVariant;
  /** Removes default padding — use when card content manages its own spacing */
  noPadding?: boolean;
  /** Accent color for the top border strip (metric variant) */
  accentColor?: 'gold' | 'success' | 'warning' | 'error' | 'info' | 'code' | 'medical' | 'legal';
  children: React.ReactNode;
  className?: string;
}

/* Lift + press are spring-driven by the Interaction Engine; CSS keeps only the
   colour/border hovers and the existing shadow swap (box-shadow is not animated). */
const baseStyles =
  'bg-surface border border-border rounded-lg transition-colors duration-150 ' +
  'motion-safe:will-change-transform shadow-card';

const variantStyles: Record<CardVariant, string> = {
  /** Standard card — subtle hover lift + raised shadow */
  default:
    'hover:border-border-strong hover:bg-elevated card-shadow-hover',

  /** Metric card — top accent border, lift on hover */
  metric:
    'border-t-2 card-shadow-hover',

  /** Result card — left-accent, lift on hover */
  result:
    'border-l-2 border-l-gold-primary/50 hover:border-l-gold-primary hover:border-border-strong card-shadow-hover',

  /** Info panel — no hover state, slightly deeper surface (static) */
  info:
    'bg-elevated border-border',

  /** Glass card — translucent surface, elevated by shadow */
  glass:
    'bg-surface/60 backdrop-blur-sm border-border/50 hover:border-border card-shadow-hover',

  /** Interactive card — stronger hover signal, pointer cursor */
  interactive:
    'hover:border-gold-primary/50 hover:bg-elevated cursor-pointer card-shadow-hover active:border-gold-primary',
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

/** Interactive card surface — shares the Interaction Engine's lift/press/highlight. */
function CardSurface({
  className,
  interactive,
  children,
  style,
  ...rest
}: { className: string; interactive: boolean } & NativeDivProps) {
  const { bind, motionStyle, highlightOpacity } = useSurfaceInteraction({ interactive });

  return (
    <m.div className={className} style={{ ...style, ...motionStyle }} {...rest} {...bind}>
      {/* Negative-z highlight sits above the card surface but below content, so
          card children (incl. flex/grid) are never wrapped — layout is untouched. */}
      <InteractionHighlight opacity={highlightOpacity} className="-z-[1]" />
      {children}
    </m.div>
  );
}

/**
 * Card — the core surface container in Proxima.
 *
 * Interactive variants (and any card with an onClick) lift on hover and compress
 * on press via the shared Interaction Engine; the static `info` variant renders
 * a plain surface, unchanged.
 *
 * @example
 * <Card>…</Card>
 * <Card variant="metric" accentColor="gold">…</Card>
 * <Card variant="interactive" onClick={handleSelect}>…</Card>
 */
export function Card({
  variant = 'default',
  noPadding = false,
  accentColor = 'gold',
  children,
  className,
  ...rest
}: CardProps) {
  const cardClass = cn(
    baseStyles,
    variantStyles[variant],
    variant === 'metric' && accentBorderColors[accentColor],
    !noPadding && 'p-4 sm:p-6',
    className,
  );

  // Static informational surface — no physics, identical to before.
  if (variant === 'info') {
    return (
      <div className={cardClass} {...rest}>
        {children}
      </div>
    );
  }

  const interactive = variant === 'interactive' || Boolean(rest.onClick);

  return (
    <CardSurface className={cardClass} interactive={interactive} {...rest}>
      {children}
    </CardSurface>
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
