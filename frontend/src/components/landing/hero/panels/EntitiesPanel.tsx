import { motion, useTransform, type MotionValue } from 'framer-motion';
import { productMotion } from '@/components/product-showcase/productMotion';
import { useHeroExtraction } from '@/components/landing/hero-engine/heroSelectors';

/**
 * EntityRow — one extracted entity. Fades + slides slightly upward, revealed in
 * sequence as the shared extraction-progress MotionValue passes its window. No
 * typewriter; order is deterministic.
 */
function EntityRow({ item, index, total, progress }: {
  item: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const start = (index / total) * 0.85;
  const end   = start + 0.2;
  const opacity = useTransform(progress, [start, end], [0, 1], { clamp: true });
  const y       = useTransform(progress, [start, end], [productMotion.revealY, 0], { clamp: true });

  return (
    <motion.div className="flex items-center gap-1.5" style={{ opacity, y }}>
      <span className="material-symbols-outlined text-[13px] text-conf-high">check</span>
      <span className="truncate font-sans text-xs text-text-secondary">{item}</span>
    </motion.div>
  );
}

/**
 * EntitiesPanel — the extracted-entities list. The whole block fades in as the
 * extraction phase starts, then each entity appears one after another. Hidden
 * (zero opacity, layout preserved) before extraction; fully shown under reduced
 * motion. Engine-driven — no local timers.
 */
export function EntitiesPanel() {
  const { progress, items } = useHeroExtraction();
  const opacity = useTransform(progress, [0, 0.04], [0, 1], { clamp: true });

  return (
    <motion.div className="flex flex-col gap-2" style={{ opacity }}>
      <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
        Extracted Entities
      </span>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {items.map((item, i) => (
          <EntityRow key={item} item={item} index={i} total={items.length} progress={progress} />
        ))}
      </div>
    </motion.div>
  );
}
