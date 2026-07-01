const fs = require('fs');
const codeSuitePath = 'src/pages/CodeSuite.tsx';
const securityCardPath = 'src/components/code/SecurityFindingCard.tsx';
const ringPath = 'src/components/analysis/ConfidenceRing.tsx';

let codeSuite = fs.readFileSync(codeSuitePath, 'utf8');
let securityCard = fs.readFileSync(securityCardPath, 'utf8');
let ring = fs.readFileSync(ringPath, 'utf8');

// 1. Code snippet sync
codeSuite = codeSuite.replace(
  'const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);',
  'const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);\n  const [activeLine, setActiveLine] = useState<number | null>(null);'
);

codeSuite = codeSuite.replace(
  'const handleReset = () => {',
  'const handleReset = () => {\n    setActiveLine(null);'
);

codeSuite = codeSuite.replace(
  'onSnippetChange={setSnippet}',
  'onSnippetChange={setSnippet}\n      activeLine={activeLine}'
);

codeSuite = codeSuite.replace(
  /<SecurityFindingCard key={i} finding={f} \/>/g,
  '<SecurityFindingCard key={i} finding={f} onLineClick={setActiveLine} />'
);

// update CodeEditorSidebar signature
codeSuite = codeSuite.replace(
  'mode: AnalysisMode;',
  'mode: AnalysisMode;\n  activeLine?: number | null;'
);
codeSuite = codeSuite.replace(
  'onRunMode,\n}: {',
  'onRunMode,\n  activeLine,\n}: {'
);

codeSuite = codeSuite.replace(
  'import { useState, useEffect } from \'react\';',
  'import { useState, useEffect, useRef } from \'react\';'
);

codeSuite = codeSuite.replace(
  'const modes: AnalysisMode[] = [\'review\', \'explain\', \'docs\', \'optimize\', \'security\'];',
  `const modes: AnalysisMode[] = ['review', 'explain', 'docs', 'optimize', 'security'];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeLine && textareaRef.current) {
      const lines = snippet.split('\\n');
      let startPos = 0;
      for (let i = 0; i < activeLine - 1; i++) {
        startPos += lines[i].length + 1;
      }
      const endPos = startPos + (lines[activeLine - 1]?.length || 0);
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(startPos, endPos);
      const lineHeight = 18;
      textareaRef.current.scrollTop = (activeLine - 1) * lineHeight - (textareaRef.current.clientHeight / 2);
    }
  }, [activeLine, snippet]);`
);
codeSuite = codeSuite.replace(
  '<textarea',
  '<textarea\n          ref={textareaRef}'
);

// 2. Severity Colors (severityStyle in CodeSuite)
codeSuite = codeSuite.replace(
  'case \'high\':   return \'border-conf-critical/30 bg-conf-critical/15 text-conf-critical\';',
  'case \'critical\': return \'border-conf-critical/30 bg-conf-critical/15 text-conf-critical\';\n    case \'high\': return \'border-conf-amber/30 bg-conf-amber/15 text-conf-amber\';'
);
codeSuite = codeSuite.replace(
  'case \'medium\': return \'border-conf-amber/30 bg-conf-amber/15 text-conf-amber\';',
  'case \'medium\': return \'border-gold-primary/30 bg-gold-primary/15 text-gold-primary\';'
);
codeSuite = codeSuite.replace(
  'default:       return \'border-conf-low/30 bg-conf-low/15 text-conf-low\';',
  'case \'low\': return \'border-text-muted/30 bg-text-muted/15 text-text-muted\';\n    default: return \'border-void-light/30 bg-void-light/15 text-text-secondary\';'
);

// 4. Radar panel title
codeSuite = codeSuite.replace(
  '<Panel title="Quality Radar">',
  '<Panel title="Quality Breakdown">'
);

// 6. Engine panel add Mode
codeSuite = codeSuite.replace(
  '<InspectorStat icon="bolt"      label="Analyzer" value="Code Suite"  />',
  '<InspectorStat icon="bolt"      label="Analyzer" value="Code Suite"  />\n              <InspectorStat icon="tune"      label="Mode" value={mode.charAt(0).toUpperCase() + mode.slice(1)}  />'
);

// 8. Empty findings for Optimize
codeSuite = codeSuite.replace(
  '{reviewResult.performance_findings && reviewResult.performance_findings.length > 0 && (',
  '{reviewResult.performance_findings && ('
);
codeSuite = codeSuite.replace(
  '{reviewResult.security_findings && reviewResult.security_findings.length > 0 && (',
  '{reviewResult.security_findings && ('
);

// Update CodeSuite if length is 0 to show empty state
codeSuite = codeSuite.replace(
  '{reviewResult.performance_findings.map((f, i) => (',
  `{reviewResult.performance_findings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center bg-elevated/50 rounded-lg border border-border/50">
                      <span className="material-symbols-outlined text-conf-high text-3xl mb-2">check_circle</span>
                      <span className="font-sans text-sm font-medium text-text-primary">No optimization opportunities detected.</span>
                      <span className="font-sans text-xs text-text-muted mt-1">Great job.</span>
                    </div>
                  ) : reviewResult.performance_findings.map((f, i) => (`
);

codeSuite = codeSuite.replace(
  '{reviewResult.security_findings.map((f, i) => (',
  `{reviewResult.security_findings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center bg-elevated/50 rounded-lg border border-border/50">
                      <span className="material-symbols-outlined text-conf-high text-3xl mb-2">verified_user</span>
                      <span className="font-sans text-sm font-medium text-text-primary">No security vulnerabilities detected.</span>
                      <span className="font-sans text-xs text-text-muted mt-1">Your code is secure.</span>
                    </div>
                  ) : reviewResult.security_findings.map((f, i) => (`
);


// SecurityFindingCard modifications
securityCard = securityCard.replace(
  'interface SecurityFindingCardProps {',
  'interface SecurityFindingCardProps {\n  onLineClick?: (line: number) => void;'
);
securityCard = securityCard.replace(
  'export function SecurityFindingCard({ finding }: SecurityFindingCardProps) {',
  'import { useState } from \'react\';\n\nexport function SecurityFindingCard({ finding, onLineClick }: SecurityFindingCardProps) {\n  const [copiedRec, setCopiedRec] = useState(false);\n  const [copiedCode, setCopiedCode] = useState(false);'
);

securityCard = securityCard.replace(
  '<span className="font-mono text-xs text-text-muted">Line {finding.line}</span>',
  '<button type="button" onClick={() => onLineClick?.(finding.line)} className="font-mono text-xs text-text-muted hover:text-gold-primary transition-colors cursor-pointer outline-none">Line {finding.line}</button>'
);

// Recommendation visual separation
securityCard = securityCard.replace(
  '<div className="bg-elevated p-3 rounded-lg border border-border">',
  '<div className="bg-conf-high/5 p-4 rounded-lg border border-conf-high/20 relative group/rec">'
);
securityCard = securityCard.replace(
  '<span className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider block mb-1">Recommendation</span>',
  `<div className="flex items-center gap-2 mb-2">
          <span className="material-symbols-outlined text-conf-high text-[16px]">check_circle</span>
          <span className="font-sans text-xs font-bold text-conf-high uppercase tracking-wider">Recommendation</span>
          <button type="button" onClick={() => { navigator.clipboard.writeText(finding.recommendation); setCopiedRec(true); setTimeout(() => setCopiedRec(false), 2000); }} className="ml-auto opacity-0 group-hover/rec:opacity-100 transition-opacity bg-void hover:bg-black text-text-muted hover:text-text-primary px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">{copiedRec ? 'check' : 'content_copy'}</span>
            {copiedRec ? 'Copied' : 'Copy'}
          </button>
        </div>`
);

// copy snippet button
securityCard = securityCard.replace(
  '<EvidenceSnippet code={finding.evidence_old} highlightLine={finding.line} />',
  `<div className="relative group/snippet">
            <EvidenceSnippet code={finding.evidence_old} highlightLine={finding.line} />
            <button type="button" onClick={() => { navigator.clipboard.writeText(finding.evidence_old); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2000); }} className="absolute top-2 right-2 opacity-0 group-hover/snippet:opacity-100 transition-opacity bg-void hover:bg-black text-text-muted hover:text-text-primary px-2 py-1 rounded text-[10px] uppercase font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">{copiedCode ? 'check' : 'content_copy'}</span>
              {copiedCode ? 'Copied' : 'Copy'}
            </button>
          </div>`
);

// Severity Colors in SecurityFindingCard
securityCard = securityCard.replace(
  'const isHigh = finding.severity.toLowerCase() === \'high\' || finding.severity.toLowerCase() === \'critical\';',
  'const isCritical = finding.severity.toLowerCase() === \'critical\';\n  const isHigh = finding.severity.toLowerCase() === \'high\';'
);
securityCard = securityCard.replace(
  /const severityClasses = isHigh[\s\S]*?: 'bg-conf-low\/15 text-conf-low border-conf-low\/30';/,
  `const severityClasses = isCritical ? 'bg-conf-critical/15 text-conf-critical border-conf-critical/30' : isHigh 
    ? 'bg-conf-amber/15 text-conf-amber border-conf-amber/30'
    : isMedium 
      ? 'bg-gold-primary/15 text-gold-primary border-gold-primary/30'
      : 'bg-text-muted/15 text-text-muted border-text-muted/30';`
);


// 3. Quality Ring
ring = ring.replace(
  '<span className="font-sans text-xs font-semibold text-text-muted mt-1">{value}</span>',
  '<span className="font-sans text-xs font-semibold text-text-muted mt-1">{value >= 90 ? \'Excellent\' : value >= 70 ? \'Good\' : value >= 50 ? \'Fair\' : \'Poor\'}</span>'
);

fs.writeFileSync(codeSuitePath, codeSuite);
fs.writeFileSync(securityCardPath, securityCard);
fs.writeFileSync(ringPath, ring);
console.log('done');
