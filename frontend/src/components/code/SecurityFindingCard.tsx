import { IntelligenceCard } from '@/types/code';
import { EvidenceSnippet } from './EvidenceSnippet';

interface SecurityFindingCardProps {
  finding: IntelligenceCard;
}

export function SecurityFindingCard({ finding }: SecurityFindingCardProps) {
  const isHigh = finding.severity.toLowerCase() === 'high' || finding.severity.toLowerCase() === 'critical';
  const isMedium = finding.severity.toLowerCase() === 'medium';
  
  const severityClasses = isHigh 
    ? 'bg-conf-critical/15 text-conf-critical border-conf-critical/30'
    : isMedium 
      ? 'bg-conf-amber/15 text-conf-amber border-conf-amber/30'
      : 'bg-conf-low/15 text-conf-low border-conf-low/30';
      
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityClasses}`}>
          {finding.severity}
        </span>
        {finding.line > 0 && (
          <span className="font-mono text-xs text-text-muted">Line {finding.line}</span>
        )}
      </div>
      <h4 className="font-sans text-base font-semibold text-text-primary mb-2">{finding.title}</h4>
      <p className="font-sans text-sm text-text-secondary mb-4">{finding.reason}</p>
      
      {finding.evidence_old && (
        <div className="mb-4">
          <EvidenceSnippet code={finding.evidence_old} highlightLine={finding.line} />
        </div>
      )}
      
      <div className="bg-elevated p-3 rounded-lg border border-border">
        <span className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Recommendation</span>
        <span className="font-sans text-sm text-text-primary">{finding.recommendation}</span>
      </div>
    </div>
  );
}
