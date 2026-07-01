import { useRef } from 'react';
import { motion } from 'framer-motion';
import { HeroEngineProvider } from './hero-engine/HeroEngineProvider';
import { useHeroEngine } from './hero-engine/HeroEngineContext';
import { useHeroEvents } from './hero-engine/heroSelectors';
import { StatusPanel } from './hero/panels/StatusPanel';
import { DocumentHeader } from './hero/panels/DocumentHeader';
import { ConfidencePanel } from './hero/panels/ConfidencePanel';
import { MetricsPanel } from './hero/panels/MetricsPanel';
import { RoutingPanel } from './hero/panels/RoutingPanel';
import { EntitiesPanel } from './hero/panels/EntitiesPanel';
import { SummaryPanel } from './hero/panels/SummaryPanel';
import { TimelinePanel } from './hero/panels/TimelinePanel';
import { UploadPanel } from './hero/panels/UploadPanel';

/**
 * HeroMockupView — composes the engine-driven panels into the Stage 5A surface.
 *
 * The body content opacity is the engine's `restartFade` MotionValue, which
 * dissolves the completed results and fades the fresh state back in across the
 * loop seam — so the restart is invisible. The mockup subscribes to the Hero
 * event bus to mirror the latest milestone onto a `data-hero-milestone`
 * attribute (written imperatively; no re-render). All data comes from heroData.
 */
function HeroMockupView() {
  const { state, restartFade } = useHeroEngine();
  const rootRef = useRef<HTMLDivElement>(null);

  useHeroEvents((event) => {
    rootRef.current?.setAttribute('data-hero-milestone', event);
  });

  return (
    <div ref={rootRef} aria-hidden="true" data-hero-state={state} className="relative select-none">
      {/* Outer ambient glow — warm gold light source */}
      <div className="absolute -inset-10 rounded-[36px] bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.13)_0%,transparent_68%)] blur-2xl" />
      {/* Secondary glow — tighter, brighter center */}
      <div className="absolute -inset-2 rounded-[28px] bg-[radial-gradient(ellipse_at_40%_30%,rgba(201,168,76,0.07)_0%,transparent_60%)] blur-lg" />

      {/* Window frame — layered shadow hierarchy */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-surface/95 shadow-[0_32px_80px_rgba(0,0,0,0.70),0_8px_24px_rgba(0,0,0,0.45),0_2px_6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-md">

        {/* Title bar — glass chrome */}
        <StatusPanel />

        {/* Body — opacity dissolves/returns across the restart seam */}
        <motion.div className="flex flex-col gap-5 p-5" style={{ opacity: restartFade }}>

          {/* Document header */}
          <DocumentHeader />

          {/* Confidence + metrics row */}
          <div className="grid grid-cols-[auto_1fr] gap-4">
            <ConfidencePanel />
            <MetricsPanel />
          </div>

          {/* Detected domains */}
          <RoutingPanel />

          {/* Extracted entities */}
          <EntitiesPanel />

          {/* Generated summary */}
          <SummaryPanel />

          {/* Pipeline timeline */}
          <TimelinePanel />

          {/* Upload footer — recessed panel */}
          <UploadPanel />

        </motion.div>
      </div>
    </div>
  );
}

/**
 * HeroMockup — a faux product surface that previews what Proxima does.
 *
 * Stage 5B.4–5B.5 completes the synchronized demo: a believable end-to-end AI
 * workflow (upload → routing → analysis → confidence → extraction → summary →
 * complete → seamless restart), every transition orchestrated by the Hero
 * engine off the shared FXClock. The whole panel is aria-hidden so screen
 * readers skip the mock data.
 */
export function HeroMockup() {
  return (
    <HeroEngineProvider>
      <HeroMockupView />
    </HeroEngineProvider>
  );
}
