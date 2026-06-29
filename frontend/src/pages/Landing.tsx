import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/Button';
import { LandingBackground } from '@/components/landing/LandingBackground';
import { LandingNav } from '@/components/landing/LandingNav';
import { HeroMockup } from '@/components/landing/HeroMockup';
import { FeatureShowcase } from '@/components/landing/FeatureShowcase';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { AnalyzerShowcase } from '@/components/landing/AnalyzerShowcase';
import { Reveal } from '@/components/landing/Reveal';
import { staggerContainer, staggerItem, EASE_OUT } from '@/components/landing/landingMotion';
import { duration } from '@/theme/motion';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/* Action verbs shown beneath the hero headline */
const HERO_VERBS = ['Upload', 'Analyze', 'Compare', 'Audit'] as const;

/* "Built for" capability strip */
const BUILT_FOR = ['Legal', 'Healthcare', 'Clinical', 'Research', 'Compliance'] as const;

/* Footer link columns */
const FOOTER_COLUMNS = [
  { title: 'Product',   links: ['Workspace', 'Templates', 'Analyzers', 'Workflow'] },
  { title: 'Solutions', links: ['Legal', 'Healthcare', 'Clinical', 'Research'] },
  { title: 'Company',   links: ['About', 'Careers', 'Contact', 'Security'] },
  { title: 'Legal',     links: ['Privacy', 'Terms', 'Compliance', 'Status'] },
] as const;

export default function Landing() {
  useDocumentTitle();
  const reduced = useReducedMotion() ?? false;

  /* ── Preserved auth logic — Google OAuth PKCE initiated by the server ──── */
  const handleLogin = () => {
    window.location.href = `${api.defaults.baseURL}/api/auth/google`;
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const heroInitial = reduced ? 'visible' : 'hidden';

  return (
    <div id="top" className="relative min-h-screen w-full overflow-x-hidden">
      <LandingBackground />
      <LandingNav onStart={handleLogin} />

      {/* ══ Hero ════════════════════════════════════════════════════════════ */}
      <section className="relative flex min-h-[100svh] items-center pb-20 pt-32 sm:pt-36">
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">

            {/* Left — message (staggered entrance) */}
            <motion.div
              className="flex flex-col items-start gap-7"
              variants={staggerContainer}
              initial={heroInitial}
              animate="visible"
            >
              {/* Eyebrow pill */}
              <motion.span
                variants={staggerItem}
                className="inline-flex items-center gap-2 rounded-full border border-gold-primary/30 bg-gold-primary/8 px-3 py-1.5 shadow-[0_0_16px_rgba(201,168,76,0.12),inset_0_1px_0_rgba(255,255,255,0.06)]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-gold-primary shadow-[0_0_4px_rgba(201,168,76,0.8)]" />
                <span className="font-sans text-xs font-medium uppercase tracking-widest text-gold-primary">
                  AI Intelligence Suite
                </span>
              </motion.span>

              {/* Headline */}
              <motion.h1
                variants={staggerItem}
                className="font-display text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-text-primary sm:text-6xl"
              >
                Your documents become
                <br />
                <span className="text-gold-primary">structured intelligence.</span>
              </motion.h1>

              {/* Sub-copy */}
              <motion.p
                variants={staggerItem}
                className="max-w-xl font-sans text-lg leading-relaxed text-text-secondary"
              >
                Proxima reads, routes, and analyzes your documents with specialized
                AI — turning unstructured files into scored, exportable insight.
              </motion.p>

              {/* Verb rhythm */}
              <motion.div variants={staggerItem} className="flex flex-wrap items-center gap-3">
                {HERO_VERBS.map((verb, i) => (
                  <React.Fragment key={verb}>
                    {i > 0 && (
                      <span className="h-1 w-1 rounded-full bg-gold-primary/50" aria-hidden="true" />
                    )}
                    <span className="font-sans text-sm font-medium uppercase tracking-widest text-text-secondary">
                      {verb}
                    </span>
                  </React.Fragment>
                ))}
              </motion.div>

              {/* CTAs */}
              <motion.div variants={staggerItem} className="mt-1 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full sm:w-auto motion-safe:hover:shadow-[0_0_24px_rgba(201,168,76,0.35)]"
                  onClick={handleLogin}
                  rightIcon={
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  }
                >
                  Start Analysis
                </Button>
                <Button variant="outline" size="lg" className="w-full sm:w-auto" onClick={scrollToFeatures}>
                  Explore Capabilities
                </Button>
              </motion.div>
            </motion.div>

            {/* Right — product mockup (entrance + perpetual float) */}
            <motion.div
              className="relative lg:pl-4"
              initial={reduced ? { opacity: 1, x: 0 } : { opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={reduced ? { duration: 0 } : { duration: duration.enter / 1000, ease: EASE_OUT, delay: duration.base / 1000 }}
            >
              <motion.div
                animate={reduced ? undefined : { y: [0, -10, 0] }}
                transition={reduced ? undefined : { duration: 7, ease: 'easeInOut', repeat: Infinity }}
              >
                <HeroMockup />
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══ Capability strip / social proof ═════════════════════════════════ */}
      <section id="solutions" className="relative border-y border-border/60 bg-surface/30 py-10 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1400px] px-6 sm:px-8">
          <Reveal className="flex flex-col items-center gap-6 sm:flex-row sm:justify-between">
            <span className="font-sans text-xs font-medium uppercase tracking-widest text-text-muted">
              Built for teams in
            </span>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
              {BUILT_FOR.map((item) => (
                <span key={item} className="font-display text-lg font-semibold text-text-secondary/70">
                  {item}
                </span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Feature showcase (large rhythm) ═════════════════════════════════ */}
      <FeatureShowcase />

      {/* ══ Workflow (medium rhythm) ════════════════════════════════════════ */}
      <WorkflowSection />

      {/* ══ Analyzer showcase ═══════════════════════════════════════════════ */}
      <AnalyzerShowcase />

      {/* ══ Final CTA (large rhythm) ════════════════════════════════════════ */}
      <section className="relative py-32">
        <div className="mx-auto w-full max-w-[1000px] px-6 sm:px-8">
          <Reveal>
            <div className="group relative overflow-hidden rounded-3xl border border-border bg-surface/60 px-8 py-16 text-center backdrop-blur-sm transition-colors duration-300 hover:border-gold-primary/30 sm:px-16">
              {/* Inner glow — intensifies on hover */}
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.12)_0%,transparent_70%)] opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              />
              <div className="relative flex flex-col items-center gap-6">
                <h2 className="font-display text-4xl font-semibold leading-tight text-text-primary sm:text-5xl">
                  Ready to transform
                  <br />
                  your documents?
                </h2>
                <p className="max-w-lg font-sans text-base leading-relaxed text-text-secondary">
                  Start analyzing in seconds. No setup, no friction — just upload and
                  let Proxima do the reading.
                </p>
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleLogin}
                  rightIcon={
                    <span className="material-symbols-outlined text-[17px]" aria-hidden="true">
                      arrow_forward
                    </span>
                  }
                >
                  Start Using Proxima
                </Button>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ Footer ══════════════════════════════════════════════════════════ */}
      <footer className="relative border-t border-border bg-surface/40 backdrop-blur-sm">
        <div className="mx-auto w-full max-w-[1400px] px-6 py-16 sm:px-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 sm:gap-10 lg:grid-cols-6">

            {/* Brand block */}
            <div className="col-span-2 flex flex-col gap-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-gold-bright to-gold-dim">
                  <span
                    className="material-symbols-outlined text-[16px] text-void"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                    aria-hidden="true"
                  >
                    blur_on
                  </span>
                </span>
                <span className="font-display text-lg font-semibold text-text-primary">Proxima</span>
              </div>
              <p className="max-w-xs font-sans text-sm leading-relaxed text-text-muted">
                AI-native document intelligence. Upload, analyze, and audit with
                confidence.
              </p>
            </div>

            {/* Link columns */}
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <span className="font-sans text-xs font-medium uppercase tracking-widest text-text-muted">
                  {col.title}
                </span>
                <ul className="flex flex-col gap-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <span className="cursor-default font-sans text-sm text-text-secondary transition-colors duration-150 hover:text-text-primary">
                        {link}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
            <span className="font-sans text-xs text-text-muted">
              © {new Date().getFullYear()} Proxima. All rights reserved.
            </span>
            <span className="font-mono text-xs text-text-muted">v4.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
