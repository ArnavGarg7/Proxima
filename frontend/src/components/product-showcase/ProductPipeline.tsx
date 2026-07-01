import { Fragment } from 'react';
import { m, useTransform, type MotionValue } from 'framer-motion';
import { animSpan } from './productTimeline';

/* Nodes fill across 90% of the Animate phase; each fills over a short span. */
const FILL_SPREAD = 0.9;
const NODE_SPAN   = 0.08;

const nodeStart = (index: number, total: number) => (index / total) * FILL_SPREAD;

/** One pipeline node — an empty dot that fills gold in sequence, label beneath. */
function ProcessingNode({ label, index, total, progress }: {
  label: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const [s, e] = animSpan(nodeStart(index, total), nodeStart(index, total) + NODE_SPAN);
  const fill         = useTransform(progress, [s, e], [0, 1], { clamp: true });
  const labelOpacity = useTransform(progress, [s, e], [0.4, 1], { clamp: true });

  return (
    <div className="relative flex flex-col items-center">
      <div className="h-3 w-3 rounded-full border-2 border-border bg-surface">
        <m.div style={{ opacity: fill }} className="absolute inset-[3px] rounded-full bg-gold-primary" />
      </div>
      <m.span
        style={{ opacity: labelOpacity }}
        className="absolute top-4 whitespace-nowrap font-sans text-[8px] text-text-secondary"
      >
        {label}
      </m.span>
    </div>
  );
}

/** The connector between two nodes — fills after the left node completes. */
function ProgressConnector({ index, total, progress }: {
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const [s, e] = animSpan(nodeStart(index, total) + NODE_SPAN, nodeStart(index + 1, total));
  const scaleX = useTransform(progress, [s, e], [0, 1], { clamp: true });

  return (
    <div className="relative mx-1 mt-1.5 h-px flex-1 bg-border">
      <m.div style={{ scaleX }} className="absolute inset-0 origin-left bg-gold-primary/70" />
    </div>
  );
}

/**
 * ProductPipeline — a horizontal processing timeline whose nodes complete and
 * connectors fill in sequence across the Animate phase. Reuses the Hero's
 * progressive-fill language; the shared primitive so any showcase can show a
 * pipeline without re-implementing node/connector markup.
 */
export function ProductPipeline({ steps, progress }: {
  steps: readonly { label: string }[];
  progress: MotionValue<number>;
}) {
  return (
    <div className="relative flex items-start pt-1">
      {steps.map((step, i) => (
        <Fragment key={step.label}>
          <ProcessingNode label={step.label} index={i} total={steps.length} progress={progress} />
          {i < steps.length - 1 && <ProgressConnector index={i} total={steps.length} progress={progress} />}
        </Fragment>
      ))}
    </div>
  );
}
