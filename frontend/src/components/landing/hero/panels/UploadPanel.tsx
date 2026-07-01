import { motion, useReducedMotion } from 'framer-motion';
import { loopDuration } from '@/theme/motion';
import { useHeroUpload } from '@/components/landing/hero-engine/heroSelectors';
import { HeroCounter } from '../HeroCounter';

/**
 * UploadPanel — the upload-progress footer, now driven by the Hero engine.
 *
 * Idle → spinner-less dot, "Waiting"; Upload → spinner + "Uploading file" with
 * the bar filling (scaleX, eased fast→slow) and the percentage counting; once
 * complete → check + "Upload complete", bar full. The bar uses scaleX (never
 * width) and the percentage updates via an imperative MotionValue counter, so
 * the panel re-renders only on phase boundaries. Under reduced motion the engine
 * settles on the completed state.
 */
export function UploadPanel() {
  const reduced = useReducedMotion() ?? false;
  const { active, complete, progress, label } = useHeroUpload();

  return (
    <div className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-void/60 p-3 shadow-[inset_0_1px_3px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 font-sans text-xs text-text-secondary">
          {complete ? (
            <span className="material-symbols-outlined text-[14px] text-conf-high">check_circle</span>
          ) : active ? (
            <motion.span
              className="material-symbols-outlined text-[14px] text-gold-primary"
              animate={reduced ? undefined : { rotate: 360 }}
              transition={reduced ? undefined : { duration: loopDuration.spinner, ease: 'linear', repeat: Infinity }}
            >
              progress_activity
            </motion.span>
          ) : (
            <span className="material-symbols-outlined text-[14px] text-text-muted">upload_file</span>
          )}
          {label}
        </span>
        <span className="font-mono text-[11px] text-text-muted tabular-nums">
          <HeroCounter value={progress} scale={100} suffix="%" />
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <motion.div
          className="h-full w-full rounded-full bg-gold-primary skeleton-shimmer"
          style={{ scaleX: progress, originX: 0 }}
        />
      </div>
    </div>
  );
}
