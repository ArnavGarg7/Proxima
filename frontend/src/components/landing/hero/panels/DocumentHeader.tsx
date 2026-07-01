import { motion, useReducedMotion, useTransform } from 'framer-motion';
import { loopDuration } from '@/theme/motion';
import { Badge } from '@/components/ui/Badge';
import { useHeroDocument, useHeroRouting } from '@/components/landing/hero-engine/heroSelectors';

/**
 * DocumentHeader — the analyzed-document identity row. The blinking caret is the
 * existing Stage 5A animation. When routing begins, the document badge gives a
 * subtle scale "handoff" pulse (driven by routing progress) so the document
 * reads as moving into the routing step — a connected transition, not a
 * teleport. Under reduced motion the pulse resolves to its resting scale.
 */
export function DocumentHeader() {
  const reduced = useReducedMotion() ?? false;
  const { label, filename, icon, badge } = useHeroDocument();
  const { progress } = useHeroRouting();

  // Gentle emphasis during the first part of the routing scan (the handoff).
  const handoffScale = useTransform(progress, [0, 0.18, 0.4], [1, 1.06, 1], { clamp: true });

  return (
    <div className="flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
          {label}
        </span>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-domain-medical">
            {icon}
          </span>
          <span className="font-sans text-sm font-semibold text-text-primary">
            {filename}
          </span>
          {/* Blinking caret */}
          <motion.span
            className="inline-block h-3.5 w-px bg-gold-primary"
            animate={reduced ? undefined : { opacity: [1, 1, 0, 0] }}
            transition={reduced ? undefined : { duration: loopDuration.blink, ease: 'linear', repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
          />
        </div>
      </div>
      <motion.span style={{ scale: handoffScale }} className="inline-block origin-center">
        <Badge variant={badge.variant} size="sm">{badge.label}</Badge>
      </motion.span>
    </div>
  );
}
