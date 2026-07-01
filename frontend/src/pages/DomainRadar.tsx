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
import { Chip } from '@/components/ui/Chip';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface DomainRadarResult {
  document_id: string;
  document_title: string;
  primary_domain: {
    domain: string;
    score: number;
    confidence_label: string;
  };
  candidate_domains: {
    domain: string;
    score: number;
    confidence_label: string;
  }[];
  document_profile: {
    word_count: number;
    line_count: number;
    paragraph_count: number;
    heading_like_lines: number;
    table_like_lines: number;
  };
  signals: {
    label: string;
    description: string;
    strength: string;
  }[];
  summary: string;
  recommended_surfaces: {
    surface: string;
    reason: string;
  }[];
  diagnostics: Record<string, unknown>;
}

// ── Confidence label → style/icon helpers (preserved from original) ────────────

function confidenceLabelClasses(label: string): string {
  switch (label.toLowerCase()) {
    case 'high':   return 'text-conf-high border-conf-high/30 bg-conf-high/10';
    case 'medium': return 'text-conf-amber border-conf-amber/30 bg-conf-amber/10';
    case 'low':    return 'text-conf-low border-conf-low/30 bg-conf-low/10';
    default:       return 'text-text-secondary border-border bg-surface';
  }
}

function confidenceIconName(label: string): string {
  switch (label.toLowerCase()) {
    case 'high':   return 'check_circle';
    case 'medium': return 'remove_circle_outline';
    case 'low':    return 'help_outline';
    default:       return 'info';
  }
}

function confidenceBarClass(label: string): string {
  switch (label.toLowerCase()) {
    case 'high':   return 'bg-conf-high';
    case 'medium': return 'bg-conf-amber';
    case 'low':    return 'bg-conf-low';
    default:       return 'bg-text-muted';
  }
}

function surfaceIconName(surface: string): string {
  switch (surface.toLowerCase()) {
    case 'workspace': return 'space_dashboard';
    case 'audit':     return 'fact_check';
    case 'clinical':  return 'medical_services';
    case 'compare':   return 'compare_arrows';
    case 'code':      return 'code';
    default:          return 'dashboard';
  }
}

// ── Presentation-only sub-components ──────────────────────────────────────────

function ConfidenceBadge({ label }: { label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${confidenceLabelClasses(label)}`}
    >
      <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
        {confidenceIconName(label)}
      </span>
      {label} Confidence
    </span>
  );
}

function DomainBar({
  domain,
  score,
  confidence_label,
}: DomainRadarResult['candidate_domains'][number]) {
  const pct = Math.round(score * 100);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="font-sans text-sm capitalize text-text-primary">{domain}</span>
        <span className="font-mono text-sm text-text-secondary">{pct}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full border border-border bg-void">
        <div
          className={`h-full rounded-full ${confidenceBarClass(confidence_label)}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SignalCard({ signal }: { signal: DomainRadarResult['signals'][number] }) {
  return (
    <Card noPadding className="flex flex-col gap-2 p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="font-sans text-sm font-semibold text-text-primary">{signal.label}</p>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${confidenceLabelClasses(signal.strength)}`}
        >
          {signal.strength}
        </span>
      </div>
      <p className="font-sans text-xs leading-relaxed text-text-secondary">{signal.description}</p>
    </Card>
  );
}

function SurfaceCard({
  surface: s,
}: {
  surface: DomainRadarResult['recommended_surfaces'][number];
}) {
  return (
    <Card noPadding className="flex items-start gap-3 p-4">
      <span
        className="material-symbols-outlined mt-0.5 shrink-0 text-[20px] text-gold-primary"
        style={{ fontVariationSettings: "'FILL' 1" }}
        aria-hidden="true"
      >
        {surfaceIconName(s.surface)}
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-sans text-sm font-semibold capitalize text-text-primary">{s.surface}</p>
        <p className="font-sans text-xs leading-relaxed text-text-secondary">{s.reason}</p>
      </div>
    </Card>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <p className="py-2 text-center font-sans text-sm text-text-muted">{message}</p>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function DomainRadar() {
  useDocumentTitle('Domain Radar');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<DomainRadarResult | null>(null);
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

  const runAnalysis = async () => {
    if (!selectedDocId) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/api/intelligence/domain-radar', {
        document_id: selectedDocId,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e.response?.data?.detail || e.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Reset if document changes
    setResult(null);
    setError(null);
  }, [selectedDocId]);

  const activeDocument = documents.find(d => d.id === selectedDocId);

  const outlineItems = useMemo<OutlineItem[]>(() => {
    if (!result) return [];
    return [
      { id: 'sec-summary',         label: 'Classification Summary',  icon: 'psychology'                                                    },
      { id: 'sec-domains',         label: 'Detected Domains',        icon: 'category',     count: result.candidate_domains.length + 1      },
      { id: 'sec-signals',         label: 'Detection Signals',       icon: 'track_changes', count: result.signals.length                   },
      { id: 'sec-recommendations', label: 'Recommended Workflows',   icon: 'route',         count: result.recommended_surfaces.length       },
      { id: 'sec-profile',         label: 'Document Profile',        icon: 'analytics'                                                     },
    ];
  }, [result]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isAnalyzing) {
    return (
      <AnalysisLoading
        title="Running Domain Radar…"
        message="Scanning document and synthesising domain classification"
      />
    );
  }

  // ── Empty / onboarding ───────────────────────────────────────────────────

  if (!result) {
    return (
      <AnalysisEmptyState
        icon="radar"
        title="Domain Radar"
        description="Classify a document's domain, inspect detection signals, and discover which Proxima workflows are best suited for it."
        expectedOutput={[
          'Primary domain classification',
          'Candidate domain scores',
          'Detection signals',
          'Recommended workflows',
          'Document profile',
        ]}
        supportedTypes={['PDF', 'DOCX', 'TXT']}
        error={error}
      >
        <label htmlFor="radar-doc" className="font-sans text-sm font-medium text-text-primary">
          Select a document to scan
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
              id="radar-doc"
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
              onClick={runAnalysis}
              disabled={!selectedDocId}
              leftIcon={
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">radar</span>
              }
              className="w-full"
            >
              Start Radar Scan
            </Button>
          </>
        )}
      </AnalysisEmptyState>
    );
  }

  // ── Result — three-panel workspace ───────────────────────────────────────

  const primaryPct = Math.round(result.primary_domain.score * 100);

  const header = (
    <AnalysisHeader
      icon="radar"
      title="Domain Radar"
      documentName={activeDocument?.title ?? result.document_title}
      status={<Badge variant="success" size="sm">Complete</Badge>}
      confidence={primaryPct}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={runAnalysis}
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
      {/* Domain confidence ring */}
      <Panel title="Domain Confidence">
        <div className="flex flex-col items-center gap-3 py-1">
          <ConfidenceRing value={primaryPct} size="lg" />
          <ConfidenceBadge label={result.primary_domain.confidence_label} />
        </div>
      </Panel>

      {/* Domain snapshot */}
      <Panel title="Domain Snapshot">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Primary Domain
            </span>
            <span className="font-display text-xl capitalize text-text-primary">
              {result.primary_domain.domain}
            </span>
          </div>
          <InspectorStat icon="percent"  label="Domain Score" value={`${primaryPct}%`} />
          {result.candidate_domains[0] && (
            <InspectorStat
              icon="category"
              label="Runner-up"
              value={`${result.candidate_domains[0].domain} (${Math.round(result.candidate_domains[0].score * 100)}%)`}
            />
          )}
        </div>
      </Panel>

      {/* Detection summary */}
      <Panel title="Detection Summary">
        <div className="flex flex-col gap-3">
          <InspectorStat icon="category"     label="Domains"       value={result.candidate_domains.length + 1} />
          <InspectorStat icon="track_changes" label="Signals"       value={result.signals.length}              />
          <InspectorStat icon="route"         label="Workflows"     value={result.recommended_surfaces.length} />
        </div>
      </Panel>

      {/* Document Profile */}
      <Panel title="Document Profile">
        <div className="flex flex-col gap-3">
          <InspectorStat icon="format_size"         label="Words"      value={result.document_profile.word_count.toLocaleString()}       />
          <InspectorStat icon="reorder"             label="Lines"      value={result.document_profile.line_count.toLocaleString()}       />
          <InspectorStat icon="article"             label="Paragraphs" value={result.document_profile.paragraph_count.toLocaleString()}  />
          <InspectorStat icon="title"               label="Headings"   value={result.document_profile.heading_like_lines.toLocaleString()} />
          <InspectorStat icon="table_chart"         label="Tables"     value={result.document_profile.table_like_lines.toLocaleString()} />
        </div>
      </Panel>

      {/* Signals as chips */}
      {result.signals.length > 0 && (
        <Panel title="Signals">
          <div className="flex flex-wrap gap-1.5">
            {result.signals.map((sig, idx) => (
              <Chip key={idx} variant="default">{sig.label}</Chip>
            ))}
          </div>
        </Panel>
      )}

      {/* Engine */}
      <Panel title="Engine">
        <div className="flex flex-col gap-2">
          <InspectorStat icon="bolt" label="Analyzer" value="Domain Radar" />
          <p className="font-sans text-xs leading-relaxed text-text-muted">
            Cross-domain semantic classification and domain detection.
          </p>
        </div>
      </Panel>
    </AnalysisInspector>
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector} mobileContents={outlineItems}>
      <div className="flex flex-col gap-6">

        {/* Classification Summary */}
        <Panel id="sec-summary" title="Classification Summary" className="scroll-mt-6">
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
            {result.summary}
          </p>
        </Panel>

        {/* Detected Domains */}
        <Panel
          id="sec-domains"
          title="Detected Domains"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.candidate_domains.length + 1}
            </Badge>
          }
        >
          {/* Primary domain — featured */}
          <Card noPadding className="relative overflow-hidden border-gold-primary/20 bg-gold-primary/5 p-5">
            <div className="pointer-events-none absolute right-4 top-4 select-none opacity-5" aria-hidden="true">
              <span className="material-symbols-outlined text-8xl text-gold-primary">domain</span>
            </div>
            <div className="relative z-10 flex flex-col gap-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  Primary Domain
                </span>
                <ConfidenceBadge label={result.primary_domain.confidence_label} />
              </div>
              <div className="flex items-end gap-3">
                <span className="font-display text-3xl capitalize text-text-primary">
                  {result.primary_domain.domain}
                </span>
                <span className="pb-0.5 font-sans text-lg text-text-secondary">{primaryPct}%</span>
              </div>
            </div>
          </Card>

          {/* Candidate domains — confidence bars */}
          {result.candidate_domains.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              <p className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Additional Candidates
              </p>
              {result.candidate_domains.map((c, idx) => (
                <DomainBar key={idx} {...c} />
              ))}
            </div>
          )}
        </Panel>

        {/* Detection Signals */}
        <Panel
          id="sec-signals"
          title="Detection Signals"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.signals.length}
            </Badge>
          }
        >
          {result.signals.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.signals.map((sig, idx) => (
                <SignalCard key={idx} signal={sig} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No strong deterministic signals detected." />
          )}
        </Panel>

        {/* Recommended Workflows */}
        <Panel
          id="sec-recommendations"
          title="Recommended Workflows"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.recommended_surfaces.length}
            </Badge>
          }
        >
          {result.recommended_surfaces.length > 0 ? (
            <div className="flex flex-col gap-3">
              {result.recommended_surfaces.map((s, idx) => (
                <SurfaceCard key={idx} surface={s} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No workflow recommendations available." />
          )}
        </Panel>

        {/* Document Profile */}
        <Panel id="sec-profile" title="Document Profile" className="scroll-mt-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {(
              [
                { label: 'Words',      value: result.document_profile.word_count       },
                { label: 'Lines',      value: result.document_profile.line_count       },
                { label: 'Paragraphs', value: result.document_profile.paragraph_count  },
                { label: 'Headings',   value: result.document_profile.heading_like_lines },
                { label: 'Tables',     value: result.document_profile.table_like_lines },
              ] as const
            ).map(({ label, value }) => (
              <Card key={label} noPadding className="flex flex-col gap-1 p-3">
                <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                  {label}
                </span>
                <span className="font-mono text-lg text-text-primary">{value.toLocaleString()}</span>
              </Card>
            ))}
          </div>
        </Panel>

      </div>
    </AnalysisLayout>
  );
}
