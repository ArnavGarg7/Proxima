/**
 * heroSelectors.ts — lightweight selectors + event hooks over the Hero engine.
 *
 * Panels consume these instead of the full engine so they only re-render when
 * their own slice of state changes (a phase boundary). Continuous values stay
 * MotionValues, which never trigger re-renders. The event hooks let panels react
 * to semantic milestones once, instead of polling phase equality every frame.
 */
import { useEffect, useRef } from 'react';
import type { MotionValue } from 'framer-motion';
import { useHeroEngine } from './HeroEngineContext';
import { HeroState, HERO_STATE_ORDER, type HeroEvent } from './heroState';
import { heroData } from './heroData';

/** Current high-level status label (handles the Restart seam as "Complete"). */
export function useHeroStatus(): string {
  const { state } = useHeroEngine();
  if (state === HeroState.Restart) return heroData.status.complete;
  return (heroData.status as Record<string, string>)[state] ?? heroData.status.idle;
}

/** The per-phase progress MotionValue. */
export function useHeroProgress(): MotionValue<number> {
  return useHeroEngine().progress;
}

/** Upload-panel state. */
export function useHeroUpload() {
  const { state, uploadProgress } = useHeroEngine();
  const active   = state === HeroState.Upload;
  // Complete for every state after Upload — including the Complete/Restart
  // segments (whose order index is not a simple "> Upload" comparison).
  const complete = state !== HeroState.Idle && state !== HeroState.Upload;
  const label    = complete
    ? heroData.upload.completeLabel
    : active
      ? `${heroData.upload.uploadingLabel} ${heroData.upload.filename}`
      : heroData.upload.idleLabel;
  return { active, complete, progress: uploadProgress, label };
}

/** Routing-panel state. */
export function useHeroRouting() {
  const { state, routingProgress } = useHeroEngine();
  return {
    active:     state === HeroState.Routing,
    decided:    HERO_STATE_ORDER[state] > HERO_STATE_ORDER[HeroState.Routing],
    progress:   routingProgress,
    candidates: heroData.routing.domains,
    primary:    heroData.routing.primary,
  };
}

/** Confidence-panel state (ring draw + score + label). */
export function useHeroConfidence() {
  const { confidenceProgress } = useHeroEngine();
  return {
    progress: confidenceProgress,
    score: heroData.confidence.score,
    label: heroData.confidence.label,
  };
}

/** Metrics-panel state (counters run with confidence). */
export function useHeroMetrics() {
  const { confidenceProgress } = useHeroEngine();
  return {
    progress: confidenceProgress,
    entities: heroData.metrics.entities,
    sections: heroData.metrics.sections,
    riskFlags: heroData.metrics.riskFlags,
  };
}

/** Entity-extraction state. */
export function useHeroExtraction() {
  const { extractionProgress } = useHeroEngine();
  return { progress: extractionProgress, items: heroData.entities };
}

/** Summary-panel state. */
export function useHeroSummary() {
  const { summaryProgress } = useHeroEngine();
  return { progress: summaryProgress, sentences: heroData.summary };
}

/** Document-header state. */
export function useHeroDocument() {
  const { state } = useHeroEngine();
  return { ...heroData.document, routing: state === HeroState.Routing };
}

/** Timeline nodes with done / active / pending status for the current state. */
export function useHeroTimeline() {
  const { state } = useHeroEngine();
  const current = HERO_STATE_ORDER[state];
  return heroData.timeline.map((node) => {
    const order = HERO_STATE_ORDER[node.phase as HeroState];
    const status: 'done' | 'active' | 'pending' =
      current > order ? 'done' : current === order ? 'active' : 'pending';
    return { label: node.label, status };
  });
}

/** Subscribe to a single semantic milestone (one-shot reaction). */
export function useHeroEvent(event: HeroEvent, handler: () => void) {
  const { subscribe } = useHeroEngine();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(
    () => subscribe((e) => { if (e === event) ref.current(); }),
    [subscribe, event],
  );
}

/** Subscribe to every semantic milestone (handler receives the event name). */
export function useHeroEvents(handler: (event: HeroEvent) => void) {
  const { subscribe } = useHeroEngine();
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => subscribe((e) => ref.current(e)), [subscribe]);
}
