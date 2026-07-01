import React from 'react';
import { cn } from '@/lib/cn';

export type BadgeVariant =
  // Semantic status
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'default'
  // Confidence levels (matching backend confidence enum)
  | 'conf-high'
  | 'conf-amber'
  | 'conf-low'
  | 'conf-critical'
  // Domain identity
  | 'domain-code'
  | 'domain-medical'
  | 'domain-legal';

export type BadgeSize = 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: React.ReactNode;
  className?: string;
  /** Renders as an uppercase label with tracked spacing */
  uppercase?: boolean;
}

const baseStyles =
  'inline-flex items-center font-sans font-semibold rounded border';

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'text-[10px] px-1.5 py-0.5 tracking-wide',
  md: 'text-xs   px-2   py-1   tracking-wider',
};

const variantStyles: Record<BadgeVariant, string> = {
  // Status
  success:       'bg-conf-high/10    text-conf-high     border-conf-high/25',
  warning:       'bg-conf-amber/10   text-conf-amber    border-conf-amber/25',
  error:         'bg-conf-critical/10 text-conf-critical border-conf-critical/25',
  info:          'bg-domain-medical/10 text-domain-medical border-domain-medical/25',
  default:       'bg-elevated         text-text-secondary border-border',

  // Confidence
  'conf-high':     'bg-conf-high/10     text-conf-high     border-conf-high/25',
  'conf-amber':    'bg-conf-amber/10    text-conf-amber    border-conf-amber/25',
  'conf-low':      'bg-conf-low/10      text-conf-low      border-conf-low/25',
  'conf-critical': 'bg-conf-critical/15 text-conf-critical border-conf-critical/30',

  // Domain
  'domain-code':    'bg-domain-code/10    text-domain-code    border-domain-code/25',
  'domain-medical': 'bg-domain-medical/10 text-domain-medical border-domain-medical/25',
  'domain-legal':   'bg-domain-legal/10   text-domain-legal   border-domain-legal/25',
};

/**
 * Badge — semantic status or domain indicator.
 *
 * @example
 * <Badge variant="success">High Confidence</Badge>
 * <Badge variant="conf-critical" uppercase>Critical</Badge>
 * <Badge variant="domain-medical">Clinical</Badge>
 */
export function Badge({
  variant = 'default',
  size = 'sm',
  uppercase = true,
  children,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        baseStyles,
        sizeStyles[size],
        variantStyles[variant],
        uppercase && 'uppercase',
        className,
      )}
    >
      {children}
    </span>
  );
}

