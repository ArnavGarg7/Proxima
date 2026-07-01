import { motion, useReducedMotion } from 'framer-motion';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { Reveal } from './Reveal';
import { gridContainer, staggerItem, EASE_OUT } from './landingMotion';
import { duration } from '@/theme/motion';

/* Full literal class names so Tailwind JIT keeps them. */
const ANALYZERS = [
  {
    icon: 'medical_services', name: 'Clinical Intelligence',
    desc: 'Trials, patient history, and medical literature.',
    iconClass: 'text-domain-medical', hoverClass: 'group-hover:border-domain-medical/40', glowClass: 'group-hover:bg-domain-medical/8',
  },
  {
    icon: 'gavel', name: 'Legal & Contract',
    desc: 'Risks, obligations, governing law, and terms.',
    iconClass: 'text-domain-legal', hoverClass: 'group-hover:border-domain-legal/40', glowClass: 'group-hover:bg-domain-legal/8',
  },
  {
    icon: 'hub', name: 'General Analyze',
    desc: 'Takeaways, topics, entities, and action items.',
    iconClass: 'text-gold-primary', hoverClass: 'group-hover:border-gold-primary/40', glowClass: 'group-hover:bg-gold-primary/8',
  },
  {
    icon: 'difference', name: 'Compare',
    desc: 'Diff two documents clause by clause.',
    iconClass: 'text-domain-medical', hoverClass: 'group-hover:border-domain-medical/40', glowClass: 'group-hover:bg-domain-medical/8',
  },
  {
    icon: 'code', name: 'Code Suite',
    desc: 'Security findings and code quality metrics.',
    iconClass: 'text-domain-code', hoverClass: 'group-hover:border-domain-code/40', glowClass: 'group-hover:bg-domain-code/8',
  },
  {
    icon: 'verified', name: 'Confidence Audit',
    desc: 'Deterministic hallucination-risk evaluation.',
    iconClass: 'text-conf-high', hoverClass: 'group-hover:border-conf-high/40', glowClass: 'group-hover:bg-conf-high/8',
  },
  {
    icon: 'radar', name: 'Domain Radar',
    desc: 'Auto-detect a document’s domain and intent.',
    iconClass: 'text-conf-amber', hoverClass: 'group-hover:border-conf-amber/40', glowClass: 'group-hover:bg-conf-amber/8',
  },
  {
    icon: 'description', name: 'Templates',
    desc: 'Launch curated workflows in one click.',
    iconClass: 'text-text-secondary', hoverClass: 'group-hover:border-border-strong', glowClass: 'group-hover:bg-white/5',
  },
] as const;

/**
 * AnalyzerShowcase — grid of every specialized engine in the suite.
 * Cards reveal in a quick stagger on scroll and lift on hover.
 */
export function AnalyzerShowcase() {
  const reduced = useReducedMotion() ?? false;

  return (
    <section id="analyzers" className="relative py-24">
      <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8">

        {/* Header */}
        <Reveal className="mx-auto mb-14 flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-sans text-xs font-medium uppercase tracking-widest text-gold-primary/80">
            One suite, many minds
          </span>
          <h2 className="font-display text-3xl font-semibold leading-tight text-text-primary sm:text-4xl">
            A specialized engine for every domain
          </h2>
          <p className="font-sans text-base leading-relaxed text-text-secondary">
            Each analyzer is purpose-built — so your documents are read by an
            expert, not a generalist.
          </p>
        </Reveal>

        {/* Grid */}
        <motion.div
          className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
          variants={gridContainer}
          initial={reduced ? 'visible' : 'hidden'}
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {ANALYZERS.map((a) => (
            <motion.div
              key={a.name}
              variants={staggerItem}
              whileHover={reduced ? undefined : { y: -4 }}
              transition={{ duration: duration.base / 1000, ease: EASE_OUT }}
            >
              <Card
                variant="default"
                noPadding
                className={cn(
                  'group relative h-full overflow-hidden p-5 transition-shadow duration-200',
                  'hover:shadow-[0_12px_32px_rgba(0,0,0,0.45)]',
                  a.hoverClass,
                )}
              >
                {/* Hover glow wash */}
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-0 opacity-0 transition-opacity duration-200 group-hover:opacity-100',
                    a.glowClass,
                  )}
                />
                <div className="relative flex flex-col gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-elevated transition-transform duration-200 group-hover:scale-110">
                    <span
                      className={cn('material-symbols-outlined text-[22px]', a.iconClass)}
                      style={{ fontVariationSettings: "'FILL' 1" }}
                      aria-hidden="true"
                    >
                      {a.icon}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <h3 className="font-sans text-sm font-semibold text-text-primary">{a.name}</h3>
                    <p className="font-sans text-xs leading-relaxed text-text-muted">{a.desc}</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
