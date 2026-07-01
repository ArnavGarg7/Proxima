import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { loopDuration } from '@/theme/motion';
import { useHeroTimeline } from '@/components/landing/hero-engine/heroSelectors';

/**
 * TimelinePanel — the workflow nodes (Upload → Routing → Analysis), now driven
 * by the Hero engine. A node is done (check), active (spinner + "processing…"),
 * or pending (muted). Only the first three phases participate this milestone;
 * later phases arrive in 5B.4–5B.5. Re-renders only on phase boundaries; the
 * spinner is suppressed under reduced motion.
 */
export function TimelinePanel() {
  const reduced = useReducedMotion() ?? false;
  const nodes = useHeroTimeline();

  return (
    <div className="flex flex-col gap-2.5">
      {nodes.map((node) => (
        <div key={node.label} className="flex items-center gap-2.5">
          <span
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full border',
              node.status === 'done'
                ? 'border-conf-high/40 bg-conf-high/15'
                : node.status === 'active'
                  ? 'border-gold-primary/40 bg-gold-primary/10'
                  : 'border-border bg-void/40',
            )}
          >
            {node.status === 'done' ? (
              <span className="material-symbols-outlined text-[11px] text-conf-high">check</span>
            ) : node.status === 'active' ? (
              <motion.span
                className="material-symbols-outlined text-[11px] text-gold-primary"
                animate={reduced ? undefined : { rotate: 360 }}
                transition={reduced ? undefined : { duration: loopDuration.spinner, ease: 'linear', repeat: Infinity }}
              >
                autorenew
              </motion.span>
            ) : (
              <span className="h-1 w-1 rounded-full bg-text-muted/50" />
            )}
          </span>
          <span
            className={cn(
              'font-sans text-xs',
              node.status === 'pending' ? 'text-text-muted' : 'text-text-secondary',
            )}
          >
            {node.label}
          </span>
          {node.status === 'active' && (
            <span className="ml-auto font-sans text-[10px] text-text-muted">processing…</span>
          )}
        </div>
      ))}
    </div>
  );
}
