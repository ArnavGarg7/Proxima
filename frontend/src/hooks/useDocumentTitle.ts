import { useEffect } from 'react';

const BRAND         = 'Proxima';
const DEFAULT_TITLE = 'Proxima | AI-Native Document Intelligence';

/**
 * useDocumentTitle — sets document.title for the current page.
 * Resets to the default app title on unmount.
 *
 * @param page — page name shown as "Page | Proxima". Omit for the default title.
 */
export function useDocumentTitle(page?: string) {
  useEffect(() => {
    document.title = page ? `${page} | ${BRAND}` : DEFAULT_TITLE;
    return () => { document.title = DEFAULT_TITLE; };
  }, [page]);
}
