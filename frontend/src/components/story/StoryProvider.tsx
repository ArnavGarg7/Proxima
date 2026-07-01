import type { ReactNode } from 'react';
import { StoryContext } from './StoryContext';
import { useProvideStory } from './StoryEngine';

/**
 * StoryProvider — supplies the landing narrative context. Renders no DOM of its
 * own (so the layout is untouched); must sit inside BackgroundFX so the engine
 * can read the shared FXClock.
 */
export function StoryProvider({ children }: { children: ReactNode }) {
  const story = useProvideStory();
  return <StoryContext.Provider value={story}>{children}</StoryContext.Provider>;
}
