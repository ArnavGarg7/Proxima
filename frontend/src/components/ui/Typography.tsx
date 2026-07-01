import React from 'react';
import { cn } from '@/lib/cn';
import {
  type TypographyVariant,
  typographyStyles,
  typographyElements,
} from '@/theme/typography';

export type { TypographyVariant };

interface TypographyProps extends React.HTMLAttributes<HTMLElement> {
  variant: TypographyVariant;
  /** Override the default HTML element for this variant */
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  /** Dim the text to text-secondary */
  muted?: boolean;
  /** Use text-text-muted (lightest) */
  faint?: boolean;
  /** Apply gold accent color */
  accent?: boolean;
}

/**
 * Typography — renders any text variant with the correct font, size, weight,
 * and color. Always use this instead of raw Tailwind text utilities to ensure
 * consistency across the product.
 *
 * @example
 * <Typography variant="h1">Proxima Intelligence</Typography>
 * <Typography variant="body-md" muted>Select a document to begin.</Typography>
 * <Typography variant="label">Confidence Level</Typography>
 */
export function Typography({
  variant,
  as,
  children,
  className,
  muted,
  faint,
  accent,
  ...rest
}: TypographyProps) {
  const Element = as ?? typographyElements[variant];

  const colorOverride = accent
    ? 'text-gold-primary'
    : faint
      ? 'text-text-muted'
      : muted
        ? 'text-text-secondary'
        : '';

  return (
    <Element
      className={cn(typographyStyles[variant], colorOverride, className)}
      {...rest}
    >
      {children}
    </Element>
  );
}
