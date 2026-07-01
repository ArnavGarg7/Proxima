import { motion, useReducedMotion } from 'framer-motion';
import { duration as motionDuration, easeArr } from '@/theme/motion';
import { cn } from '@/lib/cn';

interface AnimatedProgressProps {
  /** 0–100 */
  value: number;
  className?: string;
  barClassName?: string;
  /** Delay before bar animates, in seconds */
  delay?: number;
}

export function AnimatedProgress({ value, className, barClassName, delay = 0 }: AnimatedProgressProps) {
  const reduced = useReducedMotion();

  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-border', className)}>
      <motion.div
        className={cn('h-full origin-left rounded-full', barClassName ?? 'bg-gold-primary')}
        initial={{ scaleX: reduced ? value / 100 : 0 }}
        animate={{ scaleX: value / 100 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: motionDuration.page / 1000, ease: easeArr.out, delay }
        }
      />
    </div>
  );
}
