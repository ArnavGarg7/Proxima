import { motion, useReducedMotion } from 'framer-motion';
import { Reveal } from './Reveal';
import { staggerContainer, staggerItem, EASE_OUT } from './landingMotion';
import { duration } from '@/theme/motion';

/**
 * WorkflowSection — the five-stage pipeline from raw document to exported result.
 *
 * Steps reveal in sequence on scroll, and the connector lines draw in from left
 * to right (scaleX) so the eye is carried through the story. Vertical stack on
 * small screens. All motion respects prefers-reduced-motion.
 */

const STEPS = [
  { icon: 'upload_file', title: 'Upload',     desc: 'Drop a PDF, DOCX, or TXT into the workspace.' },
  { icon: 'alt_route',   title: 'AI Routing', desc: 'Proxima detects the domain and selects the right engine.' },
  { icon: 'neurology',   title: 'Analysis',   desc: 'Entities, risks, and structure are extracted.' },
  { icon: 'shield',      title: 'Confidence', desc: 'Every result is scored for trust and hallucination risk.' },
  { icon: 'ios_share',   title: 'Export',     desc: 'Share structured intelligence with your team.' },
] as const;

export function WorkflowSection() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section id="workflow" className="relative py-20 lg:py-24">
      <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8">

        {/* Section header */}
        <Reveal className="mx-auto mb-16 flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-gold-primary/80">
            How it works
          </span>
          <h2 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            From document to decision in five steps
          </h2>
          <p className="font-sans text-base leading-relaxed text-text-secondary">
            A single pipeline carries every file from upload to a confidence-scored,
            exportable result.
          </p>
        </Reveal>

        {/* Track */}
        <motion.ol
          className="relative grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-4"
          variants={staggerContainer}
          initial={reduced ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
        >
          {STEPS.map((step, i) => (
            <motion.li
              key={step.title}
              variants={staggerItem}
              className="relative flex flex-col items-center text-center"
            >
              {/* Connector line — draws in left→right on large screens */}
              {i < STEPS.length - 1 && (
                <motion.span
                  aria-hidden="true"
                  className="absolute left-1/2 top-7 hidden h-px w-full origin-left bg-gradient-to-r from-gold-primary/40 via-border to-transparent lg:block"
                  initial={{ scaleX: reduced ? 1 : 0 }}
                  whileInView={{ scaleX: 1 }}
                  viewport={{ once: true }}
                  transition={reduced ? { duration: 0 } : { duration: duration.enter / 1000, ease: EASE_OUT, delay: 0.2 + i * 0.08 }}
                />
              )}

              {/* Node */}
              <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
                <span
                  className="material-symbols-outlined text-[24px] text-gold-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden="true"
                >
                  {step.icon}
                </span>
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-border bg-elevated font-mono text-[10px] font-semibold text-text-secondary">
                  {i + 1}
                </span>
              </div>

              <h3 className="mb-1.5 font-sans text-base font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="max-w-[200px] font-sans text-sm leading-relaxed text-text-muted">
                {step.desc}
              </p>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
