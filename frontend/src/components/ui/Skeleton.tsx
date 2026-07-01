import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

/** Single skeleton line or block — apply width/height via className */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('skeleton-shimmer rounded', className)}
    />
  );
}

/** Preset: a card-shaped skeleton matching `.card` proportions */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-surface border border-border rounded-lg p-6 flex flex-col gap-4',
        className,
      )}
    >
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
    </div>
  );
}

/** Preset: a text-line skeleton */
export function SkeletonLine({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-3 w-full', className)} />;
}

/** Preset: a circular avatar/icon skeleton */
export function SkeletonCircle({ size = 'md', className }: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'sm' ? 'w-6 h-6' : size === 'lg' ? 'w-12 h-12' : 'w-8 h-8';
  return <Skeleton className={cn('rounded-full', sizeClass, className)} />;
}
