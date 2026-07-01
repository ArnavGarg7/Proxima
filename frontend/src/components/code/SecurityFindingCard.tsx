import { IntelligenceCard } from '@/types/code';
import { EvidenceSnippet } from './EvidenceSnippet';

interface SecurityFindingCardProps {
  onLineClick?: (line: number) => void;
  finding: IntelligenceCard;
}

import { useState } from 'react';

export function SecurityFindingCard({ finding, onLineClick }: SecurityFindingCardProps) {
  const [copiedRec, setCopiedRec] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const isCritical = finding.severity.toLowerCase() === 'critical';
  const isHigh = finding.severity.toLowerCase() === 'high';
  const isMedium = finding.severity.toLowerCase() === 'medium';
  
  const severityClasses = isCritical ? 'bg-conf-critical/15 text-conf-critical border-conf-critical/30' : isHigh 
    ? 'bg-conf-amber/15 text-conf-amber border-conf-amber/30'
    : isMedium 
      ? 'bg-gold-primary/15 text-gold-primary border-gold-primary/30'
      : 'bg-text-muted/15 text-text-muted border-text-muted/30';
      
  return (
    <div className="bg-surface border border-border rounded-xl p-5 shadow-card">
      <div className="flex items-start justify-between mb-3">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${severityClasses}`}>
          {finding.severity}
        </span>
        {finding.line > 0 && (
          <button type="button" onClick={() => onLineClick?.(finding.line)} className="font-mono text-xs text-text-muted hover:text-gold-primary transition-colors cursor-pointer outline-none">Line {finding.line}</button>
        )}
      </div>
      <h4 className="font-sans text-base font-semibold text-text-primary mb-2">{finding.title}</h4>
      <p className="font-sans text-sm text-text-secondary mb-4">{finding.reason}</p>
      
      {finding.evidence_old && (
        <div className="mb-4">
          <div className="relative group/snippet">
            <EvidenceSnippet code={finding.evidence_old} highlightLine={finding.line} />
            <button type="button" onClick={() => { navigator.clipboard.writeText(finding.evidence_old); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} className="absolute top-2 right-2 opacity-0 group-hover/snippet:opacity-100 transition-opacity bg-void hover:bg-black text-text-muted hover:text-text-primary px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">{copiedCode ? 'check' : 'content_copy'}</span>
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
          </div>
        </div>
      )}
      
      <div className="bg-conf-high/5 p-4 rounded-lg border border-conf-high/20 relative group/rec">
        <div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-conf-high text-[16px]">check_circle</span>
          <span className="font-sans text-xs font-bold text-conf-high uppercase tracking-wider">Recommendation</span>
          <button type="button" onClick={() => { navigator.clipboard.writeText(finding.recommendation); setCopiedRec(true); setTimeout(() => setCopiedRec(false), 2000); }} className="ml-auto opacity-0 group-hover/rec:opacity-100 transition-opacity bg-void hover:bg-black text-text-muted hover:text-text-primary px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">{copiedRec ? 'check' : 'content_copy'}</span>
            {copiedRec ? 'Copied' : 'Copy'}
          </button>
        </div>
        <span className="font-sans text-sm text-text-primary">{finding.recommendation}</span>
      </div>
    </div>
  );
}
