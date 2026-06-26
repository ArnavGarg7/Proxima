import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/axios';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';
import { CodeReviewResult } from '@/types/code';
import { CodeMetricCard } from '@/components/code/CodeMetricCard';
import { SecurityFindingCard } from '@/components/code/SecurityFindingCard';

// Legacy Result
interface LegacyCodeResult {
  operation: string;
  language_detected: string;
  summary: string;
  result_markdown: string;
  snippet_profile: any /* eslint-disable-line @typescript-eslint/no-explicit-any */;
}

export default function CodeSuite() {
  const location = useLocation();
  const [snippet, setSnippet] = useState('');
  const [language, setLanguage] = useState('');
  const [mode, setMode] = useState<'review' | 'explain' | 'docs' | 'optimize' | 'security'>('review');
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | LegacyCodeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctx: TemplateLaunchContext | null =
      location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx && ctx.target_workbench === 'code') {
      setTemplateContext(ctx);
      if (ctx.default_analysis_mode === 'review') setMode('review');
    }
  }, [location.state]);

  const runAnalysis = async (overrideMode?: 'review' | 'explain' | 'docs' | 'optimize' | 'security') => {
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
        language: language || null
      });
      setResult(res.data);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
  };

  const renderLegacyResult = (res: LegacyCodeResult) => (
    <div className="p-8 space-y-8">
      <div className="font-sans text-lg text-text-primary font-medium leading-relaxed">
        {res.summary}
      </div>
      <div className="space-y-4">
        <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">description</span>
          {res.operation === 'explain' ? 'Explanation' : 'Generated Documentation'}
        </h3>
        <div className="prose prose-invert prose-sm max-w-none text-text-secondary bg-surface p-6 rounded-xl border border-border">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {res.result_markdown || (
              mode === 'optimize' ? 'Optimization mode will be available in a future release. Current implementation supports Review, Explain and Documentation.' :
              mode === 'security' ? 'Security mode will be available in a future release. Current implementation supports Review, Explain and Documentation.' :
              'Coming soon'
            )}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );

  const renderReviewWorkbench = (res: CodeReviewResult) => {
    return (
      <div className="flex-1 overflow-y-auto p-8 flex gap-8 bg-void">
        
        {/* LEFT SIDEBAR */}
        <div className="w-[340px] shrink-0 flex flex-col gap-6">
          <div className="bg-elevated border border-border rounded-xl p-6 shadow-sm">
            <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Executive Summary</h3>
            <p className="font-sans text-sm text-text-primary leading-relaxed">
              {res.executive_summary}
            </p>
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 shadow-sm text-center relative overflow-hidden flex items-center justify-between">
            <div className={`absolute left-0 top-0 w-1 h-full ${
                res.overall_score >= 90 ? 'bg-conf-high' : 
                res.overall_score >= 70 ? 'bg-conf-amber' : 'bg-conf-critical'
              }`} 
            />
            <div className="text-left ml-2">
              <h2 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Overall Quality</h2>
              <div className="font-sans text-xs font-medium text-text-primary">{res.language}</div>
            </div>
            <div className={`font-display text-4xl leading-none ${
                res.overall_score >= 90 ? 'text-conf-high' : 
                res.overall_score >= 70 ? 'text-conf-amber' : 'text-conf-critical'
              }`}>
              {res.overall_score}
            </div>
          </div>

          <div className="bg-elevated border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">radar</span>
              Quality Radar
            </h3>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Security', val: res.radar_scores.security },
                { label: 'Maintainability', val: res.radar_scores.maintainability },
                { label: 'Documentation', val: res.radar_scores.documentation },
                { label: 'Performance', val: res.radar_scores.performance },
              ].map(r => (
                <div key={r.label} className="flex flex-col gap-1.5 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-text-secondary">{r.label}</span>
                    <span className={`font-mono font-bold ${r.val >= 90 ? 'text-conf-high' : r.val >= 70 ? 'text-conf-amber' : 'text-conf-critical'}`}>
                      {r.val}
                    </span>
                  </div>
                  <div className="w-full bg-void rounded-full h-1.5 overflow-hidden">
                    <div className={`h-full rounded-full ${r.val >= 90 ? 'bg-conf-high' : r.val >= 70 ? 'bg-conf-amber' : 'bg-conf-critical'}`} style={{ width: `${r.val}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {res.review_priorities?.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">rule</span>
                Reviewer Priorities
              </h3>
              <div className="flex flex-col gap-3">
                {res.review_priorities.map((p, idx) => (
                  <div key={idx} className="p-3 bg-elevated border border-border rounded-lg text-left shadow-sm flex gap-3 items-start">
                    <span className="font-mono text-xs font-bold text-text-muted mt-0.5">{idx + 1}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                          p.severity.toLowerCase() === 'high' ? 'bg-conf-critical/15 text-conf-critical border border-conf-critical/30' :
                          p.severity.toLowerCase() === 'medium' ? 'bg-conf-amber/15 text-conf-amber border border-conf-amber/30' :
                          'bg-conf-low/15 text-conf-low border border-conf-low/30'
                        }`}>{p.severity}</span>
                        <h4 className="font-sans text-xs font-semibold text-text-primary">{p.title}</h4>
                      </div>
                      <p className="font-sans text-[11px] text-text-secondary line-clamp-2">{p.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {res.deterministic_signals?.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                Signals Used
              </h3>
              <div className="flex flex-wrap gap-2">
                {res.deterministic_signals.map((sig, idx) => (
                  <span key={idx} className="px-2 py-1 rounded bg-elevated border border-border text-[11px] font-sans text-text-primary">
                    {sig}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex-1 flex flex-col gap-6 max-w-4xl pb-10">
          <div className="space-y-4">
            <h3 className="font-display text-xl text-text-primary border-b border-border pb-2">Code Profile</h3>
            <div className="grid grid-cols-3 gap-4">
              <CodeMetricCard label="Lines" value={res.metrics.lines} icon="notes" />
              <CodeMetricCard label="Functions" value={res.metrics.functions} icon="function" />
              <CodeMetricCard label="Complexity" value={res.metrics.estimated_cyclomatic_complexity} icon="account_tree" color="text-gold-primary" />
              <CodeMetricCard label="Comment Ratio" value={`${res.metrics.comment_ratio}%`} icon="chat" />
              <CodeMetricCard label="Avg Function" value={res.metrics.average_function} icon="align_vertical_center" />
              <CodeMetricCard label="Longest Function" value={res.metrics.longest_function} icon="straighten" />
            </div>
          </div>

          {res.security_findings?.length > 0 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-display text-xl text-conf-critical border-b border-conf-critical/20 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">security</span>
                Security Findings
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {res.security_findings.map((f, i) => <SecurityFindingCard key={i} finding={f} />)}
              </div>
            </div>
          )}

          {res.maintainability_findings?.length > 0 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-display text-xl text-conf-amber border-b border-conf-amber/20 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">handyman</span>
                Maintainability
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {res.maintainability_findings.map((f, i) => <SecurityFindingCard key={i} finding={f} />)}
              </div>
            </div>
          )}
          
          {res.documentation_findings?.length > 0 && (
            <div className="space-y-4 mt-4">
              <h3 className="font-display text-xl text-blue-500 border-b border-blue-500/20 pb-2 flex items-center gap-2">
                <span className="material-symbols-outlined">menu_book</span>
                Documentation
              </h3>
              <div className="grid grid-cols-1 gap-4">
                {res.documentation_findings.map((f, i) => <SecurityFindingCard key={i} finding={f} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (result || isAnalyzing) {
    const isWorkbench = mode === 'review' && result && 'radar_scores' in result;
    return (
      <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex gap-6 overflow-hidden">
        {/* Left Side: Controls */}
        <div className="w-[300px] shrink-0 flex flex-col gap-4">
          <header className="flex justify-between items-center">
            <h1 className="font-display text-2xl text-text-primary">Code Suite</h1>
            <button onClick={handleReset} className="text-text-secondary hover:text-text-primary font-sans text-sm underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            </button>
          </header>

          <div className="flex flex-col gap-2 bg-surface p-2 border border-border rounded-xl">
            {['review', 'explain', 'docs', 'optimize', 'security'].map((m) => (
              <button 
                key={m}
                onClick={() => { setMode(m as 'review'); runAnalysis(m as 'review'); }}
                className={`flex-1 py-2 px-3 text-xs font-bold rounded capitalize transition-colors text-left flex items-center gap-2 ${mode === m ? 'bg-elevated text-primary shadow-sm border border-border' : 'text-text-secondary hover:text-text-primary hover:bg-elevated/50 border border-transparent'}`}
              >
                <span className="material-symbols-outlined text-[16px]">
                  {m === 'review' ? 'fact_check' : m === 'explain' ? 'lightbulb' : m === 'docs' ? 'menu_book' : m === 'optimize' ? 'speed' : 'security'}
                </span>
                {m}
              </button>
            ))}
          </div>

          <div className="flex-1 bg-surface border border-border rounded-xl flex flex-col overflow-hidden">
            <textarea 
              className="w-full flex-1 bg-surface text-text-primary p-4 font-mono text-xs resize-none outline-none focus:ring-1 focus:ring-primary/50"
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
            />
          </div>
        </div>

        {/* Right Side: Results Panel */}
        <div className={`flex-1 bg-elevated border border-border rounded-xl flex flex-col overflow-hidden relative`}>
          {isAnalyzing ? (
             <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-4">
               <span className="material-symbols-outlined animate-spin text-4xl text-primary">sync</span>
               <p className="font-sans text-sm animate-pulse">Inspecting snippet and synthesizing {mode}...</p>
             </div>
          ) : result ? (
             isWorkbench ? renderReviewWorkbench(result as CodeReviewResult) : renderLegacyResult(result as LegacyCodeResult)
          ) : null}
        </div>
      </div>
    );
  }

  // Initial Empty State
  return (
    <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-[1000px] space-y-8 mt-10">
        <header className="text-left w-full">
          <h1 className="font-display text-4xl text-text-primary mb-3">Code Suite</h1>
          <p className="font-sans text-base text-text-secondary">A dedicated code intelligence workbench for explanation, review, and documentation.</p>
        </header>

        {templateContext && <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />}

        {error && (
          <div className="bg-conf-critical/10 border border-conf-critical/20 p-4 rounded-xl text-conf-critical flex items-start gap-3">
            <span className="material-symbols-outlined">error</span>
            <p className="font-sans text-sm text-conf-critical/80 mt-0.5">{error}</p>
          </div>
        )}

        <div className="bg-elevated border border-border rounded-2xl p-6 shadow-sm">
          <div className="flex gap-4 mb-6">
            <select 
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="bg-surface border border-border text-text-primary rounded-lg px-4 py-2 font-sans text-sm focus:ring-1 focus:ring-primary focus:outline-none w-48"
            >
              <option value="">▼ Auto Detect</option>
              <option value="python">Python</option>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="sql">SQL</option>
            </select>
          </div>

          <div className="relative mb-6">
            <textarea 
              className="w-full h-[300px] bg-surface text-text-primary p-4 font-mono text-sm rounded-xl border border-border focus:ring-1 focus:ring-primary focus:outline-none resize-y"
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              placeholder="Paste your code snippet here..."
            />
          </div>

          <button 
            onClick={() => runAnalysis()}
            disabled={isAnalyzing || !snippet.trim()}
            className="w-full bg-primary text-void py-3 rounded-lg font-sans text-sm font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            Analyze Code
          </button>
        </div>
      </div>
    </div>
  );
}
