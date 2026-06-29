import React from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button while true */
  isLoading?: boolean;
  /** Optional icon rendered before the label */
  leftIcon?: React.ReactNode;
  /** Optional icon rendered after the label */
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const baseStyles =
  'inline-flex items-center justify-center gap-2 font-sans font-medium rounded ' +
  'transition-all duration-150 cursor-pointer select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-void ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ' +
  'motion-safe:will-change-transform';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-primary text-void ' +
    'hover:bg-gold-bright motion-safe:hover:-translate-y-px ' +
    'motion-safe:active:translate-y-0 motion-safe:active:scale-[0.98] active:bg-gold-primary',

  secondary:
    'bg-transparent text-text-primary border border-border-strong ' +
    'hover:bg-elevated hover:border-border-strong ' +
    'motion-safe:active:scale-[0.98] active:bg-surface',

  ghost:
    'bg-transparent text-text-secondary ' +
    'hover:text-text-primary hover:bg-white/5 ' +
    'motion-safe:active:scale-[0.98] active:bg-white/10',

  danger:
    'bg-red-900/20 text-red-300 border border-red-800 ' +
    'hover:bg-red-900/40 hover:border-red-700 ' +
    'motion-safe:active:scale-[0.98] active:bg-red-900/30',

  outline:
    'bg-transparent text-gold-primary border border-gold-primary/50 ' +
    'hover:border-gold-primary hover:bg-gold-primary/5 ' +
    'motion-safe:active:scale-[0.98] active:bg-gold-primary/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 h-7',
  md: 'text-sm px-5 py-2.5 h-10',
  lg: 'text-base px-6 py-3 h-12',
};

/**
 * Button — the primary interactive element in Proxima.
 *
 * @example
 * <Button variant="primary" onClick={handleAnalyze}>Run Analysis</Button>
 * <Button variant="secondary" leftIcon={<RefreshCw size={14} />}>Refresh</Button>
 * <Button variant="danger" isLoading={isDeleting}>Delete</Button>
 */
export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...rest
}: ButtonProps) {
  const spinnerSize = size === 'sm' ? 'xs' : size === 'lg' ? 'sm' : 'xs';

  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      {...rest}
    >
      {isLoading ? (
        <>
          <Spinner size={spinnerSize} label="Loading…" />
          {children && <span>{children}</span>}
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          {children && <span>{children}</span>}
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}
