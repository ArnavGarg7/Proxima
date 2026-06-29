import { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/axios';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';
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
import { confidenceLabel } from '@/lib/confidence';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface LegalDomainHint {
  is_legal_like: boolean;
  confidence: number;
  reason: string;
  top_signals?: string[];
}

interface LegalSnapshot {
  contract_type: string;
  top_risk: string;
  top_obligation: string;
  top_clause_gap: string;
}

interface ClauseCard {
  clause_type: string;
  status: 'present' | 'partial' | 'not_detected';
  summary: string;
  evidence_excerpt?: string | null;
}

interface RiskFlag {
  title: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence_excerpt?: string | null;
}

interface EvidenceCard {
  label: string;
  summary: string;
  evidence_excerpt: string;
}

interface LegalResult {
  document_id: string;
  document_title: string;
  document_domain_hint: LegalDomainHint;
  extraction_confidence: number;
  classification_summary: string;
  contract_type: string;
  parties_summary: string;
  effective_date_summary: string;
  term_or_duration_summary: string;
  legal_snapshot: LegalSnapshot;
  executive_summary: string;
  key_obligations: string[];
  payment_terms: string[];
  termination_or_renewal_terms: string[];
  clause_cards: ClauseCard[];
  risk_flags: RiskFlag[];
  evidence_cards: EvidenceCard[];
  deterministic_signals: string[];
  document_profile: {
    word_count: number;
    line_count: number;
    paragraph_count: number;
    heading_count: number;
    numbered_clauses?: number;
  };
}

// ── Severity → presentation tokens ────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { icon: string; tone: string }> = {
  critical: { icon: 'warning', tone: 'text-conf-critical' },
  high:     { icon: 'warning', tone: 'text-conf-critical' },
  medium:   { icon: 'error',   tone: 'text-conf-amber'    },
  moderate: { icon: 'error',   tone: 'text-conf-amber'    },
  low:      { icon: 'info',    tone: 'text-conf-high'     },
};

// ── Clause status → badge ─────────────────────────────────────────────────────

function ClauseStatusBadge({ status }: { status: ClauseCard['status'] }) {
  if (status === 'present') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-conf-high/30 bg-conf-high/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-conf-high">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-conf-high" />
        Present
      </span>
    );
  }
  if (status === 'partial') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-conf-amber/30 bg-conf-amber/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-conf-amber">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-conf-amber" />
        Partial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-text-muted">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-text-muted" />
      Not Detected
    </span>
  );
}

// ── Presentation-only sub-components ──────────────────────────────────────────

function LegalListItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2.5 font-sans text-sm text-text-secondary">
      <span
        className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-gold-primary"
        aria-hidden="true"
      >
        adjust
      </span>
      {text}
    </li>
  );
}

function LegalClauseCard({ card }: { card: ClauseCard }) {
  const borderClass =
    card.status === 'present' ? 'border-conf-high/20' :
    card.status === 'partial' ? 'border-conf-amber/20' :
                                'border-border';
  const excerpt = card.evidence_excerpt ?? '';
  return (
    <Card noPadding className={`flex flex-col gap-2 p-4 border ${borderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <span className="font-sans text-sm font-semibold text-text-primary">{card.clause_type}</span>
        <ClauseStatusBadge status={card.status} />
      </div>
      <p className="font-sans text-xs leading-relaxed text-text-secondary">{card.summary}</p>
      {excerpt && (
        <blockquote className="mt-1 border-l-2 border-gold-primary pl-2 font-serif text-[11px] italic text-text-muted">
          &ldquo;{excerpt.slice(0, 150)}{excerpt.length > 150 ? '…' : ''}&rdquo;
        </blockquote>
      )}
    </Card>
  );
}

function LegalRiskCard({ flag }: { flag: RiskFlag }) {
  const style = SEVERITY_STYLES[flag.severity.toLowerCase()] ?? SEVERITY_STYLES.low;
  return (
    <Card noPadding className="flex items-start gap-3 p-4">
      <span
        className={`material-symbols-outlined mt-0.5 shrink-0 text-[20px] ${style.tone}`}
        aria-hidden="true"
      >
        {style.icon}
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${style.tone}`}>
            {flag.severity} Risk
          </span>
          <span className="rounded border border-border bg-elevated px-1.5 py-0.5 font-sans text-[10px] capitalize text-text-muted">
            {flag.category.replace(/_/g, ' ')}
          </span>
        </div>
        <p className="font-sans text-sm font-semibold text-text-primary">{flag.title}</p>
        <p className="font-sans text-xs leading-relaxed text-text-secondary">{flag.description}</p>
        {flag.evidence_excerpt && (
          <blockquote className="mt-1 border-l-2 border-gold-primary pl-2 font-serif text-[11px] italic text-text-muted">
            &ldquo;{flag.evidence_excerpt.slice(0, 120)}{flag.evidence_excerpt.length > 120 ? '…' : ''}&rdquo;
          </blockquote>
        )}
      </div>
    </Card>
  );
}

function LegalEvidenceCard({ ev }: { ev: EvidenceCard }) {
  const excerpt = ev.evidence_excerpt ?? '';
  return (
    <Card noPadding className="flex flex-col gap-2 p-4">
      <p className="font-sans text-sm font-semibold text-text-primary">{ev.label}</p>
      <p className="font-sans text-xs text-text-muted">{ev.summary}</p>
      <blockquote className="mt-1 border-l-2 border-gold-primary pl-3 font-serif text-sm italic text-text-secondary">
        &ldquo;{excerpt.slice(0, 250)}{excerpt.length > 250 ? '…' : ''}&rdquo;
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

export default function Legal() {
  const location = useLocation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<LegalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);

  useEffect(() => {
    api.get('/api/documents/').then(res => {
      const docs = Array.isArray(res.data) ? res.data : [];
      setDocuments(docs);
      if (docs.length > 0) setSelectedDocId(docs[0].id);
    }).catch(console.error).finally(() => setLoadingDocs(false));
  }, []);

  // Hydrate template launch context
  useEffect(() => {
    const ctx: TemplateLaunchContext | null =
      location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx && ctx.target_workbench === 'legal') {
      setTemplateContext(ctx);
      if (ctx.document_id) setSelectedDocId(ctx.document_id);
    }
  }, [location.state]);

  useEffect(() => { setResult(null); setError(null); }, [selectedDocId]);

  const runAnalysis = async () => {
    if (!selectedDocId) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/api/intelligence/legal', { document_id: selectedDocId });
      const data = res.data;

      // Helper: coerce an array item to a string (handles LLM returning objects instead of strings)
      const toStr = (item: unknown): string => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          // obligation objects: {party, obligation, category, evidence}
          if (typeof o.obligation === 'string') return o.obligation;
          // payment objects
          if (typeof o.term === 'string') return o.term;
          if (typeof o.description === 'string') return o.description;
          if (typeof o.text === 'string') return o.text;
          if (typeof o.summary === 'string') return o.summary;
          // fallback: join all string values
          return Object.values(o).filter(v => typeof v === 'string').join(' — ');
        }
        return String(item ?? '');
      };

      // Null-safe + type-safe defaults for all array fields
      data.key_obligations = (data.key_obligations ?? []).map(toStr);
      data.payment_terms = (data.payment_terms ?? []).map(toStr);
      data.termination_or_renewal_terms = (data.termination_or_renewal_terms ?? []).map(toStr);
      data.clause_cards = data.clause_cards ?? [];
      data.risk_flags = data.risk_flags ?? [];
      data.evidence_cards = data.evidence_cards ?? [];
      data.deterministic_signals = (data.deterministic_signals ?? []).map(toStr);
      data.document_profile = data.document_profile ?? {};
      data.legal_snapshot = data.legal_snapshot ?? { contract_type: '', top_risk: '', top_obligation: '', top_clause_gap: '' };
      data.document_domain_hint = data.document_domain_hint ?? { is_legal_like: false, confidence: 0, reason: '' };
      setResult(data);

    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e.response?.data?.detail || e.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeDocument = documents.find(d => d.id === selectedDocId);

  const outlineItems = useMemo<OutlineItem[]>(() => {
    if (!result) return [];
    return [
      { id: 'sec-summary',     label: 'Executive Summary',  icon: 'summarize'                                                          },
      { id: 'sec-overview',    label: 'Agreement Overview', icon: 'article'                                                            },
      { id: 'sec-obligations', label: 'Key Obligations',    icon: 'task_alt',     count: result.key_obligations.length                 },
      { id: 'sec-clauses',     label: 'Clause Coverage',    icon: 'checklist',    count: result.clause_cards.length                    },
      { id: 'sec-payment',     label: 'Payment Terms',      icon: 'payments',     count: result.payment_terms.length                   },
      { id: 'sec-termination', label: 'Termination',        icon: 'event_repeat', count: result.termination_or_renewal_terms.length    },
      { id: 'sec-risks',       label: 'Risk Flags',         icon: 'warning',      count: result.risk_flags.length                      },
      { id: 'sec-evidence',    label: 'Section Evidence',   icon: 'plagiarism',   count: result.evidence_cards.length                  },
    ];
  }, [result]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isAnalyzing) {
    return (
      <AnalysisLoading
        title="Analyzing Legal Document…"
        message="Extracting clause coverage, obligations, and risk signals"
      />
    );
  }

  // ── Empty / onboarding ───────────────────────────────────────────────────

  if (!result) {
    return (
      <AnalysisEmptyState
        icon="gavel"
        title="Legal Intelligence"
        description="Select a contract or legal document to extract clause coverage, obligations, risk signals, and key agreement metadata."
        expectedOutput={[
          'Executive summary',
          'Agreement overview',
          'Key obligations',
          'Clause coverage',
          'Payment terms',
          'Termination & renewal',
          'Risk & gap flags',
          'Section evidence',
        ]}
        supportedTypes={['PDF', 'DOCX', 'TXT']}
        error={error}
      >
        {templateContext && (
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        )}
        <label htmlFor="legal-doc" className="font-sans text-sm font-medium text-text-primary">
          Select a contract to analyze
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
              id="legal-doc"
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
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  gavel
                </span>
              }
              className="w-full"
            >
              Start Contract Analysis
            </Button>
          </>
        )}
      </AnalysisEmptyState>
    );
  }

  // ── Result — three-panel workspace ───────────────────────────────────────

  const header = (
    <AnalysisHeader
      icon="gavel"
      title="Legal Intelligence"
      documentName={activeDocument?.title ?? result.document_title}
      status={<Badge variant="success" size="sm">Complete</Badge>}
      confidence={result.extraction_confidence}
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={runAnalysis}
          leftIcon={
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              refresh
            </span>
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
      {/* Overall confidence */}
      <Panel title="Overall Confidence">
        <div className="flex flex-col items-center gap-3 py-1">
          <ConfidenceRing value={result.extraction_confidence} size="lg" />
          <span className="font-sans text-sm font-medium text-text-secondary">
            {confidenceLabel(result.extraction_confidence)}
          </span>
        </div>
      </Panel>

      {/* Legal Snapshot */}
      <Panel title="Legal Snapshot">
        <div className="flex flex-col gap-3">
          {(
            [
              { label: 'Contract Type',  icon: 'contract',      value: result.legal_snapshot.contract_type   },
              { label: 'Top Risk',       icon: 'warning',       value: result.legal_snapshot.top_risk        },
              { label: 'Top Obligation', icon: 'task_alt',      value: result.legal_snapshot.top_obligation  },
              { label: 'Clause Gap',     icon: 'find_in_page',  value: result.legal_snapshot.top_clause_gap  },
            ] as const
          ).map(({ label, icon, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{icon}</span>
                {label}
              </span>
              <span className="font-sans text-xs leading-relaxed text-text-secondary">
                {value || 'Not clearly identifiable'}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Document Profile */}
      <Panel title="Document Profile">
        <div className="flex flex-col gap-3">
          <InspectorStat icon="format_size" label="Words"           value={(result.document_profile?.word_count ?? '—').toLocaleString()}      />
          <InspectorStat icon="reorder"     label="Lines"           value={(result.document_profile?.line_count ?? '—').toLocaleString()}      />
          <InspectorStat icon="article"     label="Paragraphs"      value={(result.document_profile?.paragraph_count ?? '—').toLocaleString()} />
          <InspectorStat icon="title"       label="Headings"        value={(result.document_profile?.heading_count ?? '—').toLocaleString()}   />
          {result.document_profile?.numbered_clauses !== undefined && (
            <InspectorStat icon="format_list_numbered" label="Clauses" value={result.document_profile.numbered_clauses.toLocaleString()} />
          )}
        </div>
      </Panel>

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
          <InspectorStat icon="bolt" label="Analyzer" value="Legal" />
          <p className="font-sans text-xs leading-relaxed text-text-muted">
            Clause coverage detection, obligation extraction, and legal risk analysis.
          </p>
        </div>
      </Panel>
    </AnalysisInspector>
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector} mobileContents={outlineItems}>
      <div className="flex flex-col gap-6">

        {/* Template Banner */}
        {templateContext && (
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        )}

        {/* Non-legal document alert */}
        {!result.document_domain_hint.is_legal_like && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-conf-amber/20 bg-conf-amber/8 px-4 py-3"
          >
            <span
              className="material-symbols-outlined mt-0.5 shrink-0 text-[18px] text-conf-amber"
              aria-hidden="true"
            >
              info
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-sm font-semibold text-text-primary">
                Non-Legal Document Detected
              </span>
              <p className="font-sans text-xs leading-relaxed text-text-secondary">
                {result.document_domain_hint.reason}
              </p>
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <Panel id="sec-summary" title="Executive Summary" className="scroll-mt-6">
          {result.classification_summary && (
            <p className="mb-3 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
              {result.classification_summary}
            </p>
          )}
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
            {result.executive_summary}
          </p>
        </Panel>

        {/* Agreement Overview */}
        <Panel id="sec-overview" title="Agreement Overview" className="scroll-mt-6">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {(
              [
                { icon: 'contract',       label: 'Contract Type',    value: result.contract_type              },
                { icon: 'groups',         label: 'Parties',          value: result.parties_summary            },
                { icon: 'calendar_today', label: 'Effective Date',   value: result.effective_date_summary     },
                { icon: 'schedule',       label: 'Term / Duration',  value: result.term_or_duration_summary   },
              ] as const
            ).map(({ icon, label, value }) => (
              <div key={label} className="flex items-start gap-3 rounded-lg border border-border bg-elevated px-3.5 py-3">
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-text-muted"
                  aria-hidden="true"
                >
                  {icon}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    {label}
                  </span>
                  <span className="font-sans text-sm leading-relaxed text-text-primary">
                    {value || 'Not clearly identifiable'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Key Obligations */}
        <Panel
          id="sec-obligations"
          title="Key Obligations"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.key_obligations.length}
            </Badge>
          }
        >
          {result.key_obligations.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.key_obligations.map((ob, idx) => (
                <LegalListItem key={idx} text={ob} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No key obligations clearly detected." />
          )}
        </Panel>

        {/* Clause Coverage */}
        {result.clause_cards.length > 0 && (
          <Panel
            id="sec-clauses"
            title="Clause Coverage"
            className="scroll-mt-6"
            headerAction={
              <Badge variant="default" size="sm" uppercase={false}>
                {result.clause_cards.length}
              </Badge>
            }
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.clause_cards.map((card, idx) => (
                <LegalClauseCard key={idx} card={card} />
              ))}
            </div>
          </Panel>
        )}

        {/* Payment Terms */}
        <Panel
          id="sec-payment"
          title="Payment Terms"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.payment_terms.length}
            </Badge>
          }
        >
          {result.payment_terms.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.payment_terms.map((pt, idx) => (
                <LegalListItem key={idx} text={pt} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No payment terms clearly detected." />
          )}
        </Panel>

        {/* Termination & Renewal */}
        <Panel
          id="sec-termination"
          title="Termination & Renewal"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.termination_or_renewal_terms.length}
            </Badge>
          }
        >
          {result.termination_or_renewal_terms.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.termination_or_renewal_terms.map((t, idx) => (
                <LegalListItem key={idx} text={t} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No termination or renewal terms clearly detected." />
          )}
        </Panel>

        {/* Risk Flags */}
        <Panel
          id="sec-risks"
          title="Risk Flags"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.risk_flags.length}
            </Badge>
          }
        >
          {result.risk_flags.length > 0 ? (
            <div className="flex flex-col gap-3">
              {result.risk_flags.map((flag, idx) => (
                <LegalRiskCard key={idx} flag={flag} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No major risk flags detected." />
          )}
        </Panel>

        {/* Section Evidence */}
        <Panel
          id="sec-evidence"
          title="Section Evidence"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.evidence_cards.length}
            </Badge>
          }
        >
          {result.evidence_cards.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.evidence_cards.map((ev, idx) => (
                <LegalEvidenceCard key={idx} ev={ev} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No section evidence extracted." />
          )}
        </Panel>

      </div>
    </AnalysisLayout>
  );
}
