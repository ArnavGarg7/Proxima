import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { cn } from '@/lib/cn';
import { Checkbox } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import type { IntelligenceScope } from '@/hooks/useIntelligenceStream';

interface DocItem {
  id: string;
  title: string;
  status: string;
}

async function fetchDocuments(): Promise<DocItem[]> {
  const res = await api.get('/api/documents/');
  return Array.isArray(res.data) ? res.data : [];
}

interface ScopeSelectorProps {
  scope: IntelligenceScope;
  onChange: (s: IntelligenceScope) => void;
  activeDocumentId?: string | null;
  disabled?: boolean;
}

type Mode = 'document' | 'selected' | 'library';

/**
 * ScopeSelector — chooses the retrieval scope for a question. Only scopes the
 * backend actually supports are exposed: this document, selected documents, and
 * the entire library. (Project scope is intentionally omitted — projects are not
 * populated.) The backend remains the ownership authority; the client only
 * narrows the owned set.
 */
export function ScopeSelector({ scope, onChange, activeDocumentId, disabled }: ScopeSelectorProps) {
  const { data: docs = [], isLoading } = useQuery({ queryKey: ['documents'], queryFn: fetchDocuments });
  const processed = docs.filter((d) => d.status === 'processed');
  const activeDoc = activeDocumentId ? processed.find((d) => d.id === activeDocumentId) : undefined;

  const options: { mode: Mode; label: string; icon: string; enabled: boolean }[] = [
    { mode: 'document', label: 'This document', icon: 'description', enabled: !!activeDoc },
    { mode: 'selected', label: 'Selected', icon: 'library_books', enabled: processed.length > 0 },
    { mode: 'library', label: 'Entire library', icon: 'inventory_2', enabled: processed.length > 0 },
  ];

  const selectMode = (mode: Mode) => {
    if (disabled) return;
    if (mode === 'document' && activeDoc) onChange({ mode: 'document', documentId: activeDoc.id });
    else if (mode === 'selected') onChange({ mode: 'selected', documentIds: scope.mode === 'selected' ? scope.documentIds : [] });
    else if (mode === 'library') onChange({ mode: 'library' });
  };

  const toggleDoc = (id: string) => {
    if (scope.mode !== 'selected') return;
    const set = new Set(scope.documentIds);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    onChange({ mode: 'selected', documentIds: [...set] });
  };

  return (
    <div className="flex flex-col gap-3">
      <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">Scope</span>

      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt.mode}
            type="button"
            disabled={disabled || !opt.enabled}
            onClick={() => selectMode(opt.mode)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-sans text-xs font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
              'disabled:cursor-not-allowed disabled:opacity-40',
              scope.mode === opt.mode
                ? 'border-gold-primary/50 bg-gold-primary/10 text-gold-primary'
                : 'border-border bg-surface text-text-secondary hover:border-border-strong hover:text-text-primary',
            )}
          >
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">{opt.icon}</span>
            {opt.label}
          </button>
        ))}
      </div>

      {scope.mode === 'document' && activeDoc && (
        <p className="truncate font-sans text-xs text-text-muted" title={activeDoc.title}>
          Asking about <span className="text-text-secondary">{activeDoc.title}</span>
        </p>
      )}

      {scope.mode === 'library' && (
        <p className="font-sans text-xs text-text-muted">
          Searching all {processed.length} processed document{processed.length === 1 ? '' : 's'} in your library.
        </p>
      )}

      {scope.mode === 'selected' && (
        <div className="flex max-h-56 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-surface p-2">
          {isLoading ? (
            <div className="flex items-center gap-2 px-1 py-2 text-text-muted">
              <Spinner size="xs" /> <span className="font-sans text-xs">Loading documents…</span>
            </div>
          ) : processed.length === 0 ? (
            <p className="px-1 py-2 font-sans text-xs text-text-muted">No processed documents yet.</p>
          ) : (
            processed.map((d) => (
              <Checkbox
                key={d.id}
                label={d.title}
                checked={scope.documentIds.includes(d.id)}
                onChange={() => toggleDoc(d.id)}
                disabled={disabled}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
