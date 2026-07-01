import type { ReactNode } from 'react';
import { ProductShowcaseContext } from './ProductShowcaseContext';
import { useProvideProductShowcase } from './ProductShowcaseEngine';

/**
 * ProductShowcaseProvider — supplies the shared showcase engine. Renders no DOM
 * of its own; must sit inside BackgroundFX so the engine can consume the shared
 * FXClock. Mount once around the area where showcases live (the landing).
 */
export function ProductShowcaseProvider({ children }: { children: ReactNode }) {
  const showcase = useProvideProductShowcase();
  return (
    <ProductShowcaseContext.Provider value={showcase}>
      {children}
    </ProductShowcaseContext.Provider>
  );
}
