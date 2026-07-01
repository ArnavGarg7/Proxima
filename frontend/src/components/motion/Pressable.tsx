import React from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { duration, easeArr, lift, scale } from '@/theme/motion';
import { cn } from '@/lib/cn';

interface PressableProps {
  children: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement | HTMLDivElement>;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-controls'?: string;
  tabIndex?: number;
  /** Render as a div instead of button */
  asDiv?: boolean;
}

/**
 * Pressable — motion button / div with lift-on-hover and scale-on-press.
 *
 * Hover: translateY(-1px)
 * Press: scale(0.98)
 *
 * For standard buttons, prefer <Button> which handles this via Tailwind.
 * Use Pressable for custom interactive elements that need tactile feedback.
 */
export function Pressable({ children, className, asDiv = false, onClick, ...rest }: PressableProps) {
  const reduced = useReducedMotion();

  const motionProps = {
    whileHover: { y: lift.small },
    whileTap:   { scale: scale.press },
    transition: { duration: duration.fast / 1000, ease: easeArr.out },
    className:  cn('will-change-transform', className),
  };

  if (reduced) {
    if (asDiv) {
      return (
        <div className={className} onClick={onClick as React.MouseEventHandler<HTMLDivElement>}>
          {children}
        </div>
      );
    }
    return (
      <button
        className={className}
        onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
        type={rest.type ?? 'button'}
        disabled={rest.disabled}
        aria-label={rest['aria-label']}
      >
        {children}
      </button>
    );
  }

  if (asDiv) {
    return (
      <m.div
        {...motionProps}
        onClick={onClick as React.MouseEventHandler<HTMLDivElement>}
      >
        {children}
      </m.div>
    );
  }

  return (
    <m.button
      {...motionProps}
      onClick={onClick as React.MouseEventHandler<HTMLButtonElement>}
      type={rest.type ?? 'button'}
      disabled={rest.disabled}
      aria-label={rest['aria-label']}
      aria-expanded={rest['aria-expanded']}
      aria-controls={rest['aria-controls']}
      tabIndex={rest.tabIndex}
    >
      {children}
    </m.button>
  );
}
