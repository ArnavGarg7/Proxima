import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/axios';
import { diffWords } from 'diff';
import {
  AnalysisLayout,
  AnalysisHeader,
  AnalysisSidebar,
  AnalysisInspector,
  InspectorStat,
  AnalysisEmptyState,
  AnalysisLoading,
  ConfidenceRing,
  type OutlineItem,
} from '@/components/analysis';
import { Panel } from '@/components/ui/Panel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface CompareSnapshot {
  similarity_score: number;
  overall_change_level: string;
  added_sections_count: number;
  removed_sections_count: number;
  modified_sections_count: number;
  overall_risk: string;
  confidence: string;
}

interface ReviewerPriority {
  title: string;
  severity: string;
  description: string;
}

interface StructuralChange {
  change_type: string;
  heading: string;
  description: string;
}

interface SemanticChange {
  category: string;
  old_value: string;
  new_value: string;
  description: string;
}

interface RiskChange {
  title: string;
  severity: string;
  description: string;
}

interface CompareEvidence {
  label: string;
  old_excerpt: string | null;
  new_excerpt: string | null;
}

interface DocumentProfileStats {
  word_count: number;
  paragraph_count: number;
  heading_count: number;
  list_count: number;
}

interface DocumentProfileDelta {
  source: DocumentProfileStats;
  target: DocumentProfileStats;
  delta: Record<string, number>;
}

interface CompareResult {
  source_document: { id: string; title: string; text: string };
  target_document: { id: string; title: string; text: string };
  similarity_score: number;
  overall_change_level: string;
  executive_summary: string;
  change_snapshot: CompareSnapshot;
  structural_changes: StructuralChange[];
  semantic_changes: SemanticChange[];
  reviewer_priorities: ReviewerPriority[];
  risk_changes: RiskChange[];
  evidence: CompareEvidence[];
  deterministic_signals: string[];
  document_profile: DocumentProfileDelta;
}

// ── Diff highlight renderers (preserved from original) ────────────────────────

function renderOldWithHighlight(oldStr: string | null, newStr: string | null) {
  if (!oldStr) return <span className="italic opacity-50">Not present</span>;
  if (!newStr) return oldStr;
  const diffs = diffWords(oldStr, newStr);
  return diffs.filter(p => !p.added).map((part, i) => {
    if (part.removed) return <span key={i} className="bg-conf-critical/30 text-conf-critical font-bold">{part.value}</span>;
    return <span key={i}>{part.value}</span>;
  });
}

function renderNewWithHighlight(oldStr: string | null, newStr: string | null) {
  if (!newStr) return <span className="italic opacity-50">Not present</span>;
  if (!oldStr) return newStr;
  const diffs = diffWords(oldStr, newStr);
  return diffs.filter(p => !p.removed).map((part, i) => {
    if (part.added) return <span key={i} className="bg-conf-high/30 text-conf-high font-bold">{part.value}</span>;
    return <span key={i}>{part.value}</span>;
  });
}

// ── Structural change type → style tokens ─────────────────────────────────────

function structuralChangeStyle(changeType: string) {
  const t = changeType.toLowerCase();
  if (t.includes('add'))    return { icon: 'add_circle',    text: 'text-conf-high',     bg: 'bg-conf-high/10'     };
  if (t.includes('remove')) return { icon: 'remove_circle', text: 'text-conf-critical', bg: 'bg-conf-critical/10' };
  return                           { icon: 'edit',           text: 'text-conf-amber',    bg: 'bg-conf-amber/10'    };
}

function riskTone(risk: string): string {
  const r = risk.toLowerCase();
  if (r.includes('high') || r.includes('critical')) return 'text-conf-critical';
  if (r.includes('medium'))                          return 'text-conf-amber';
  return 'text-conf-high';
}

// ── Presentation-only sub-components ──────────────────────────────────────────

function SeverityIcon({ severity }: { severity: string }) {
  const s = severity.toLowerCase();
  if (s.includes('high') || s.includes('critical')) {
    return <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-conf-critical">report</span>;
  }
  if (s.includes('medium')) {
    return <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-conf-amber">warning</span>;
  }
  return <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-conf-high">info</span>;
}

function ChangeMetricCard({
  icon,
  label,
  value,
  tone = 'text-text-primary',
}: {
  icon: string;
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card noPadding className="flex flex-col items-center gap-1.5 p-4 text-center">
      <span className={`material-symbols-outlined text-[20px] ${tone}`} aria-hidden="true">{icon}</span>
      <span className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>{value}</span>
      <span className="font-sans text-xs text-text-muted">{label}</span>
    </Card>
  );
}

function SemanticChangeCard({ change }: { change: SemanticChange }) {
  return (
    <Card noPadding className="flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <span className="rounded border border-border bg-elevated px-2 py-0.5 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
          {change.category}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div
          className="flex-1 truncate rounded border border-conf-critical/20 bg-conf-critical/5 px-2.5 py-1.5 font-sans text-xs text-text-secondary line-through decoration-conf-critical/40"
          title={change.old_value}
        >
          {change.old_value}
        </div>
        <span
          className="material-symbols-outlined shrink-0 text-[16px] text-text-muted sm:block rotate-90 sm:rotate-0 self-center"
          aria-hidden="true"
        >
          arrow_forward
        </span>
        <div
          className="flex-1 truncate rounded border border-conf-high/20 bg-conf-high/5 px-2.5 py-1.5 font-sans text-xs font-medium text-text-primary"
          title={change.new_value}
        >
          {change.new_value}
        </div>
      </div>
      <p className="font-sans text-xs leading-relaxed text-text-secondary">{change.description}</p>
    </Card>
  );
}

function StructuralChangeItem({ change }: { change: StructuralChange }) {
  const style = structuralChangeStyle(change.change_type);
  return (
    <Card noPadding className="flex items-start gap-3 p-4">
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.bg}`}>
        <span className={`material-symbols-outlined text-[18px] ${style.text}`} aria-hidden="true">
          {style.icon}
        </span>
      </div>
      <div className="flex min-w-0 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${style.text}`}>
            {change.change_type}
          </span>
          <span className="text-text-muted" aria-hidden="true">·</span>
          <span className="font-mono text-sm text-text-primary">{change.heading}</span>
        </div>
        <p className="font-sans text-sm text-text-secondary">{change.description}</p>
      </div>
    </Card>
  );
}

function CompareRiskCard({ risk }: { risk: RiskChange }) {
  const tone = riskTone(risk.severity);
  return (
    <Card noPadding className="flex flex-col gap-2 p-4">
      <span className={`self-start rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider
        ${risk.severity.toLowerCase().includes('high')
          ? 'border-conf-critical/30 bg-conf-critical/10 text-conf-critical'
          : risk.severity.toLowerCase().includes('medium')
            ? 'border-conf-amber/30 bg-conf-amber/10 text-conf-amber'
            : 'border-conf-high/30 bg-conf-high/10 text-conf-high'
        }`}
      >
        {risk.severity}
      </span>
      <p className={`font-sans text-sm font-semibold ${tone}`}>{risk.title}</p>
      <p className="font-sans text-sm leading-relaxed text-text-secondary">{risk.description}</p>
    </Card>
  );
}

function CompareEvidenceCard({ ev }: { ev: CompareEvidence }) {
  return (
    <Card noPadding className="overflow-hidden">
      {/* Label bar */}
      <div className="border-b border-border bg-elevated px-4 py-2">
        <span className="font-sans text-xs font-bold uppercase tracking-wider text-text-muted">
          {ev.label}
        </span>
      </div>
      {/* Side-by-side diff */}
      <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
        <div className="flex-1 bg-conf-critical/5 p-4">
          <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wider text-conf-critical/80">
            Old Clause
          </div>
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-text-secondary line-through decoration-conf-critical/30">
            {renderOldWithHighlight(ev.old_excerpt, ev.new_excerpt)}
          </div>
        </div>
        <div className="flex-1 bg-conf-high/5 p-4">
          <div className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wider text-conf-high/80">
            New Clause
          </div>
          <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-text-primary">
            {renderNewWithHighlight(ev.old_excerpt, ev.new_excerpt)}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReviewerPriorityCard({ priority }: { priority: ReviewerPriority }) {
  return (
    <div className="rounded-lg border border-border bg-elevated p-3 transition-colors hover:border-gold-primary/40">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-sans text-sm font-semibold text-text-primary">{priority.title}</p>
        <SeverityIcon severity={priority.severity} />
      </div>
      <p className="line-clamp-2 font-sans text-xs leading-relaxed text-text-secondary">
        {priority.description}
      </p>
    </div>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <p className="py-2 text-center font-sans text-sm text-text-muted">{message}</p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Compare() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sourceId, setSourceId] = useState<string>('');
  const [targetId, setTargetId] = useState<string>('');

  const [result, setResult] = useState<CompareResult | null>(null);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedStructural, setExpandedStructural] = useState(false);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/api/documents/');
        setDocuments(res.data);
        if (res.data.length >= 2) {
          setSourceId(res.data[0].id);
          setTargetId(res.data[1].id);
        } else if (res.data.length === 1) {
          setSourceId(res.data[0].id);
          setTargetId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load documents', err);
      }
    };
    fetchDocs();
  }, []);

  const runCompare = async () => {
    if (!sourceId || !targetId) return;
    setComparing(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/api/intelligence/compare', {
        source_document_id: sourceId,
        target_document_id: targetId,
      });
      const data = res.data;
      // Ensure arrays exist if LLM drops them
      data.structural_changes = data.structural_changes || [];
      data.semantic_changes = data.semantic_changes || [];
      data.reviewer_priorities = data.reviewer_priorities || [];
      data.risk_changes = data.risk_changes || [];
      data.evidence = data.evidence || [];
      data.deterministic_signals = data.deterministic_signals || [];

      setResult(data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      if (e.response) {
        setError(e.response.data?.detail || `Error ${e.response.status}`);
      } else {
        setError(e.message || 'Failed to run comparison');
      }
    } finally {
      setComparing(false);
    }
  };

  const outlineItems = useMemo<OutlineItem[]>(() => {
    if (!result) return [];
    return [
      { id: 'sec-summary',    label: 'Executive Summary',   icon: 'summarize'                                              },
      { id: 'sec-overview',   label: 'Change Overview',     icon: 'analytics'                                              },
      { id: 'sec-semantic',   label: 'Semantic Changes',    icon: 'manage_search',  count: result.semantic_changes.length   },
      { id: 'sec-structural', label: 'Structural Changes',  icon: 'account_tree',   count: result.structural_changes.length },
      { id: 'sec-risks',      label: 'Risk Impact',         icon: 'warning',        count: result.risk_changes.length       },
      { id: 'sec-evidence',   label: 'Direct Evidence',     icon: 'plagiarism',     count: result.evidence.length           },
      { id: 'sec-profile',    label: 'Document Profile',    icon: 'difference'                                             },
    ];
  }, [result]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (comparing) {
    return (
      <AnalysisLoading
        title="Comparing Documents…"
        message="Extracting structural, semantic, and risk-level differences"
      />
    );
  }

  // ── Empty / onboarding ───────────────────────────────────────────────────

  if (!result) {
    return (
      <AnalysisEmptyState
        icon="difference"
        title="Revision Intelligence"
        description="Select a baseline and a revised document to generate a structured comparison — semantic shifts, structural changes, risk impact, and direct evidence."
        expectedOutput={[
          'Executive comparison summary',
          'Semantic & meaning shifts',
          'Structural section changes',
          'Risk impact analysis',
          'Word-level diff evidence',
          'Document profile delta',
        ]}
        supportedTypes={['PDF', 'DOCX', 'TXT']}
        error={error}
      >
        {/* Source selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-text-muted/40 shrink-0" aria-hidden="true" />
            <label htmlFor="compare-source" className="font-sans text-sm font-medium text-text-primary">
              Source Document <span className="text-text-muted font-normal">(Baseline)</span>
            </label>
          </div>
          <select
            id="compare-source"
            value={sourceId}
            onChange={e => setSourceId(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text-primary
              focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
          >
            <option value="">— Select source —</option>
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>

        {/* Swap button */}
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => { const tmp = sourceId; setSourceId(targetId); setTargetId(tmp); }}
            aria-label="Swap source and target documents"
            className="flex items-center justify-center rounded-full border border-border bg-elevated p-2 text-text-muted
              transition-colors hover:border-gold-primary/40 hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/30"
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">swap_vert</span>
          </button>
        </div>

        {/* Target selector */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold-primary/60 shrink-0" aria-hidden="true" />
            <label htmlFor="compare-target" className="font-sans text-sm font-medium text-text-primary">
              Target Document <span className="text-text-muted font-normal">(Revision)</span>
            </label>
          </div>
          <select
            id="compare-target"
            value={targetId}
            onChange={e => setTargetId(e.target.value)}
            className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text-primary
              focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
          >
            <option value="">— Select target —</option>
            {documents.map(d => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>

        <Button
          variant="primary"
          onClick={runCompare}
          disabled={!sourceId || !targetId || sourceId === targetId}
          leftIcon={
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">analytics</span>
          }
          className="w-full"
        >
          Analyze Diff
        </Button>
        {sourceId === targetId && sourceId !== '' && (
          <p className="text-center font-sans text-xs text-text-muted">
            Select two different documents to compare.
          </p>
        )}
      </AnalysisEmptyState>
    );
  }

  // ── Result — three-panel workspace ───────────────────────────────────────

  const header = (
    <AnalysisHeader
      icon="difference"
      eyebrow="Comparison Workbench"
      title="Revision Intelligence"
      documentName={`${result.source_document.title} → ${result.target_document.title}`}
      status={<Badge variant="success" size="sm">Complete</Badge>}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={runCompare}
          leftIcon={
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">refresh</span>
          }
        >
          Re-run
        </Button>
      }
    />
  );

  const sidebar = <AnalysisSidebar items={outlineItems} />;

  const inspector = (
    <AnalysisInspector>
      {/* Similarity score as the hero ring */}
      <Panel title="Similarity Score">
        <div className="flex flex-col items-center gap-3 py-1">
          <ConfidenceRing value={result.similarity_score} size="lg" />
          <span className="font-sans text-sm font-medium text-text-secondary">
            {result.overall_change_level} Change
          </span>
        </div>
      </Panel>

      {/* Documents being compared */}
      <Panel title="Comparison">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-text-muted/40 shrink-0" aria-hidden="true" />
              Base
            </span>
            <span className="truncate font-sans text-xs leading-relaxed text-text-secondary">
              {result.source_document.title}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-gold-primary/60 shrink-0" aria-hidden="true" />
              Revision
            </span>
            <span className="truncate font-sans text-xs leading-relaxed text-text-secondary">
              {result.target_document.title}
            </span>
          </div>
        </div>
      </Panel>

      {/* Change counts */}
      <Panel title="Change Snapshot">
        <div className="flex flex-col gap-3">
          <InspectorStat icon="add_circle_outline"    label="Added"    value={result.change_snapshot.added_sections_count.toString()}    />
          <InspectorStat icon="remove_circle_outline" label="Removed"  value={result.change_snapshot.removed_sections_count.toString()}  />
          <InspectorStat icon="edit"                  label="Modified" value={result.change_snapshot.modified_sections_count.toString()} />
          <InspectorStat
            icon="warning"
            label="Risk Shift"
            value={
              <span className={riskTone(result.change_snapshot.overall_risk)}>
                {result.change_snapshot.overall_risk}
              </span>
            }
          />
        </div>
      </Panel>

      {/* Reviewer priorities */}
      {result.reviewer_priorities.length > 0 && (
        <Panel title="Reviewer Priorities">
          <div className="flex flex-col gap-2">
            {result.reviewer_priorities.map((p, idx) => (
              <ReviewerPriorityCard key={idx} priority={p} />
            ))}
          </div>
        </Panel>
      )}

      {/* Signals */}
      {result.deterministic_signals.length > 0 && (
        <Panel title="Signals Detected">
          <div className="flex flex-wrap gap-1.5">
            {result.deterministic_signals.map((sig, idx) => (
              <Chip key={idx} variant="default">{sig}</Chip>
            ))}
          </div>
        </Panel>
      )}

      {/* Engine */}
      <Panel title="Engine">
        <div className="flex flex-col gap-2">
          <InspectorStat icon="bolt" label="Analyzer" value="Compare" />
          <p className="font-sans text-xs leading-relaxed text-text-muted">
            Structural and semantic diff with word-level evidence highlighting.
          </p>
        </div>
      </Panel>
    </AnalysisInspector>
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector} mobileContents={outlineItems}>
      <div className="flex flex-col gap-6">

        {/* Executive Summary */}
        <Panel id="sec-summary" title="Executive Summary" className="scroll-mt-6">
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
            {result.executive_summary}
          </p>
        </Panel>

        {/* Change Overview — metric cards grid */}
        <Panel id="sec-overview" title="Change Overview" className="scroll-mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ChangeMetricCard
              icon="add_circle"
              label="Added"
              value={result.change_snapshot.added_sections_count}
              tone="text-conf-high"
            />
            <ChangeMetricCard
              icon="remove_circle"
              label="Removed"
              value={result.change_snapshot.removed_sections_count}
              tone="text-conf-critical"
            />
            <ChangeMetricCard
              icon="edit"
              label="Modified"
              value={result.change_snapshot.modified_sections_count}
              tone="text-conf-amber"
            />
            <ChangeMetricCard
              icon="percent"
              label="Similarity"
              value={`${result.similarity_score}%`}
              tone={
                result.similarity_score >= 85 ? 'text-conf-high' :
                result.similarity_score >= 65 ? 'text-conf-amber' :
                'text-conf-critical'
              }
            />
          </div>
        </Panel>

        {/* Semantic Changes */}
        <Panel
          id="sec-semantic"
          title="Semantic Changes"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.semantic_changes.length}
            </Badge>
          }
        >
          {result.semantic_changes.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.semantic_changes.map((sc, idx) => (
                <SemanticChangeCard key={idx} change={sc} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No semantic shifts detected between these documents." />
          )}
        </Panel>

        {/* Structural Changes */}
        <Panel
          id="sec-structural"
          title="Structural Changes"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.structural_changes.length}
            </Badge>
          }
        >
          {result.structural_changes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {(expandedStructural
                ? result.structural_changes
                : result.structural_changes.slice(0, 5)
              ).map((st, idx) => (
                <StructuralChangeItem key={idx} change={st} />
              ))}
              {result.structural_changes.length > 5 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setExpandedStructural(!expandedStructural)}
                  className="mt-1 w-full"
                >
                  {expandedStructural
                    ? 'Show less'
                    : `Show ${result.structural_changes.length - 5} more`}
                </Button>
              )}
            </div>
          ) : (
            <SectionEmpty message="No structural section changes detected." />
          )}
        </Panel>

        {/* Risk Impact */}
        <Panel
          id="sec-risks"
          title="Risk Impact"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.risk_changes.length}
            </Badge>
          }
        >
          {result.risk_changes.length > 0 ? (
            <div className="flex flex-col gap-3">
              {result.risk_changes.map((rc, idx) => (
                <CompareRiskCard key={idx} risk={rc} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No risk-level changes detected." />
          )}
        </Panel>

        {/* Direct Evidence — word-level diff */}
        <Panel
          id="sec-evidence"
          title="Direct Evidence"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.evidence.length}
            </Badge>
          }
        >
          {result.evidence.length > 0 ? (
            <div className="flex flex-col gap-4">
              {result.evidence.map((ev, idx) => (
                <CompareEvidenceCard key={idx} ev={ev} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No direct text evidence extracted." />
          )}
        </Panel>

        {/* Document Profile Delta */}
        <Panel id="sec-profile" title="Document Profile Delta" className="scroll-mt-6">
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[360px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-elevated">
                  {['Metric', 'Source', 'Target', 'Delta'].map((h, i) => (
                    <th
                      key={h}
                      className={`p-3 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted
                        ${i > 0 ? 'text-right' : ''}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(['word_count', 'paragraph_count', 'heading_count', 'list_count'] as const).map(metric => {
                  const delta = result.document_profile.delta[metric] ?? 0;
                  const src   = result.document_profile.source[metric];
                  const tgt   = result.document_profile.target[metric];
                  const label = metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                  const deltaClass = delta > 0 ? 'text-conf-high' : delta < 0 ? 'text-conf-critical' : 'text-text-muted';
                  return (
                    <tr key={metric} className="transition-colors hover:bg-elevated/50">
                      <td className="p-3 font-sans text-sm text-text-primary">{label}</td>
                      <td className="p-3 text-right font-mono text-sm text-text-secondary">{src}</td>
                      <td className="p-3 text-right font-mono text-sm text-text-primary">{tgt}</td>
                      <td className={`p-3 text-right font-mono text-sm font-medium ${deltaClass}`}>
                        {delta > 0 ? `+${delta}` : delta}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

      </div>
    </AnalysisLayout>
  );
}
