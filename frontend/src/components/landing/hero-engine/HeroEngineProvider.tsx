import type { ReactNode } from 'react';
import { HeroEngineContext } from './HeroEngineContext';
import { useProvideHeroEngine } from './HeroEngine';

/**
 * HeroEngineProvider — supplies the Hero orchestration context to the mockup
 * subtree. Renders no DOM of its own; must sit inside BackgroundFX so the
 * engine can consume the shared FXClock.
 */
export function HeroEngineProvider({ children }: { children: ReactNode }) {
  const engine = useProvideHeroEngine();
  return (
    <HeroEngineContext.Provider value={engine}>
      {children}
    </HeroEngineContext.Provider>
  );
}
