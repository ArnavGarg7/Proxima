import { useNavigate } from 'react-router-dom';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import type { Citation } from '@/hooks/useIntelligenceStream';

interface EvidencePanelProps {
  citation: Citation | null;
}

/**
 * EvidencePanel — shows the provenance of the selected citation (document, page,
 * evidence snippet). All data comes from the citation payload; no extra request
 * is made and no internal identifiers or model details are exposed.
 */
export function EvidencePanel({ citation }: EvidencePanelProps) {
  const navigate = useNavigate();

  if (!citation) {
    return (
      <Panel title="Evidence">
        <p className="font-sans text-sm leading-relaxed text-text-muted">
          Select a citation in the answer to view the source evidence.
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Evidence">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined mt-0.5 text-[18px] text-gold-primary" aria-hidden="true">
            description
          </span>
          <div className="min-w-0">
            <div className="truncate font-sans text-sm font-semibold text-text-primary" title={citation.document_title}>
              {citation.document_title}
            </div>
            <div className="font-sans text-xs text-text-muted">
              Page {citation.page_number} · {citation.ref_key}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-void p-3">
          <p className="font-serif text-xs italic leading-relaxed text-text-secondary">
            &ldquo;{citation.snippet}&rdquo;
          </p>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate(`/ask?document_id=${citation.document_id}`)}
          leftIcon={<span className="material-symbols-outlined text-[16px]" aria-hidden="true">quiz</span>}
        >
          Ask about this document
        </Button>
      </div>
    </Panel>
  );
}
