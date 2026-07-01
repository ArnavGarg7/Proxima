import type { ReactNode } from 'react';
import { InteractionContext } from './InteractionContext';
import { useProvideInteraction } from './InteractionEngine';

/**
 * InteractionProvider — supplies the global interaction model to the app. Renders
 * no DOM of its own; mount it once near the root so every interactive component
 * can consume the one shared pointer source via the interaction hooks.
 */
export function InteractionProvider({ children }: { children: ReactNode }) {
  const interaction = useProvideInteraction();
  return (
    <InteractionContext.Provider value={interaction}>
      {children}
    </InteractionContext.Provider>
  );
}
