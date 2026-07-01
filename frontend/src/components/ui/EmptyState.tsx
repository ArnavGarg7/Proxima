import React from 'react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

type EmptyStateVariant = 'default' | 'error' | 'success';

interface EmptyStateAction {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'ghost';
}

interface EmptyStateProps {
  /** Icon — any React node (Lucide component, Material Symbol span, or SVG) */
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  variant?: EmptyStateVariant;
  /** Center within the parent container */
  centered?: boolean;
  className?: string;
}

const variantIconColor: Record<EmptyStateVariant, string> = {
  default: 'text-text-muted',
  error:   'text-conf-critical',
  success: 'text-conf-high',
};

/**
 * EmptyState — shown when there's no data to display, an error occurred,
 * or an action hasn't been taken yet.
 *
 * Accepts any React node as the icon — works with both Material Symbols
 * and Lucide icons.
 *
 * @example
 * <EmptyState
 *   icon={<FileText size={40} />}
 *   title="No documents yet"
 *   description="Upload a document to begin analysis."
 *   action={{ label: 'Upload Document', onClick: () => navigate('/workspace') }}
 * />
 *
 * <EmptyState
 *   variant="error"
 *   icon={<AlertCircle size={40} />}
 *   title="Failed to load data"
 *   description={error}
 *   action={{ label: 'Retry', onClick: refetch }}
 * />
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  variant = 'default',
  centered = true,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-4 p-10 text-center',
        centered && 'justify-center min-h-[240px]',
        className,
      )}
    >
      {icon && (
        <span
          aria-hidden="true"
          className={cn('opacity-60', variantIconColor[variant])}
        >
          {icon}
        </span>
      )}

      <div className="flex flex-col items-center gap-2 max-w-xs">
        <p className="font-sans text-base font-semibold text-text-primary">{title}</p>
        {description && (
          <p className="font-sans text-sm text-text-secondary leading-relaxed">{description}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3 mt-2">
          {action && (
            action.variant === 'ghost' ? (
              <button
                type="button"
                onClick={action.onClick}
                className={
                  'inline-flex items-center gap-2 font-sans text-sm font-medium text-text-secondary ' +
                  'hover:text-text-primary transition-colors duration-150 ' +
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50'
                }
              >
                {action.label}
              </button>
            ) : (
              <Button variant="primary" onClick={action.onClick}>
                {action.label}
              </Button>
            )
          )}
          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="inline-flex items-center gap-2 font-sans text-sm text-text-muted hover:text-text-secondary transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
