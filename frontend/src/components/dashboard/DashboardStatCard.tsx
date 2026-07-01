import { useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { useCountUp } from '@/hooks/useCountUp';
import { duration } from '@/theme/motion';

interface DashboardStatCardProps {
  label: string;
  value: string | number;
  icon: string;
  /** Renders the card with an error accent — for critical/alert metrics */
  critical?: boolean;
  /** Top border accent color — defaults to gold */
  accentColor?: 'gold' | 'success' | 'warning' | 'error';
}

export function DashboardStatCard({
  label,
  value,
  icon,
  critical    = false,
  accentColor = 'gold',
}: DashboardStatCardProps) {
  const reduced      = useReducedMotion() ?? false;
  const resolvedAccent = critical ? 'error' : accentColor;

  /*
   * Count-up: only when value is a number.
   * String values (e.g. "N/A") are shown as-is.
   */
  const isNumeric  = typeof value === 'number';
  const animated   = useCountUp(isNumeric ? value : 0, {
    duration:  duration.enter,          // 400ms — from motion token
    delay:     reduced ? 0 : duration.base, // 150ms head-start
    immediate: reduced || !isNumeric,
  });
  const displayValue = isNumeric && !reduced ? animated : value;

  return (
    <Card
      variant="metric"
      accentColor={resolvedAccent}
      className="flex flex-col gap-4"
    >
      <div className="flex items-start justify-between">
        <span className="font-sans text-xs font-medium uppercase tracking-widest text-text-muted">
          {label}
        </span>
        <span
          className={cn(
            'material-symbols-outlined text-lg leading-none transition-transform duration-150 group-hover:scale-110',
            critical ? 'text-conf-critical' : 'text-gold-primary',
          )}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <div
        className="font-display text-[2rem] font-semibold leading-none text-text-primary tabular-nums"
        aria-live={isNumeric ? 'polite' : undefined}
        aria-atomic="true"
      >
        {displayValue}
      </div>
    </Card>
  );
}
