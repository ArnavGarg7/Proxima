import { motion, useTransform } from 'framer-motion';
import { Badge } from '@/components/ui/Badge';
import { useHeroRouting } from '@/components/landing/hero-engine/heroSelectors';
import type { HeroDomainTag } from '@/components/landing/hero-engine/heroData';

/* Sub-window constants within the Routing phase [0, 1] progress. */
const BADGE_REVEAL_SPAN = 0.18;  // fraction each badge takes to reveal
const BADGE_SCALE_FROM  = 0.92;  // starting scale for badge entry
const DIM_THRESHOLD     = 0.78;  // progress at which non-winners start dimming
const CHECK_START       = 0.80;  // check mark begins appearing
const CHECK_END         = 0.95;  // check mark fully visible

/**
 * RoutingCandidate — one analyzer in the routing scan. Its opacity/scale derive
 * entirely from the shared routing-progress MotionValue (no re-renders): it dims
 * at rest, brightens as the scan reaches it, then — at the decision — the
 * selected analyzer locks to full with a check while the others fade back.
 */
function RoutingCandidate({
  candidate,
  index,
  total,
  selected,
}: {
  candidate: HeroDomainTag;
  index: number;
  total: number;
  selected: boolean;
}) {
  const { progress } = useHeroRouting();

  const revealStart = (index / total) * 0.6;
  const revealEnd   = revealStart + BADGE_REVEAL_SPAN;

  const opacity = useTransform(
    progress,
    [revealStart, revealEnd, DIM_THRESHOLD, 1],
    selected ? [0.35, 1, 1, 1] : [0.35, 1, 1, 0.3],
    { clamp: true },
  );
  const scale = useTransform(progress, [revealStart, revealEnd], [BADGE_SCALE_FROM, 1], { clamp: true });
  const check = useTransform(progress, [CHECK_START, CHECK_END], [0, 1], { clamp: true });

  return (
    <motion.span className="inline-flex items-center gap-1" style={{ opacity, scale }}>
      <Badge variant={candidate.variant} size="sm">{candidate.label}</Badge>
      {selected && (
        <motion.span
          className="material-symbols-outlined text-[13px] text-conf-high"
          style={{ opacity: check }}
        >
          check
        </motion.span>
      )}
    </motion.span>
  );
}

/**
 * RoutingPanel — the "Detected Domains" routing result, now alive. The scan
 * reveals each analyzer, then resolves to the primary one. Driven by the engine;
 * under reduced motion the engine settles routing at its decided state.
 */
export function RoutingPanel() {
  const { candidates, primary } = useHeroRouting();

  return (
    <div className="flex flex-col gap-2">
      <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
        Detected Domains
      </span>
      <div className="flex flex-wrap items-center gap-1.5">
        {candidates.map((candidate, i) => (
          <RoutingCandidate
            key={candidate.label}
            candidate={candidate}
            index={i}
            total={candidates.length}
            selected={candidate.label === primary}
          />
        ))}
      </div>
    </div>
  );
}
