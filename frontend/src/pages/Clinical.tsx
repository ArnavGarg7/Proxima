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
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface ClinicalResult {
  document_id: string;
  document_title: string;
  document_domain_hint: {
    is_clinical_like: boolean;
    confidence: string;
    reason: string;
  };
  summary: string;
  confidence: {
    overall: number;
    label: string;
  };
  clinical_snapshot: {
    chief_complaint_short: string;
    top_assessment: string;
    top_plan_item: string;
  };
  document_profile: {
    word_count: number;
    line_count: number;
    paragraph_count: number;
    heading_count: number;
  };
  clinical_summary: {
    chief_complaint: string;
    presenting_summary: string;
    key_findings: string[];
    diagnoses_or_assessment: string[];
    medications_or_therapies: string[];
    tests_or_imaging: string[];
    plan_items: string[];
  };
  risk_flags: {
    title: string;
    description: string;
    severity: string;
    category: string;
  }[];
  detected_signals: {
    label: string;
    description: string;
    strength: string;
  }[];
  section_evidence: {
    title: string;
    description: string;
    excerpt: string;
  }[];
}

// ── Severity → presentation tokens ────────────────────────────────────────────

const SEVERITY_STYLES: Record<string, { icon: string; tone: string }> = {
  critical: { icon: 'warning', tone: 'text-conf-critical' },
  high:     { icon: 'warning', tone: 'text-conf-critical' },
  medium:   { icon: 'error',   tone: 'text-conf-amber'    },
  moderate: { icon: 'error',   tone: 'text-conf-amber'    },
  low:      { icon: 'info',    tone: 'text-conf-high'     },
};

// ── Presentation-only sub-components ──────────────────────────────────────────

function ClinicalListItem({ text }: { text: string }) {
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

function ClinicalRiskCard({ flag }: { flag: ClinicalResult['risk_flags'][number] }) {
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
            {flag.category.replace('_', ' ')}
          </span>
        </div>
        <p className="font-sans text-sm font-semibold text-text-primary">{flag.title}</p>
        <p className="font-sans text-xs leading-relaxed text-text-secondary">{flag.description}</p>
      </div>
    </Card>
  );
}

function ClinicalEvidenceCard({ ev }: { ev: ClinicalResult['section_evidence'][number] }) {
  return (
    <Card noPadding className="flex flex-col gap-2 p-4">
      <p className="font-sans text-sm font-semibold text-text-primary">{ev.title}</p>
      <p className="font-sans text-xs text-text-muted">{ev.description}</p>
      <blockquote className="mt-1 border-l-2 border-gold-primary pl-3 font-serif text-sm italic text-text-secondary">
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

export default function Clinical() {
  useDocumentTitle('Clinical Analysis');
  const location = useLocation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ClinicalResult | null>(null);
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

  // Hydrate template launch context (from navigation state or sessionStorage)
  useEffect(() => {
    const ctx: TemplateLaunchContext | null =
      location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx && ctx.target_workbench === 'clinical') {
      setTemplateContext(ctx);
      if (ctx.document_id) setSelectedDocId(ctx.document_id);
    }
  }, [location.state]);

  const runAnalysis = async () => {
    if (!selectedDocId) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post('/api/intelligence/clinical', {
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
    setResult(null);
    setError(null);
  }, [selectedDocId]);

  const activeDocument = documents.find((d) => d.id === selectedDocId);

  const outlineItems = useMemo<OutlineItem[]>(() => {
    if (!result) return [];
    const cs = result.clinical_summary;
    const items: OutlineItem[] = [
      { id: 'sec-summary',   label: 'Executive Summary',      icon: 'summarize'        },
      { id: 'sec-diagnoses', label: 'Diagnoses',              icon: 'health_and_safety', count: cs.diagnoses_or_assessment.length },
      { id: 'sec-findings',  label: 'Key Findings',           icon: 'search',            count: cs.key_findings.length            },
      { id: 'sec-meds',      label: 'Medications',            icon: 'medication',        count: cs.medications_or_therapies.length },
      { id: 'sec-tests',     label: 'Tests & Imaging',        icon: 'biotech',           count: cs.tests_or_imaging.length        },
      { id: 'sec-plan',      label: 'Plan & Next Steps',      icon: 'next_plan',         count: cs.plan_items.length              },
      { id: 'sec-risks',     label: 'Risk Flags',             icon: 'warning',           count: result.risk_flags.length          },
      { id: 'sec-evidence',  label: 'Section Evidence',       icon: 'plagiarism',        count: result.section_evidence.length    },
    ];
    // Insert presenting history after summary when available
    if (cs.presenting_summary) {
      items.splice(1, 0, { id: 'sec-presenting', label: 'Presenting History', icon: 'history' });
    }
    return items;
  }, [result]);

  // ── Loading ──────────────────────────────────────────────────────────────

  if (isAnalyzing) {
    return (
      <AnalysisLoading
        title="Analyzing Clinical Document…"
        message="Structuring clinical entities, findings, and risk signals"
      />
    );
  }

  // ── Empty / onboarding ───────────────────────────────────────────────────

  if (!result) {
    return (
      <AnalysisEmptyState
        icon="medical_services"
        title="Clinical Intelligence"
        description="Select a clinical note to extract structured findings, diagnoses, medications, plan items, and risk flags."
        expectedOutput={[
          'Executive summary',
          'Diagnoses & assessment',
          'Key clinical findings',
          'Medications & therapies',
          'Tests & imaging',
          'Plan & next steps',
          'Risk & ambiguity flags',
          'Section evidence',
        ]}
        supportedTypes={['PDF', 'DOCX', 'TXT']}
        error={error}
      >
        {templateContext && (
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        )}
        <label htmlFor="clinical-doc" className="font-sans text-sm font-medium text-text-primary">
          Select a clinical note to analyze
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
              id="clinical-doc"
              value={selectedDocId}
              onChange={(e) => setSelectedDocId(e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text-primary
                focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
            >
              {documents.map((doc) => (
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
                  science
                </span>
              }
              className="w-full"
            >
              Start Clinical Analysis
            </Button>
          </>
        )}
      </AnalysisEmptyState>
    );
  }

  // ── Result — three-panel workspace ───────────────────────────────────────

  const header = (
    <AnalysisHeader
      icon="medical_services"
      title="Clinical Intelligence"
      documentName={activeDocument?.title ?? result.document_title}
      status={<Badge variant="success" size="sm">Complete</Badge>}
      confidence={result.confidence.overall}
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
          <ConfidenceRing value={result.confidence.overall} size="lg" />
          <span className="font-sans text-sm font-medium text-text-secondary">
            {confidenceLabel(result.confidence.overall)}
          </span>
        </div>
      </Panel>

      {/* Clinical Snapshot — quick-reference cards, not metric rows */}
      <Panel title="Clinical Snapshot">
        <div className="flex flex-col gap-3">
          {(
            [
              { label: 'Chief Complaint', icon: 'report_problem', value: result.clinical_snapshot.chief_complaint_short },
              { label: 'Top Assessment',  icon: 'health_and_safety', value: result.clinical_snapshot.top_assessment   },
              { label: 'Primary Plan',    icon: 'next_plan',         value: result.clinical_snapshot.top_plan_item    },
            ] as const
          ).map(({ label, icon, value }) => (
            <div key={label} className="flex flex-col gap-0.5">
              <span className="flex items-center gap-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{icon}</span>
                {label}
              </span>
              <span className="font-sans text-xs leading-relaxed text-text-secondary">
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </Panel>

      {/* Document Profile */}
      <Panel title="Document Profile">
        <div className="flex flex-col gap-3">
          <InspectorStat icon="format_size" label="Words"      value={result.document_profile.word_count.toLocaleString()}      />
          <InspectorStat icon="reorder"     label="Lines"      value={result.document_profile.line_count.toLocaleString()}      />
          <InspectorStat icon="article"     label="Paragraphs" value={result.document_profile.paragraph_count.toLocaleString()} />
          <InspectorStat icon="title"       label="Headings"   value={result.document_profile.heading_count.toLocaleString()}   />
        </div>
      </Panel>

      {/* Signals */}
      {result.detected_signals.length > 0 && (
        <Panel title="Signals Detected">
          <div className="flex flex-wrap gap-1.5">
            {result.detected_signals.map((sig, idx) => (
              <Chip key={idx} variant="default">{sig.label}</Chip>
            ))}
          </div>
        </Panel>
      )}

      {/* Engine */}
      <Panel title="Engine">
        <div className="flex flex-col gap-2">
          <InspectorStat icon="bolt" label="Analyzer" value="Clinical" />
          <p className="font-sans text-xs leading-relaxed text-text-muted">
            Structured extraction of clinical entities, risk signals, and section evidence.
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

        {/* Non-clinical document alert */}
        {!result.document_domain_hint.is_clinical_like && (
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
                Non-Clinical Document Detected
              </span>
              <p className="font-sans text-xs leading-relaxed text-text-secondary">
                {result.document_domain_hint.reason}
              </p>
            </div>
          </div>
        )}

        {/* Executive Summary */}
        <Panel id="sec-summary" title="Executive Summary" className="scroll-mt-6">
          <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
            {result.summary}
          </p>
        </Panel>

        {/* Presenting History */}
        {result.clinical_summary.presenting_summary && (
          <Panel id="sec-presenting" title="Presenting History" className="scroll-mt-6">
            <p className="font-sans text-sm leading-relaxed text-text-secondary">
              {result.clinical_summary.presenting_summary}
            </p>
            {result.clinical_summary.chief_complaint && (
              <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-border bg-elevated px-3.5 py-3">
                <span
                  className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-text-muted"
                  aria-hidden="true"
                >
                  report_problem
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    Chief Complaint
                  </span>
                  <span className="font-sans text-sm text-text-primary">
                    {result.clinical_summary.chief_complaint}
                  </span>
                </div>
              </div>
            )}
          </Panel>
        )}

        {/* Diagnoses & Assessment */}
        <Panel
          id="sec-diagnoses"
          title="Diagnoses & Assessment"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.clinical_summary.diagnoses_or_assessment.length}
            </Badge>
          }
        >
          {result.clinical_summary.diagnoses_or_assessment.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.clinical_summary.diagnoses_or_assessment.map((item, idx) => (
                <ClinicalListItem key={idx} text={item} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No diagnoses or assessment items extracted." />
          )}
        </Panel>

        {/* Key Findings */}
        <Panel
          id="sec-findings"
          title="Key Findings"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.clinical_summary.key_findings.length}
            </Badge>
          }
        >
          {result.clinical_summary.key_findings.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.clinical_summary.key_findings.map((item, idx) => (
                <ClinicalListItem key={idx} text={item} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No key findings identified." />
          )}
        </Panel>

        {/* Medications & Therapies */}
        <Panel
          id="sec-meds"
          title="Medications & Therapies"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.clinical_summary.medications_or_therapies.length}
            </Badge>
          }
        >
          {result.clinical_summary.medications_or_therapies.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.clinical_summary.medications_or_therapies.map((item, idx) => (
                <ClinicalListItem key={idx} text={item} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No medications or therapies detected." />
          )}
        </Panel>

        {/* Tests & Imaging */}
        <Panel
          id="sec-tests"
          title="Tests & Imaging"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.clinical_summary.tests_or_imaging.length}
            </Badge>
          }
        >
          {result.clinical_summary.tests_or_imaging.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.clinical_summary.tests_or_imaging.map((item, idx) => (
                <ClinicalListItem key={idx} text={item} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No tests or imaging procedures found." />
          )}
        </Panel>

        {/* Plan & Next Steps */}
        <Panel
          id="sec-plan"
          title="Plan & Next Steps"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.clinical_summary.plan_items.length}
            </Badge>
          }
        >
          {result.clinical_summary.plan_items.length > 0 ? (
            <ul className="flex flex-col gap-2">
              {result.clinical_summary.plan_items.map((item, idx) => (
                <ClinicalListItem key={idx} text={item} />
              ))}
            </ul>
          ) : (
            <SectionEmpty message="No plan items extracted." />
          )}
        </Panel>

        {/* Risk & Ambiguity Flags */}
        <Panel
          id="sec-risks"
          title="Risk & Ambiguity Flags"
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
                <ClinicalRiskCard key={idx} flag={flag} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No major risk or ambiguity flags detected." />
          )}
        </Panel>

        {/* Section Evidence */}
        <Panel
          id="sec-evidence"
          title="Section Evidence"
          className="scroll-mt-6"
          headerAction={
            <Badge variant="default" size="sm" uppercase={false}>
              {result.section_evidence.length}
            </Badge>
          }
        >
          {result.section_evidence.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {result.section_evidence.map((ev, idx) => (
                <ClinicalEvidenceCard key={idx} ev={ev} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No section evidence clipped." />
          )}
        </Panel>

      </div>
    </AnalysisLayout>
  );
}
