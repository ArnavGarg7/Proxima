import { motion, useReducedMotion } from 'framer-motion';
import { loopDuration, motionTransition } from '@/theme/motion';
import { heroData } from '@/components/landing/hero-engine/heroData';
import { useHeroStatus } from '@/components/landing/hero-engine/heroSelectors';

/**
 * StatusPanel — the window title bar. The Live badge now reflects the engine's
 * current operation (Waiting → Uploading → Routing → Analyzing) with a simple
 * fade on change; the dot keeps its ambient pulse. Layout, colors, and spacing
 * are unchanged from Stage 5A.
 */
export function StatusPanel() {
  const reduced = useReducedMotion() ?? false;
  const status = useHeroStatus();

  return (
    <div className="flex min-w-0 items-center gap-3 border-b border-white/[0.06] bg-[rgba(26,26,26,0.85)] px-4 py-3 backdrop-blur-sm">
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="h-3 w-3 rounded-full bg-conf-critical/60" />
        <span className="h-3 w-3 rounded-full bg-conf-amber/60" />
        <span className="h-3 w-3 rounded-full bg-conf-high/60" />
      </div>
      <div className="ml-2 flex min-w-0 items-center gap-2 rounded-md border border-border bg-void/60 px-2.5 py-1">
        <span className="material-symbols-outlined text-[13px] text-text-muted">lock</span>
        <span className="truncate font-mono text-[11px] text-text-muted">{heroData.session.url}</span>
      </div>
      {/* Status badge — pulsing dot + phase label */}
      <span className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-conf-high/10 px-2 py-0.5">
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-conf-high"
          animate={reduced ? undefined : { opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
          transition={reduced ? undefined : { duration: loopDuration.pulse, ease: 'easeInOut', repeat: Infinity }}
        />
        <motion.span
          key={status}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={motionTransition.page}
          className="font-sans text-[10px] font-medium uppercase tracking-wider text-conf-high"
        >
          {status}
        </motion.span>
      </span>
    </div>
  );
}
