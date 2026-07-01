import React from 'react';
import { m } from 'framer-motion';
import { cn } from '@/lib/cn';
import { useControlInteraction } from '@/components/interaction/InteractionContext';
import { InteractionHighlight } from '@/components/interaction/InteractionHighlight';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize    = 'sm' | 'md' | 'lg';

/* Native button attrs minus the handlers framer's motion element redefines. */
export type NativeButtonProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  | 'onDrag' | 'onDragStart' | 'onDragEnd' | 'onDragEnter' | 'onDragExit'
  | 'onDragLeave' | 'onDragOver' | 'onDrop'
  | 'onAnimationStart' | 'onAnimationEnd' | 'onAnimationIteration'
>;

interface ButtonProps extends NativeButtonProps {
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

/* Lift + press are spring-driven by the Interaction Engine; CSS only handles the
   colour hovers and the focus ring (transform is intentionally excluded). */
const baseStyles =
  'relative inline-flex items-center justify-center gap-2 font-sans font-medium rounded ' +
  'transition-colors duration-150 cursor-pointer select-none ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-void ' +
  'disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none';

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-gold-primary text-void ' +
    'shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)] ' +
    'hover:bg-gold-bright active:bg-gold-primary',

  secondary:
    'bg-transparent text-text-primary border border-border-strong ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ' +
    'hover:bg-elevated hover:border-border-strong active:bg-surface',

  ghost:
    'bg-transparent text-text-secondary ' +
    'hover:text-text-primary hover:bg-white/5 active:bg-white/10',

  danger:
    'bg-red-900/20 text-red-300 border border-red-800 ' +
    'hover:bg-red-900/40 hover:border-red-700 active:bg-red-900/30',

  outline:
    'bg-transparent text-gold-primary border border-gold-primary/50 ' +
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] ' +
    'hover:border-gold-primary hover:bg-gold-primary/5 active:bg-gold-primary/10',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-xs px-3 py-1.5 h-7',
  md: 'text-sm px-5 py-2.5 h-10',
  lg: 'text-base px-6 py-3 h-12',
};

/**
 * Button — the primary interactive element in Proxima.
 *
 * Interaction (hover lift, press compression, hover/focus highlight) is powered
 * entirely by the shared Interaction Engine — no bespoke interaction logic.
 *
 * @example
 * <Button variant="primary" onClick={handleAnalyze}>Run Analysis</Button>
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
  style,
  ...rest
}: ButtonProps) {
  const spinnerSize = size === 'sm' ? 'xs' : size === 'lg' ? 'sm' : 'xs';
  const isDisabled = disabled || isLoading;
  const { bind, motionStyle, highlightOpacity } = useControlInteraction({ disabled: isDisabled });

  return (
    <m.button
      className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
      style={{ ...style, ...motionStyle }}
      disabled={isDisabled}
      aria-busy={isLoading}
      {...rest}
      {...bind}
    >
      <InteractionHighlight opacity={highlightOpacity} />
      <span className="relative inline-flex items-center justify-center gap-2">
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
      </span>
    </m.button>
  );
}
