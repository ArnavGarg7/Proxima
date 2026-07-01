import React from 'react';
import { cn } from '@/lib/cn';

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Remove the default horizontal padding */
  noPadding?: boolean;
  /** Use a narrower max-width (prose width, ~720px) */
  narrow?: boolean;
  children: React.ReactNode;
  className?: string;
}

/**
 * Container — constrains content to the standard max-width with responsive padding.
 * Wrap page content in this to ensure consistent margins across all pages.
 *
 * @example
 * <Container>
 *   <PageHeader title="Dashboard" />
 *   …
 * </Container>
 */
export function Container({ noPadding, narrow, children, className, ...rest }: ContainerProps) {
  return (
    <div
      className={cn(
        'w-full mx-auto',
        narrow ? 'max-w-[720px]' : 'max-w-[1400px]',
        !noPadding && 'px-6 sm:px-8',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
