import { motion, useTransform, type MotionValue } from 'framer-motion';
import { productMotion } from '@/components/product-showcase/productMotion';
import { useHeroSummary } from '@/components/landing/hero-engine/heroSelectors';

/**
 * SummarySentence — one summary line. Fades in with a slight upward motion,
 * revealed in sequence as the shared summary-progress MotionValue passes its
 * window. No simulated typing.
 */
function SummarySentence({ text, index, total, progress }: {
  text: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = (index / total) * 0.8;
  const end   = start + 0.25;
  const opacity = useTransform(progress, [start, end], [0, 1], { clamp: true });
  const y       = useTransform(progress, [start, end], [productMotion.revealY, 0], { clamp: true });

  return (
    <motion.p
      className="font-sans text-xs leading-relaxed text-text-secondary"
      style={{ opacity, y }}
    >
      {text}
    </motion.p>
  );
}

/**
 * SummaryPanel — the generated summary, revealed sentence-by-sentence as the
 * summary phase runs. The block fades in at the phase start; hidden (zero
 * opacity, layout preserved) before it and fully shown under reduced motion.
 */
export function SummaryPanel() {
  const { progress, sentences } = useHeroSummary();
  const opacity = useTransform(progress, [0, 0.04], [0, 1], { clamp: true });

  return (
    <motion.div className="flex flex-col gap-2" style={{ opacity }}>
      <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
        Summary
      </span>
      <div className="flex flex-col gap-1.5">
        {sentences.map((text, i) => (
          <SummarySentence key={i} text={text} index={i} total={sentences.length} progress={progress} />
        ))}
      </div>
    </motion.div>
  );
}
