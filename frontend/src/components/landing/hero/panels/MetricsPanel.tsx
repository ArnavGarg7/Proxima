import { motion, useTransform } from 'framer-motion';
import { useHeroMetrics } from '@/components/landing/hero-engine/heroSelectors';
import { HeroCounter } from '../HeroCounter';

/**
 * MetricsPanel — Entities / Sections / Risk Flags, now driven by the engine.
 *
 * The counters run once with the confidence phase (never looping), each via an
 * imperative HeroCounter (no React state per frame). The stack fades in as
 * confidence starts; under reduced motion it renders fully populated.
 */
export function MetricsPanel() {
  const { progress, entities, sections, riskFlags } = useHeroMetrics();
  const opacity = useTransform(progress, [0, 0.1], [0, 1], { clamp: true });

  const rows = [
    { k: 'Entities',   target: entities },
    { k: 'Sections',   target: sections },
    { k: 'Risk flags', target: riskFlags },
  ];

  return (
    <motion.div className="flex flex-col justify-center gap-2" style={{ opacity }}>
      {rows.map((m) => (
        <div key={m.k} className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
          <span className="font-sans text-xs text-text-muted">{m.k}</span>
          <span className="font-mono text-xs font-semibold text-text-primary tabular-nums">
            <HeroCounter value={progress} scale={m.target} />
          </span>
        </div>
      ))}
    </motion.div>
  );
}
