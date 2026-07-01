import { useRef } from 'react';
import { useMotionValueEvent, type MotionValue } from 'framer-motion';

interface HeroCounterProps {
  /** Source value, typically 0–1. */
  value: MotionValue<number>;
  /** Multiplier applied before rounding (e.g. 100 for a percentage). */
  scale?: number;
  /** Appended after the number (e.g. "%"). */
  suffix?: string;
}

/**
 * HeroCounter — renders a number that tracks a MotionValue by writing to the
 * DOM imperatively (textContent). It never triggers a React re-render, so the
 * upload percentage can count every frame for free.
 */
export function HeroCounter({ value, scale = 1, suffix = '' }: HeroCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useMotionValueEvent(value, 'change', (v) => {
    if (ref.current) ref.current.textContent = `${Math.round(v * scale)}${suffix}`;
  });

  return <span ref={ref}>{`${Math.round(value.get() * scale)}${suffix}`}</span>;
}
