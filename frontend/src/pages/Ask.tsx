import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnalysisLayout, AnalysisInspector, AnalysisEmptyState } from '@/components/analysis';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/axios';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
  ScopeSelector,
  QuestionComposer,
  StreamingAnswer,
  GroundingIndicator,
  EvidencePanel,
  JobStatus,
} from '@/components/intelligence';
import {
  useIntelligenceStream,
  type Citation,
  type IntelligenceScope,
} from '@/hooks/useIntelligenceStream';

export default function Ask() {
  useDocumentTitle('Ask');
  const [searchParams] = useSearchParams();
  const activeDocumentId = searchParams.get('document_id');

  const [scope, setScope] = useState<IntelligenceScope>(
    activeDocumentId ? { mode: 'document', documentId: activeDocumentId } : { mode: 'library' },
  );
  const [selected, setSelected] = useState<Citation | null>(null);
  const [asked, setAsked] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  const { answer, finalText, citations, grounding, qhe, status, error, ask, cancel } = useIntelligenceStream();

  const streaming = status === 'streaming' || status === 'finalizing';
  const scopeReady =
    scope.mode === 'library' ||
    (scope.mode === 'document' && !!scope.documentId) ||
    (scope.mode === 'selected' && scope.documentIds.length > 0);

  const handleAsk = (question: string) => {
    setSelected(null);
    setAsked(true);
    ask(scope, question);
  };

  const runBackgroundAnalysis = async () => {
    if (scope.mode !== 'document') return;
    setJobError(null);
    try {
      const res = await api.post('/api/intelligence/analyze/async', { document_id: scope.documentId });
      setJobId(res.data.job_id);
    } catch {
      setJobError('Could not start background analysis.');
    }
  };

  const header = (
    <div className="flex items-center gap-3">
      <span className="material-symbols-outlined text-[28px] text-gold-primary" aria-hidden="true">forum</span>
      <div>
        <h1 className="font-display text-2xl font-semibold text-text-primary">Ask</h1>
        <p className="font-sans text-sm text-text-secondary">
          Grounded answers across your documents, with verifiable citations.
        </p>
      </div>
    </div>
  );

  const sidebar = (
    <div className="flex flex-col gap-5">
      <ScopeSelector
        scope={scope}
        onChange={setScope}
        activeDocumentId={activeDocumentId}
        disabled={streaming}
      />
      {scope.mode === 'document' && (
        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
            Background analysis
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={runBackgroundAnalysis}
            disabled={!!jobId}
            leftIcon={<span className="material-symbols-outlined text-[16px]" aria-hidden="true">neurology</span>}
          >
            Analyze document
          </Button>
          {jobId && <JobStatus jobId={jobId} />}
          {jobError && <span className="font-sans text-xs text-conf-critical">{jobError}</span>}
        </div>
      )}
    </div>
  );

  const inspector = useMemo(
    () => (
      <AnalysisInspector>
        <GroundingIndicator grounding={grounding} qhe={qhe} citationCount={citations.length} />
        <EvidencePanel citation={selected} />
      </AnalysisInspector>
    ),
    [grounding, qhe, citations.length, selected],
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector}>
      <div className="flex flex-col gap-6">
        <Panel title="Question">
          <QuestionComposer
            onSubmit={handleAsk}
            onCancel={cancel}
            streaming={streaming}
            disabled={!scopeReady}
          />
          {!scopeReady && (
            <p className="mt-2 font-sans text-xs text-conf-amber">
              Select at least one processed document to ask.
            </p>
          )}
        </Panel>

        {!asked ? (
          <AnalysisEmptyState
            icon="forum"
            title="Ask anything about your documents"
            description="Choose a scope, type a question, and get a streamed answer grounded in your documents with citations you can inspect."
            expectedOutput={[
              'Streamed natural-language answer',
              'Authoritative [Ref N] citations',
              'Document + page evidence',
              'Grounding & confidence signals',
            ]}
          />
        ) : (
          <Panel title="Answer">
            {status === 'error' && (
              <div
                role="alert"
                className="mb-3 flex items-start gap-2 rounded-lg border border-conf-critical/25 bg-conf-critical/10 p-3 text-conf-critical"
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">error</span>
                <span className="font-sans text-sm">{error}</span>
              </div>
            )}
            {status === 'cancelled' && (
              <p className="mb-3 font-sans text-xs text-text-muted">Stopped.</p>
            )}
            <StreamingAnswer
              answer={answer}
              finalText={finalText}
              citations={citations}
              status={status}
              activeRef={selected?.ref_key ?? null}
              onSelectCitation={setSelected}
            />
          </Panel>
        )}
      </div>
    </AnalysisLayout>
  );
}
