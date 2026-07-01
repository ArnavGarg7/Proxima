import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';
import { CodeReviewResult } from '@/types/code';
import { CodeMetricCard } from '@/components/code/CodeMetricCard';
import { SecurityFindingCard } from '@/components/code/SecurityFindingCard';
import { ComingSoon } from '@/components/ComingSoon';
import {
  AnalysisLayout,
  AnalysisHeader,
  AnalysisInspector,
  InspectorStat,
  AnalysisEmptyState,
  AnalysisLoading,
  ConfidenceRing,
} from '@/components/analysis';
import { Panel } from '@/components/ui/Panel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LegacyCodeResult {
  operation: string;
  language_detected: string;
  summary: string;
  result_markdown: string;
  snippet_profile: unknown;
}

type AnalysisMode = 'review' | 'explain' | 'docs' | 'optimize' | 'security';

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreBarClass(val: number): string {
  return val >= 90 ? 'bg-conf-high' : val >= 70 ? 'bg-conf-amber' : 'bg-conf-critical';
}

function scoreTextClass(val: number): string {
  return val >= 90 ? 'text-conf-high' : val >= 70 ? 'text-conf-amber' : 'text-conf-critical';
}

function severityStyle(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'critical': return 'border-conf-critical/30 bg-conf-critical/15 text-conf-critical';
    case 'high': return 'border-conf-amber/30 bg-conf-amber/15 text-conf-amber';
    case 'medium': return 'border-gold-primary/30 bg-gold-primary/15 text-gold-primary';
    case 'low': return 'border-text-muted/30 bg-text-muted/15 text-text-muted';
    default: return 'border-void-light/30 bg-void-light/15 text-text-secondary';
  }
}

const MODE_ICONS: Record<AnalysisMode, string> = {
  review:   'fact_check',
  explain:  'lightbulb',
  docs:     'menu_book',
  optimize: 'speed',
  security: 'security',
};

/* Modes that intentionally await backend implementation — rendered as polished
   product placeholders rather than dispatched to the API. */
type PlaceholderMode = 'optimize' | 'security';

const COMING_SOON: Record<PlaceholderMode, { title: string; description: string; capabilities: string[] }> = {
  optimize: {
    title: 'Optimization',
    description: 'Performance-focused code analysis is under active development.',
    capabilities: [
      'Complexity and hotspot detection',
      'Algorithmic improvement suggestions',
      'Memory and allocation insights',
      'Runtime performance scoring',
    ],
  },
  security: {
    title: 'Security Analysis',
    description: 'Dedicated security scanning is under active development.',
    capabilities: [
      'Vulnerability and CWE detection',
      'Injection and data-flow analysis',
      'Dependency risk checks',
      'Severity-ranked findings',
    ],
  },
};

// ── Sub-components ────────────────────────────────────────────────────────────

function RadarBar({ label, val }: { label: string; val: number }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-sans text-xs text-text-secondary">{label}</span>
        <span className={`font-mono text-xs font-bold ${scoreTextClass(val)}`}>{val}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-void">
        <div
          className={`h-full rounded-full ${scoreBarClass(val)}`}
          style={{ width: `${val}%` }}
        />
      </div>
    </div>
  );
}

function PriorityCard({
  priority,
  idx,
}: {
  priority: { severity: string; title: string; description: string };
  idx: number;
}) {
  return (
    <Card noPadding className="flex items-start gap-3 p-3">
      <span className="mt-0.5 font-mono text-xs font-bold text-text-muted">{idx + 1}</span>
      <div className="flex flex-col gap-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${severityStyle(priority.severity)}`}
          >
            {priority.severity}
          </span>
          <span className="font-sans text-xs font-semibold text-text-primary">{priority.title}</span>
        </div>
        <p className="line-clamp-2 font-sans text-[11px] text-text-secondary">{priority.description}</p>
      </div>
    </Card>
  );
}

function CodeEditorSidebar({
  snippet,
  mode,
  onSnippetChange,
  onRunMode,
  activeLine,
}: {
  snippet: string;
  mode: AnalysisMode;
  activeLine?: number | null;
  onSnippetChange: (v: string) => void;
  onRunMode: (m: AnalysisMode) => void;
}) {
  const modes: AnalysisMode[] = ['review', 'explain', 'docs', 'optimize', 'security'];
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (activeLine && textareaRef.current) {
      const lines = snippet.split('\n');
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
  }, [activeLine, snippet]);
  return (
    <div className="flex flex-col gap-3">
      {/* Mode selector */}
      <Panel title="Mode">
        <div className="flex flex-col gap-1">
          {modes.map(m => (
            <button
              key={m}
              type="button"
              onClick={() => onRunMode(m)}
              aria-pressed={mode === m}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold capitalize transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
                mode === m
                  ? 'border-border bg-elevated text-text-primary shadow-sm'
                  : 'border-transparent text-text-secondary hover:bg-elevated/50 hover:text-text-primary'
              )}
            >
              <span className="material-symbols-outlined text-[16px]" aria-hidden="true">{MODE_ICONS[m]}</span>
              {m}
            </button>
          ))}
        </div>
      </Panel>

      {/* Snippet editor */}
      <Panel title="Code Snippet">
        <textarea
          ref={textareaRef}
          aria-label="Code snippet"
          value={snippet}
          onChange={e => onSnippetChange(e.target.value)}
          spellCheck={false}
          className="h-64 w-full resize-y bg-void/40 font-mono text-xs text-text-primary placeholder-text-muted outline-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold-primary/40"
          placeholder="Paste code here…"
        />
      </Panel>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CodeSuite() {
  useDocumentTitle('Code Suite');
  const location = useLocation();
  const [snippet, setSnippet] = useState('');
  const [language, setLanguage] = useState('');
  const [mode, setMode] = useState<AnalysisMode>('review');
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);
  const [activeLine, setActiveLine] = useState<number | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | LegacyCodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [comingSoon, setComingSoon] = useState<PlaceholderMode | null>(null);

  useEffect(() => {
    const ctx: TemplateLaunchContext | null =
      location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx && ctx.target_workbench === 'code') {
      setTemplateContext(ctx);
      if (ctx.default_analysis_mode === 'review') setMode('review');
    }
  }, [location.state]);

  const runAnalysis = async (overrideMode?: AnalysisMode) => {
    const activeMode = overrideMode || mode;
    if (overrideMode && overrideMode !== mode) setMode(overrideMode);

    if (!snippet.trim()) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post(`/api/intelligence/code/${activeMode}`, {
        snippet,
        operation: activeMode,
        language: language || null,
      });
      setResult(res.data);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setError(e.response?.data?.detail || e.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setActiveLine(null);
    setResult(null);
    setError(null);
    setComingSoon(null);
  };

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isAnalyzing) {
    return (
      <AnalysisLoading
        title={`Running ${mode.charAt(0).toUpperCase() + mode.slice(1)} analysis…`}
        message="Inspecting snippet and synthesizing result"
      />
    );
  }

  // ── Coming soon — modes awaiting backend implementation ────────────────────

  if (comingSoon) {
    const cs = COMING_SOON[comingSoon];
    return (
      <ComingSoon
        icon={MODE_ICONS[comingSoon]}
        title={cs.title}
        description={cs.description}
        capabilities={cs.capabilities}
        onBack={() => setComingSoon(null)}
        backLabel="Back to Code Suite"
      />
    );
  }

  // ── Empty / onboarding ─────────────────────────────────────────────────────

  if (!result) {
    return (
      <AnalysisEmptyState
        icon="code"
        title="Code Suite"
        description="A dedicated code intelligence workbench for review, explanation, documentation, optimization, and security analysis."
        expectedOutput={[
          'Quality score and radar breakdown',
          'Security findings',
          'Maintainability issues',
          'Documentation gaps',
          'Review priorities',
        ]}
        supportedTypes={['Python', 'TypeScript', 'JavaScript', 'Java', 'C++', 'SQL']}
        error={error}
      >
        {templateContext && (
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        )}

        {/* Language + mode row */}
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cs-language" className="font-sans text-sm font-medium text-text-primary">
              Language
            </label>
            <select
              id="cs-language"
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text-primary
                focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
            >
              <option value="">Auto Detect</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="cs-mode" className="font-sans text-sm font-medium text-text-primary">
              Mode
            </label>
            <select
              id="cs-mode"
              value={mode}
              onChange={e => setMode(e.target.value as AnalysisMode)}
              className="rounded-md border border-border bg-surface px-3.5 py-2.5 font-sans text-sm text-text-primary
                focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
            >
              {(['review', 'explain', 'docs', 'optimize', 'security'] as const).map(m => (
                <option key={m} value={m} className="capitalize">{m.charAt(0).toUpperCase() + m.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Code textarea */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cs-snippet" className="font-sans text-sm font-medium text-text-primary">
            Code Snippet
          </label>
          <textarea
            id="cs-snippet"
            rows={10}
            value={snippet}
            onChange={e => setSnippet(e.target.value)}
            spellCheck={false}
            placeholder="Paste your code snippet here…"
            className="w-full rounded-md border border-border bg-surface p-3.5 font-mono text-sm text-text-primary
              placeholder-text-muted resize-y focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
          />
        </div>

        <Button
          variant="primary"
          onClick={() => runAnalysis()}
          disabled={!snippet.trim() && mode !== 'optimize' && mode !== 'security'}
          leftIcon={
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
              {MODE_ICONS[mode]}
            </span>
          }
          className="w-full"
        >
          {mode === 'optimize' || mode === 'security' ? 'View Availability' : 'Analyze Code'}
        </Button>
      </AnalysisEmptyState>
    );
  }

  // ── Result — three-panel workspace ─────────────────────────────────────────

  const isStructured = ['review', 'optimize', 'security'].includes(mode) && result && 'radar_scores' in result;
  const reviewResult = isStructured ? (result as CodeReviewResult) : null;
  const legacyResult = !isStructured ? (result as LegacyCodeResult) : null;

  const header = (
    <AnalysisHeader
      icon="code"
      title="Code Suite"
      documentName={
        reviewResult?.language ?? legacyResult?.language_detected ?? undefined
      }
      status={
        <Badge variant="default" size="sm" uppercase>
          {mode}
        </Badge>
      }
      actions={
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          leftIcon={
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              arrow_back
            </span>
          }
        >
          New Analysis
        </Button>
      }
    />
  );

  const sidebar = (
    <CodeEditorSidebar
      snippet={snippet}
      mode={mode}
      onSnippetChange={setSnippet}
      activeLine={activeLine}
      onRunMode={runAnalysis}
    />
  );

  // Inspector varies by result type
  const inspector = (
    <AnalysisInspector>
      {reviewResult ? (
        <>
          {/* Code quality ring */}
          <Panel title="Code Quality">
            <div className="flex flex-col items-center gap-2 py-1">
              <ConfidenceRing value={reviewResult.overall_score} size="lg" />
              <span className={`font-mono text-xl font-bold ${scoreTextClass(reviewResult.overall_score)}`}>
                {reviewResult.overall_score}
              </span>
            </div>
          </Panel>

          {/* Quality radar */}
          <Panel title="Quality Breakdown">
            <div className="flex flex-col gap-3">
              <RadarBar label="Security"        val={reviewResult.radar_scores.security}        />
              <RadarBar label="Maintainability" val={reviewResult.radar_scores.maintainability} />
              <RadarBar label="Documentation"   val={reviewResult.radar_scores.documentation}   />
              <RadarBar label="Performance"     val={reviewResult.radar_scores.performance}     />
            </div>
          </Panel>

          {/* Signals */}
          {reviewResult.deterministic_signals && reviewResult.deterministic_signals.length > 0 && (
            <Panel title="Signals">
              <div className="flex flex-wrap gap-1.5">
                {reviewResult.deterministic_signals.map((sig, idx) => (
                  <Chip key={idx} variant="default">{sig}</Chip>
                ))}
              </div>
            </Panel>
          )}

          {/* Engine */}
          <Panel title="Engine">
            <div className="flex flex-col gap-2">
              <InspectorStat icon="bolt"      label="Analyzer" value="Code Suite"  />
              <InspectorStat icon="tune"      label="Mode" value={mode.charAt(0).toUpperCase() + mode.slice(1)}  />
              <InspectorStat icon="code"      label="Language" value={reviewResult.language} />
            </div>
          </Panel>
        </>
      ) : legacyResult ? (
        <>
          <Panel title="Operation">
            <div className="flex flex-col gap-3">
              <InspectorStat icon={MODE_ICONS[mode as AnalysisMode] ?? 'code'} label="Mode"     value={mode.charAt(0).toUpperCase() + mode.slice(1)} />
              <InspectorStat icon="translate"                                  label="Language" value={legacyResult.language_detected || 'Auto-detected'} />
            </div>
          </Panel>
          <Panel title="Engine">
            <InspectorStat icon="bolt" label="Analyzer" value="Code Suite" />
          </Panel>
        </>
      ) : null}
    </AnalysisInspector>
  );

  return (
    <AnalysisLayout header={header} sidebar={sidebar} inspector={inspector}>
      <div className="flex flex-col gap-6">

        {/* Mobile editor — visible on < xl only (desktop sidebar carries this) */}
        <div className="xl:hidden">
          <CodeEditorSidebar
            snippet={snippet}
            mode={mode}
            onSnippetChange={setSnippet}
            onRunMode={runAnalysis}
          />
        </div>

        {/* ── Review workbench ── */}
        {reviewResult && (
          <>
            {/* Executive Summary */}
            <Panel id="sec-summary" title="Executive Summary" className="scroll-mt-6">
              <p className="font-sans text-sm leading-relaxed text-text-primary">
                {reviewResult.executive_summary}
              </p>
            </Panel>

            {/* Code Profile */}
            <Panel id="sec-profile" title="Code Profile" className="scroll-mt-6">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
                <CodeMetricCard label="Lines"             value={reviewResult.metrics.lines}                              icon="notes"                   />
                <CodeMetricCard label="Functions"         value={reviewResult.metrics.functions}                          icon="function"                />
                <CodeMetricCard label="Complexity"        value={reviewResult.metrics.estimated_cyclomatic_complexity}    icon="account_tree"            color="text-gold-primary" />
                <CodeMetricCard label="Comment Ratio"     value={`${reviewResult.metrics.comment_ratio}%`}               icon="chat"                    />
                <CodeMetricCard label="Avg Function"      value={reviewResult.metrics.average_function}                   icon="align_vertical_center"   />
                <CodeMetricCard label="Longest Function"  value={reviewResult.metrics.longest_function}                   icon="straighten"              />
              </div>
            </Panel>

            {/* Review Priorities */}
            {reviewResult.review_priorities && reviewResult.review_priorities.length > 0 && (
              <Panel
                id="sec-priorities"
                title="Review Priorities"
                className="scroll-mt-6"
                headerAction={
                  <Badge variant="default" size="sm" uppercase={false}>
                    {reviewResult.review_priorities.length}
                  </Badge>
                }
              >
                <div className="flex flex-col gap-3">
                  {reviewResult.review_priorities.map((p, idx) => (
                    <PriorityCard key={idx} priority={p} idx={idx} />
                  ))}
                </div>
              </Panel>
            )}

            {/* Security Findings */}
            {reviewResult.security_findings && (
              <Panel
                id="sec-security"
                title="Security Findings"
                className="scroll-mt-6 border-conf-critical/20"
                headerAction={
                  <Badge variant="error" size="sm" uppercase={false}>
                    {reviewResult.security_findings.length}
                  </Badge>
                }
              >
                <div className="flex flex-col gap-4">
                  {reviewResult.security_findings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center bg-elevated/50 rounded-lg border border-border/50">
                      <span className="material-symbols-outlined text-conf-high text-3xl mb-2">verified_user</span>
                      <span className="font-sans text-sm font-medium text-text-primary">No security vulnerabilities detected.</span>
                      <span className="font-sans text-xs text-text-muted mt-1">Your code is secure.</span>
                    </div>
                  ) : reviewResult.security_findings.map((f, i) => (
                    <SecurityFindingCard key={i} finding={f} onLineClick={setActiveLine} />
                  ))}
                </div>
              </Panel>
            )}

            {/* Maintainability Findings */}
            {reviewResult.maintainability_findings && reviewResult.maintainability_findings.length > 0 && (
              <Panel
                id="sec-maintainability"
                title="Maintainability"
                className="scroll-mt-6"
                headerAction={
                  <Badge variant="warning" size="sm" uppercase={false}>
                    {reviewResult.maintainability_findings.length}
                  </Badge>
                }
              >
                <div className="flex flex-col gap-4">
                  {reviewResult.maintainability_findings.map((f, i) => (
                    <SecurityFindingCard key={i} finding={f} onLineClick={setActiveLine} />
                  ))}
                </div>
              </Panel>
            )}

            {/* Performance Findings */}
            {reviewResult.performance_findings && (
              <Panel
                id="sec-performance"
                title="Performance & Optimization"
                className="scroll-mt-6 border-conf-amber/20"
                headerAction={
                  <Badge variant="warning" size="sm" uppercase={false}>
                    {reviewResult.performance_findings.length}
                  </Badge>
                }
              >
                <div className="flex flex-col gap-4">
                  {reviewResult.performance_findings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 text-center bg-elevated/50 rounded-lg border border-border/50">
                      <span className="material-symbols-outlined text-conf-high text-3xl mb-2">check_circle</span>
                      <span className="font-sans text-sm font-medium text-text-primary">No optimization opportunities detected.</span>
                      <span className="font-sans text-xs text-text-muted mt-1">Great job.</span>
                    </div>
                  ) : reviewResult.performance_findings.map((f, i) => (
                    <SecurityFindingCard key={i} finding={f} onLineClick={setActiveLine} />
                  ))}
                </div>
              </Panel>
            )}

            {/* Documentation Findings */}
            {reviewResult.documentation_findings && reviewResult.documentation_findings.length > 0 && (
              <Panel
                id="sec-documentation"
                title="Documentation"
                className="scroll-mt-6"
                headerAction={
                  <Badge variant="default" size="sm" uppercase={false}>
                    {reviewResult.documentation_findings.length}
                  </Badge>
                }
              >
                <div className="flex flex-col gap-4">
                  {reviewResult.documentation_findings.map((f, i) => (
                    <SecurityFindingCard key={i} finding={f} onLineClick={setActiveLine} />
                  ))}
                </div>
              </Panel>
            )}
          </>
        )}

        {/* ── Legacy result (explain / docs / optimize / security) ── */}
        {legacyResult && (
          <Panel id="sec-result" title={legacyResult.operation === 'explain' ? 'Explanation' : 'Generated Output'} className="scroll-mt-6">
            <p className="mb-6 font-sans text-sm font-medium leading-relaxed text-text-primary">
              {legacyResult.summary}
            </p>
            <div className="prose prose-invert prose-sm max-w-none rounded-xl border border-border bg-surface p-6 text-text-secondary">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {legacyResult.result_markdown || 'No output was generated for this snippet.'}
              </ReactMarkdown>
            </div>
          </Panel>
        )}

      </div>
    </AnalysisLayout>
  );
}
