import { useEffect, useState, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { GeneralAnalysisResult } from '@/types/analyze';
import { TakeawayCard } from '@/components/analyze/TakeawayCard';
import { TopicCard } from '@/components/analyze/TopicCard';
import { EntityCard } from '@/components/analyze/EntityCard';
import { ActionItemCard } from '@/components/analyze/ActionItemCard';
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
import { FadeUp } from '@/components/motion';
import { Panel } from '@/components/ui/Panel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { confidenceLabel } from '@/lib/confidence';
import { useCopyFeedback } from '@/hooks/useCopyFeedback';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

/* Risk level → presentation tokens */
const RISK_STYLES: Record<string, { icon: string; tone: string }> = {
  High:   { icon: 'error',   tone: 'text-conf-critical' },
  Medium: { icon: 'warning', tone: 'text-conf-amber' },
  Low:    { icon: 'info',    tone: 'text-conf-high' },
};

/* Small muted placeholder shown inside a section Panel with no results */
function SectionEmpty({ message }: { message: string }) {
  return (
    <p className="py-2 text-center font-sans text-sm text-text-muted">{message}</p>
  );
}

export default function Analyze() {
  useDocumentTitle('Analyze');
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document_id');
  const templateOrigin = searchParams.get('template');

  const [documents, setDocuments] = useState<{ id: string; title: string; created_at: string }[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);

  const [result, setResult] = useState<GeneralAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch documents for the selector
  useEffect(() => {
    const fetchDocs = async () => {
      try {
        const res = await api.get('/api/documents/');
        setDocuments(res.data);
        if (res.data.length > 0) {
          setSelectedDocId(res.data[0].id);
        }
      } catch (err) {
        console.error("Failed to load documents", err);
      } finally {
        setLoadingDocs(false);
      }
    };
    fetchDocs();
  }, []);

  useEffect(() => {
    if (documentId) {
      setSelectedDocId(documentId);
    }
  }, [documentId]);

  const runAnalysis = useCallback(async () => {
    if (!selectedDocId) {
      setError("No document specified.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload: Record<string, string> = { document_id: selectedDocId };
      if (templateOrigin) {
        payload.template_origin = templateOrigin;
      }

      const res = await api.post('/api/intelligence/analyze', payload);
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e.response?.data?.detail || e.message || "Analysis failed.");
    } finally {
      setLoading(false);
    }
  }, [selectedDocId, templateOrigin]);

  useEffect(() => {
    if (documentId) {
      runAnalysis();
    } else {
      setLoading(false);
    }
  }, [documentId, runAnalysis]);

  /* ── Derived (hooks must precede early returns) ────────────────────────── */

  const selectedDoc = documents.find((d) => d.id === selectedDocId);

  const outlineItems = useMemo<OutlineItem[]>(() => {
    if (!result) return [];
    return [
      { id: 'sec-summary',   label: 'Executive Summary', icon: 'summarize' },
      { id: 'sec-takeaways', label: 'Key Takeaways',     icon: 'lightbulb', count: result.takeaways.length },
      { id: 'sec-topics',    label: 'Topics',            icon: 'category',  count: result.topics.length },
      { id: 'sec-entities',  label: 'Named Entities',    icon: 'group',     count: result.entities.length },
      { id: 'sec-actions',   label: 'Action Items',      icon: 'checklist', count: result.actions.length },
      { id: 'sec-numbers',   label: 'Numerical Insights',icon: 'bar_chart', count: result.numbers.length },
      { id: 'sec-risks',     label: 'Risks',             icon: 'warning',   count: result.risks.length },
    ];
  }, [result]);

  /* Client-side export — serializes the existing result, no API change */
  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDoc?.title ?? 'document'}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { copied, copy } = useCopyFeedback();

  const handleCopySummary = () => {
    if (result?.executive_summary) {
      copy(result.executive_summary);
    }
  };

  /* ── Loading ───────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <AnalysisLoading
        title="Analyzing Document…"
        message="Extracting intelligence across general domains"
      />
    );
  }

  /* ── Empty / onboarding (also surfaces run errors) ─────────────────────── */

  if (!result) {
    return (
      <AnalysisEmptyState
        icon="hub"
        title="General Intelligence"
        description="Select a document to extract executive summaries, themes, named entities, and action items."
        expectedOutput={[
          'Executive summary',
          'Key takeaways',
          'Topics & entities',
          'Action items',
          'Numerical insights',
          'Risk signals',
        ]}
        supportedTypes={['PDF', 'DOCX', 'TXT']}
        error={error}
      >
        <label htmlFor="analyze-doc" className="font-sans text-sm font-medium text-text-primary">
          Select a document to analyze
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
              id="analyze-doc"
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
              leftIcon={<span className="material-symbols-outlined text-[18px]" aria-hidden="true">bolt</span>}
              className="w-full"
            >
              Analyze Document
            </Button>
          </>
        )}
      </AnalysisEmptyState>
    );
  }

  /* ── Result — three-panel workspace ────────────────────────────────────── */

  const header = (
    <AnalysisHeader
      icon="hub"
      title="General Intelligence"
      documentName={selectedDoc?.title}
      status={<Badge variant="success" size="sm">Complete</Badge>}
      confidence={result.confidence}
      actions={
        <>
          <Button
            variant="secondary"
            size="sm"
            onClick={runAnalysis}
            leftIcon={<span className="material-symbols-outlined text-[16px]" aria-hidden="true">refresh</span>}
          >
            Re-run
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
            leftIcon={<span className="material-symbols-outlined text-[16px]" aria-hidden="true">download</span>}
          >
            Export
          </Button>
        </>
      }
    />
  );

  const sidebar = <AnalysisSidebar items={outlineItems} />;

  const inspector = (
    <AnalysisInspector>
      {/* Overall confidence */}
      <FadeUp index={0}>
        <Panel title="Overall Confidence">
          <div className="flex flex-col items-center gap-3 py-1">
            <ConfidenceRing value={result.confidence} size="lg" />
            <span className="font-sans text-sm font-medium text-text-secondary">
              {confidenceLabel(result.confidence)}
            </span>
          </div>
        </Panel>
      </FadeUp>

      {/* Document statistics */}
      <FadeUp index={1}>
        <Panel title="Document Statistics">
          <div className="flex flex-col gap-3">
            <InspectorStat icon="schedule"    label="Reading time" value={`${result.metadata.reading_time_minutes} min`} />
            <InspectorStat icon="format_size" label="Word count"   value={result.metadata.word_count.toLocaleString()} />
            <InspectorStat icon="language"    label="Language"     value={result.metadata.language.toUpperCase()} />
          </div>
        </Panel>
      </FadeUp>

      {/* Signals used */}
      <FadeUp index={2}>
        <Panel title="Signals Used">
          {result.signals.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {result.signals.map((sig, idx) => (
                <Chip key={idx} variant="default">{sig}</Chip>
              ))}
            </div>
          ) : (
            <p className="font-sans text-sm text-text-muted">No signals detected.</p>
          )}
        </Panel>
      </FadeUp>

      {/* Engine / export */}
      <FadeUp index={3}>
        <Panel title="Engine">
          <div className="flex flex-col gap-3">
            <InspectorStat icon="bolt" label="Analyzer" value="General" />
            <p className="font-sans text-xs leading-relaxed text-text-muted">
              Multi-domain extraction with evidence-backed citations.
            </p>
            <div className="flex flex-col gap-2 pt-1">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExport}
                leftIcon={<span className="material-symbols-outlined text-[15px]" aria-hidden="true">download</span>}
                className="w-full"
              >
                Download JSON
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopySummary}
                leftIcon={
                  <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                }
                className={cn('w-full transition-colors', copied && 'text-conf-high')}
              >
                {copied ? 'Copied!' : 'Copy summary'}
              </Button>
            </div>
          </div>
        </Panel>
      </FadeUp>
    </AnalysisInspector>
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector} mobileContents={outlineItems}>
      <div key={selectedDocId} className="flex flex-col gap-6">

        {/* Executive Summary */}
        <FadeUp index={0}>
          <Panel id="sec-summary" title="Executive Summary" className="scroll-mt-6">
            <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-text-secondary">
              {result.executive_summary}
            </p>
          </Panel>
        </FadeUp>

        {/* Key Takeaways */}
        <FadeUp index={1}>
          <Panel
            id="sec-takeaways"
            title="Key Takeaways"
            className="scroll-mt-6"
            headerAction={<Badge variant="default" size="sm" uppercase={false}>{result.takeaways.length}</Badge>}
          >
            {result.takeaways.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.takeaways.map((takeaway, idx) => (
                  <TakeawayCard key={idx} takeaway={takeaway} />
                ))}
              </div>
            ) : (
              <SectionEmpty message="No key takeaways identified." />
            )}
          </Panel>
        </FadeUp>

        {/* Topics */}
        <FadeUp index={2}>
          <Panel
            id="sec-topics"
            title="Topics"
            className="scroll-mt-6"
            headerAction={<Badge variant="default" size="sm" uppercase={false}>{result.topics.length}</Badge>}
          >
            {result.topics.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.topics.map((topic, idx) => (
                  <TopicCard key={idx} topic={topic} />
                ))}
              </div>
            ) : (
              <SectionEmpty message="No distinct topics extracted." />
            )}
          </Panel>
        </FadeUp>

        {/* Named Entities */}
        <FadeUp index={3}>
          <Panel
            id="sec-entities"
            title="Named Entities"
            className="scroll-mt-6"
            headerAction={<Badge variant="default" size="sm" uppercase={false}>{result.entities.length}</Badge>}
          >
            {result.entities.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.entities.map((ent, idx) => (
                  <EntityCard key={idx} entity={ent} />
                ))}
              </div>
            ) : (
              <SectionEmpty message="No significant entities found." />
            )}
          </Panel>
        </FadeUp>

        {/* Action Items */}
        <FadeUp index={4}>
          <Panel
            id="sec-actions"
            title="Action Items"
            className="scroll-mt-6"
            headerAction={<Badge variant="default" size="sm" uppercase={false}>{result.actions.length}</Badge>}
          >
            {result.actions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.actions.map((act, idx) => (
                  <ActionItemCard key={idx} action={act} />
                ))}
              </div>
            ) : (
              <SectionEmpty message="No action items found." />
            )}
          </Panel>
        </FadeUp>

        {/* Numerical Insights */}
        <FadeUp index={5}>
          <Panel
            id="sec-numbers"
            title="Numerical Insights"
            className="scroll-mt-6"
            headerAction={<Badge variant="default" size="sm" uppercase={false}>{result.numbers.length}</Badge>}
          >
            {result.numbers.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {result.numbers.map((num, idx) => (
                  <Card key={idx} noPadding className="flex flex-col gap-2 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-sans text-xs font-semibold uppercase tracking-wider text-text-muted">
                        {num.metric}
                      </span>
                      <span className="font-mono text-lg font-bold text-gold-primary">{num.value}</span>
                    </div>
                    <p className="font-sans text-xs text-text-secondary">{num.context}</p>
                  </Card>
                ))}
              </div>
            ) : (
              <SectionEmpty message="No significant numerical metrics found." />
            )}
          </Panel>
        </FadeUp>

        {/* Risks */}
        <FadeUp index={6}>
          <Panel
            id="sec-risks"
            title="Risks"
            className="scroll-mt-6"
            headerAction={<Badge variant="default" size="sm" uppercase={false}>{result.risks.length}</Badge>}
          >
            {result.risks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.risks.map((risk, idx) => {
                  const style = RISK_STYLES[risk.level] ?? RISK_STYLES.Low;
                  return (
                    <Card key={idx} noPadding className="flex items-start gap-3 p-4">
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 ${style.tone}`} aria-hidden="true">
                        {style.icon}
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${style.tone}`}>
                          {risk.level} Risk
                        </span>
                        <p className="font-sans text-sm leading-relaxed text-text-primary">{risk.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <SectionEmpty message="No significant risks identified." />
            )}
          </Panel>
        </FadeUp>

      </div>
    </AnalysisLayout>
  );
}
