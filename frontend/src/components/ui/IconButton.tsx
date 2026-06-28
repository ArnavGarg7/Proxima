import React from 'react';
import { cn } from '@/lib/cn';
import type { ButtonVariant, ButtonSize } from './Button';

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible label — required because there is no visible text */
  'aria-label': string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: React.ReactNode;
  className?: string;
}

const baseStyles =
  'inline-flex items-center justify-center shrink-0 rounded ' +
  'transition-all duration-150 cursor-pointer ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-void ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-primary text-void hover:bg-gold-bright hover:scale-105 active:scale-95',
  secondary:
    'bg-transparent text-text-secondary border border-border hover:text-text-primary hover:border-border-strong hover:bg-elevated active:bg-surface',
  ghost:
    'bg-transparent text-text-muted hover:text-text-primary hover:bg-white/5 active:bg-white/10',
  danger:
    'bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40 active:bg-red-900/30',
  outline:
    'bg-transparent text-gold-primary border border-gold-primary/40 hover:border-gold-primary hover:bg-gold-primary/5 active:bg-gold-primary/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'w-6  h-6  text-sm',
  md: 'w-8  h-8  text-base',
  lg: 'w-10 h-10 text-lg',
};

/**
 * IconButton — a square button designed to hold a single icon with no visible label.
 * The `aria-label` prop is required to maintain accessibility.
 *
 * @example
 * <IconButton aria-label="Close panel" variant="ghost" onClick={onClose}>
 *   <X size={16} />
 * </IconButton>
 */
export function IconButton({
  variant = 'ghost',
  size = 'md',
  children,
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}
