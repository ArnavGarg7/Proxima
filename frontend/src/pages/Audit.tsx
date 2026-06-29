import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/axios';
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
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface AuditResult {
  document_id: string;
  document_title: string;
  overall_score: number;
  grade: string;
  dimensions: {
    clarity: number;
    structure: number;
    terminology: number;
    compliance_signals: number;
  };
  actions: {
    title: string;
    description: string;
    severity: string;
    dimension: string;
  }[];
  evidence: {
    title: string;
    description: string;
    dimension: string;
    excerpt: string;
  }[];
  diagnostics: Record<string, unknown>;
}

// ── Score → style token helpers (preserved from original) ─────────────────────

function gradeColor(grade: string): string {
  if (['A', 'B'].includes(grade)) return 'text-conf-high';
  if (['C', 'D'].includes(grade)) return 'text-conf-amber';
  return 'text-conf-critical';
}

function scoreColorClass(score: number): string {
  if (score >= 80) return 'text-conf-high bg-conf-high/15';
  if (score >= 60) return 'text-conf-amber bg-conf-amber/15';
  return 'text-conf-critical bg-conf-critical/15';
}

function scoreBarClass(score: number): string {
  if (score >= 80) return 'bg-conf-high';
  if (score >= 60) return 'bg-conf-amber';
  return 'bg-conf-critical';
}

function severityTone(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'high':   return 'text-conf-critical';
    case 'medium': return 'text-conf-amber';
    default:       return 'text-conf-high';
  }
}

// ── Presentation-only sub-components ──────────────────────────────────────────

function PriorityIcon({ severity }: { severity: string }) {
  switch (severity.toLowerCase()) {
    case 'high':
      return <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-conf-critical">warning</span>;
    case 'medium':
      return <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-conf-amber">error</span>;
    default:
      return <span className="material-symbols-outlined mt-0.5 shrink-0 text-sm text-conf-high">info</span>;
  }
}

function OverviewMetricCard({
  label,
  value,
  tone = 'text-text-primary',
}: {
  label: string;
  value: string | number;
  tone?: string;
}) {
  return (
    <Card noPadding className="flex flex-col items-center gap-1.5 p-4 text-center">
      <span className={`font-mono text-2xl font-bold tabular-nums ${tone}`}>{value}</span>
      <span className="font-sans text-xs text-text-muted">{label}</span>
    </Card>
  );
}

function DimensionCard({ label, score }: { label: string; score: number }) {
  return (
    <Card noPadding className="flex h-28 flex-col justify-between p-4">
      <div className="flex items-start justify-between gap-2">
        <span className="font-sans text-sm font-medium text-text-secondary">{label}</span>
        <span className={`rounded-full px-2 py-0.5 font-sans text-xs font-medium ${scoreColorClass(score)}`}>
          {score.toFixed(0)}%
        </span>
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
        <div
          className={`h-full rounded-full ${scoreBarClass(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </Card>
  );
}

function AuditActionCard({
  action,
}: {
  action: AuditResult['actions'][number];
}) {
  return (
    <Card noPadding className="flex items-start gap-3 p-4">
      <PriorityIcon severity={action.severity} />
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${severityTone(action.severity)}`}>
            {action.severity}
          </span>
          <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-sans text-[10px] capitalize text-text-muted">
            {action.dimension.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="font-sans text-sm font-semibold text-text-primary">{action.title}</p>
        <p className="font-sans text-xs leading-relaxed text-text-secondary">{action.description}</p>
      </div>
    </Card>
  );
}

function AuditEvidenceCard({ ev }: { ev: AuditResult['evidence'][number] }) {
  return (
    <Card noPadding className="flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-sans text-sm font-semibold text-text-primary">{ev.title}</p>
        <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-sans text-[10px] capitalize text-text-muted">
          {ev.dimension.replace(/_/g, ' ')}
        </span>
      </div>
      <p className="font-sans text-xs text-text-muted">{ev.description}</p>
      <blockquote className="mt-1 border-l-2 border-gold-primary pl-3 font-serif text-sm italic leading-relaxed text-text-secondary">
        &ldquo;{ev.excerpt}&rdquo;
      </blockquote>
    </Card>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <p className="py-2 text-center font-sans text-sm text-text-muted">{message}</p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Audit() {
  useDocumentTitle('Audit');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/api/documents/');
        setDocuments(res.data);
        if (res.data.length > 0) {
          setSelectedDocId(res.data[0].id);
        }
      } catch (err) {
        console.error('Failed to load documents', err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, []);

  const runAudit = async () => {
    if (!selectedDocId) return;
    setAuditing(true);
    setError(null);
    setAuditResult(null);

    try {
      const res = await api.post('/api/intelligence/confidence', {
        document_id: selectedDocId,
      });
      setAuditResult(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string }; status?: number }; message?: string };
      if (e.response) {
        setError(e.response.data?.detail || `Error ${e.response.status}`);
      } else {
        setError(e.message || 'Failed to run audit');
      }
    } finally {
      setAuditing(false);
    }
  };

  const activeDocument = documents.find(d => d.id === selectedDocId);

  const outlineItems = useMemo<OutlineItem[]>(() => {
    if (!auditResult) return [];
    return [
      { id: 'sec-overview',   label: 'Audit Overview',   icon: 'verified_user'                               },
      { id: 'sec-dimensions', label: 'Dimension Scores', icon: 'radar'                                       },
      { id: 'sec-actions',    label: 'Actions',          icon: 'list_alt',   count: auditResult.actions.length  },
      { id: 'sec-evidence',   label: 'Evidence',         icon: 'plagiarism', count: auditResult.evidence.length },
    ];
  }, [auditResult]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (auditing) {
    return (
      <AnalysisLoading
        title="Running Confidence Audit…"
        message="Scoring clarity, structure, terminology, and compliance signals"
      />
    );
  }

  // ── Empty / onboarding ───────────────────────────────────────────────────

  if (!auditResult) {
    return (
      <AnalysisEmptyState
        icon="verified_user"
        title="Confidence Audit"
        description="Select a document to run a comprehensive multi-dimensional confidence scan across clarity, structure, terminology, and compliance signals."
        expectedOutput={[
          'Overall confidence score',
          'Letter grade (A–F)',
          'Dimension scores',
          'Prioritized actions',
          'Segment evidence',
        ]}
        supportedTypes={['PDF', 'DOCX', 'TXT']}
        error={error}
      >
        <label htmlFor="audit-doc" className="font-sans text-sm font-medium text-text-primary">
          Select a document to audit
        </label>
        {loadingDocs ? (
          <p className="font-sans text-sm text-text-muted">Loading documents…</p>
        ) : documents.length === 0 ? (
          <p className="font-sans text-sm text-text-muted">
            No documents available. Upload one in Workspace first.
          </p>
        ) : (
          <>
            <select
              id="audit-doc"
              value={selectedDocId}
              onChange={e => setSelectedDocId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text-primary
                focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
            >
              {documents.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({new Date(doc.created_at).toLocaleDateString()})
                </option>
              ))}
            </select>
            <Button
              variant="primary"
              onClick={runAudit}
              disabled={!selectedDocId}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  verified_user
                </span>
              }
              className="w-full"
            >
              Run Audit
            </Button>
          </>
        )}
      </AnalysisEmptyState>
    );
  }

  // ── Result — three-panel workspace ───────────────────────────────────────

  const highCount   = auditResult.actions.filter(a => a.severity === 'high').length;
  const mediumCount = auditResult.actions.filter(a => a.severity === 'medium').length;
  const lowCount    = auditResult.actions.filter(a => a.severity !== 'high' && a.severity !== 'medium').length;

  const header = (
    <AnalysisHeader
      icon="verified_user"
      title="Confidence Audit"
      documentName={activeDocument?.title ?? auditResult.document_title}
      status={<Badge variant="success" size="sm">Complete</Badge>}
      confidence={auditResult.overall_score}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={runAudit}
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
      {/* Overall confidence ring */}
      <Panel title="Overall Confidence">
        <div className="flex flex-col items-center gap-3 py-1">
          <ConfidenceRing value={auditResult.overall_score} size="lg" />
        </div>
      </Panel>

      {/* Audit Snapshot — grade + action breakdown */}
      <Panel title="Audit Snapshot">
        <div className="mb-4 flex items-end gap-3 border-b border-border pb-4">
          <span className={`font-display text-4xl font-bold leading-none ${gradeColor(auditResult.grade)}`}>
            {auditResult.grade}
          </span>
          <span className="pb-1 font-sans text-sm text-text-muted">
            {auditResult.overall_score.toFixed(1)} / 100
          </span>
        </div>
        <div className="flex flex-col gap-3">
          <InspectorStat
            icon="warning"
            label="High Priority"
            value={
              <span className={highCount > 0 ? 'text-conf-critical' : 'text-text-primary'}>
                {highCount}
              </span>
            }
          />
          <InspectorStat
            icon="error"
            label="Medium Priority"
            value={
              <span className={mediumCount > 0 ? 'text-conf-amber' : 'text-text-primary'}>
                {mediumCount}
              </span>
            }
          />
          <InspectorStat icon="info" label="Low Priority" value={lowCount} />
        </div>
      </Panel>

      {/* Dimension quick-view */}
      <Panel title="Dimensions">
        <div className="flex flex-col gap-3">
          {(
            [
              { label: 'Clarity',     score: auditResult.dimensions.clarity             },
              { label: 'Structure',   score: auditResult.dimensions.structure           },
              { label: 'Terminology', score: auditResult.dimensions.terminology         },
              { label: 'Compliance',  score: auditResult.dimensions.compliance_signals  },
            ] as const
          ).map(({ label, score }) => (
            <div key={label} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="font-sans text-xs text-text-secondary">{label}</span>
                <span className={`font-mono text-xs font-semibold ${scoreColorClass(score).split(' ')[0]}`}>
                  {score.toFixed(0)}%
                </span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-elevated">
                <div
                  className={`h-full rounded-full ${scoreBarClass(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Engine */}
      <Panel title="Engine">
        <div className="flex flex-col gap-2">
          <InspectorStat icon="bolt" label="Analyzer" value="Audit" />
          <p className="font-sans text-xs leading-relaxed text-text-muted">
            Multi-dimensional confidence scoring across clarity, structure, terminology, and compliance signals.
          </p>
        </div>
      </Panel>
    </AnalysisInspector>
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector} mobileContents={outlineItems}>
      <div className="flex flex-col gap-6">

        {/* Audit Overview — grade + metric cards */}
        <Panel id="sec-overview" title="Audit Overview" className="scroll-mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <OverviewMetricCard
              label="Grade"
              value={auditResult.grade}
              tone={gradeColor(auditResult.grade)}
            />
            <OverviewMetricCard
              label="Overall Score"
              value={`${auditResult.overall_score.toFixed(1)}%`}
              tone={
                auditResult.overall_score >= 80 ? 'text-conf-high' :
                auditResult.overall_score >= 60 ? 'text-conf-amber' :
                'text-conf-critical'
              }
            />
            <OverviewMetricCard
              label="Actions"
              value={auditResult.actions.length}
              tone={highCount > 0 ? 'text-conf-critical' : 'text-text-primary'}
            />
            <OverviewMetricCard
              label="Evidence Items"
              value={auditResult.evidence.length}
            />
          </div>
        </Panel>

        {/* Dimension Scores */}
        <Panel id="sec-dimensions" title="Dimension Scores" className="scroll-mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DimensionCard label="Clarity"            score={auditResult.dimensions.clarity}            />
            <DimensionCard label="Structure"          score={auditResult.dimensions.structure}          />
            <DimensionCard label="Terminology"        score={auditResult.dimensions.terminology}        />
            <DimensionCard label="Compliance Signals" score={auditResult.dimensions.compliance_signals} />
          </div>
        </Panel>

        {/* Prioritized Actions */}
        <Panel
          id="sec-actions"
          title="Prioritized Actions"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {auditResult.actions.length}
            </Badge>
          }
        >
          {auditResult.actions.length > 0 ? (
            <div className="flex flex-col gap-3">
              {auditResult.actions.map((act, idx) => (
                <AuditActionCard key={idx} action={act} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No actions recommended — document passed all checks." />
          )}
        </Panel>

        {/* Segment Evidence */}
        <Panel
          id="sec-evidence"
          title="Segment Evidence"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {auditResult.evidence.length}
            </Badge>
          }
        >
          {auditResult.evidence.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {auditResult.evidence.map((ev, idx) => (
                <AuditEvidenceCard key={idx} ev={ev} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No specific segments flagged." />
          )}
        </Panel>

      </div>
    </AnalysisLayout>
  );
}
