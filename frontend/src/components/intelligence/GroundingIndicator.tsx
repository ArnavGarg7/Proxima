import { ConfidenceRing, InspectorStat } from '@/components/analysis';
import { Badge } from '@/components/ui/Badge';
import { Panel } from '@/components/ui/Panel';
import type { GroundingEval, QheEval } from '@/hooks/useIntelligenceStream';

const STATUS: Record<string, { label: string; variant: 'success' | 'warning' | 'error' }> = {
  grounded: { label: 'Grounded', variant: 'success' },
  unverified: { label: 'Unverified', variant: 'warning' },
  insufficient_evidence: { label: 'Insufficient evidence', variant: 'error' },
};

const pct = (v: number) => `${Math.round((v || 0) * 100)}%`;

interface GroundingIndicatorProps {
  grounding: GroundingEval | null;
  qhe: QheEval | null;
  citationCount: number;
}

/**
 * GroundingIndicator — the trust companion. Shows the grounding score/status and
 * supporting metrics. When the answer reports insufficient evidence, the score
 * is deliberately not presented as strong confidence.
 */
export function GroundingIndicator({ grounding, qhe, citationCount }: GroundingIndicatorProps) {
  if (!grounding) return null;
  const status = STATUS[grounding.grounding_status] ?? { label: grounding.grounding_status, variant: 'warning' as const };
  const insufficient = grounding.insufficient_evidence;

  return (
    <Panel title="Grounding">
      <div className="flex flex-col items-center gap-3">
        {insufficient ? (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <span className="material-symbols-outlined text-[32px] text-conf-critical" aria-hidden="true">
              gpp_maybe
            </span>
            <Badge variant="error" size="md">Insufficient evidence</Badge>
            <p className="max-w-[220px] font-sans text-xs leading-relaxed text-text-muted">
              The answer reports that the retrieved documents don&apos;t contain enough information.
            </p>
          </div>
        ) : (
          <>
            <ConfidenceRing value={grounding.grounding_score} size="md" />
            <Badge variant={status.variant} size="md">{status.label}</Badge>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <InspectorStat icon="verified" label="Citation validity" value={pct(grounding.citation_validity)} />
        <InspectorStat icon="fact_check" label="Evidence coverage" value={pct(grounding.evidence_coverage)} />
        <InspectorStat icon="format_quote" label="Citations" value={citationCount} />
        <InspectorStat icon="error_outline" label="Invalid references" value={grounding.invalid_references?.length ?? 0} />
        {qhe && <InspectorStat icon="insights" label="Quality" value={qhe.quality_classification} />}
      </div>
    </Panel>
  );
}
