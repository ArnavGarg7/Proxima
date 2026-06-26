import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '@/lib/axios';
import { GeneralAnalysisResult } from '@/types/analyze';
import { TakeawayCard } from '@/components/analyze/TakeawayCard';
import { TopicCard } from '@/components/analyze/TopicCard';
import { EntityCard } from '@/components/analyze/EntityCard';
import { ActionItemCard } from '@/components/analyze/ActionItemCard';

export default function Analyze() {
  const [searchParams] = useSearchParams();
  const documentId = searchParams.get('document_id');
  const templateOrigin = searchParams.get('template');
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documents, setDocuments] = useState<any[]>([]);
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

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-void min-h-[calc(100vh-60px)]">
        <div className="w-12 h-12 border-4 border-gold-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="font-display text-xl text-text-primary mb-2">Analyzing Document...</h2>
        <p className="text-text-secondary">Extracting intelligence across general domains</p>
      </div>
    );
  }

  if (!result && !loading) {
    return (
      <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex flex-col items-center justify-center">
        <div className="w-full max-w-[600px] text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-3xl text-indigo-500">hub</span>
          </div>
          <div>
            <h1 className="font-display text-4xl text-text-primary mb-3">General Intelligence</h1>
            <p className="font-sans text-base text-text-secondary max-w-md mx-auto">
              Select a document to extract executive summaries, themes, named entities, and action items.
            </p>
          </div>

          {error && (
            <div className="bg-conf-critical/10 border border-conf-critical/20 p-4 rounded-lg text-conf-critical flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center gap-4 max-w-md mx-auto">
            <label className="font-sans text-sm font-medium text-text-primary">Select Document to Analyze</label>
            {loadingDocs ? (
              <div className="text-text-muted text-sm">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-text-muted text-sm">No documents available. Upload one in Workspace first.</div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <select 
                  value={selectedDocId} 
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="bg-surface border border-border text-text-primary rounded-lg px-4 py-2 w-full focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-sans"
                >
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>{doc.title} ({new Date(doc.created_at).toLocaleDateString()})</option>
                  ))}
                </select>
                <button 
                  onClick={runAnalysis}
                  disabled={!selectedDocId}
                  className="bg-gold-primary text-void px-6 py-2.5 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">bolt</span>
                  Analyze Document
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error && !result && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-void min-h-[calc(100vh-60px)]">
        <span className="material-symbols-outlined text-conf-critical text-6xl mb-4">error</span>
        <h2 className="font-display text-2xl text-text-primary mb-2">Analysis Failed</h2>
        <p className="text-text-secondary">{error}</p>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className="flex-1 flex gap-6 p-6 bg-void min-h-[calc(100vh-60px)]">
      {/* LEFT SIDEBAR: Metadata & Signals */}
      <div className="w-80 flex flex-col gap-6 flex-shrink-0">
        <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border bg-elevated">
            <h3 className="font-display text-lg text-text-primary">General Intelligence</h3>
          </div>
          <div className="p-4 flex flex-col gap-4">
            
            <div className="flex flex-col items-center py-4 border-b border-border">
              <span className="text-[10px] uppercase tracking-widest font-bold text-text-muted mb-2">Confidence</span>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-elevated" />
                  <circle 
                    cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="8" fill="transparent" 
                    strokeDasharray={`${(result.confidence / 100) * 251.2} 251.2`} 
                    className="text-gold-primary transition-all duration-1000" 
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center flex-col">
                  <span className="text-2xl font-mono font-bold text-text-primary">{result.confidence}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Document Metrics</h4>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">schedule</span> Reading Time
                </span>
                <span className="font-mono text-text-primary">{result.metadata.reading_time_minutes} min</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">format_size</span> Word Count
                </span>
                <span className="font-mono text-text-primary">{result.metadata.word_count.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-text-secondary flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">language</span> Language
                </span>
                <span className="font-mono uppercase text-text-primary">{result.metadata.language}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3 mt-2">
              <h4 className="text-[10px] uppercase tracking-widest font-bold text-text-muted">Signals Used</h4>
              <div className="flex flex-wrap gap-2">
                {result.signals.length > 0 ? result.signals.map((sig, idx) => (
                  <span key={idx} className="bg-elevated border border-border px-2 py-1 rounded text-[11px] text-text-secondary uppercase font-semibold">
                    {sig}
                  </span>
                )) : (
                  <span className="text-xs text-text-muted">No signals detected</span>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MAIN WORKBENCH */}
      <div className="flex-1 flex flex-col gap-6 overflow-y-auto pr-2">
        {/* Hero: Executive Summary */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
          <h2 className="font-display text-2xl text-text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-gold-primary text-[28px]">summarize</span>
            Executive Summary
          </h2>
          <div className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
            {result.executive_summary}
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Key Takeaways */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-primary text-[20px]">lightbulb</span>
              Key Takeaways
            </h3>
            {result.takeaways.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.takeaways.map((takeaway, idx) => (
                  <TakeawayCard key={idx} takeaway={takeaway} />
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface text-sm text-text-muted text-center">No key takeaways identified.</div>
            )}
          </div>

          {/* Topics */}
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-primary text-[20px]">category</span>
              Topics
            </h3>
            {result.topics.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.topics.map((topic, idx) => (
                  <TopicCard key={idx} topic={topic} />
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface text-sm text-text-muted text-center">No distinct topics extracted.</div>
            )}
          </div>
        </div>

        {/* Entities and Action Items */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-primary text-[20px]">group</span>
              Named Entities
            </h3>
            {result.entities.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.entities.map((ent, idx) => (
                  <EntityCard key={idx} entity={ent} />
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface text-sm text-text-muted text-center">No significant entities found.</div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-primary text-[20px]">checklist</span>
              Action Items
            </h3>
            {result.actions.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.actions.map((act, idx) => (
                  <ActionItemCard key={idx} action={act} />
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface text-sm text-text-muted text-center">No action items found.</div>
            )}
          </div>
        </div>

        {/* Numbers & Risks (Full Width / Grid) */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-primary text-[20px]">bar_chart</span>
              Numerical Insights
            </h3>
            {result.numbers.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {result.numbers.map((num, idx) => (
                  <div key={idx} className="bg-surface border border-border rounded-lg p-4 shadow-sm flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">{num.metric}</span>
                      <span className="font-mono text-lg font-bold text-gold-primary">{num.value}</span>
                    </div>
                    <p className="text-xs text-text-secondary">{num.context}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface text-sm text-text-muted text-center">No significant numerical metrics found.</div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h3 className="font-display text-lg text-text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-gold-primary text-[20px]">warning</span>
              Risks
            </h3>
            {result.risks.length > 0 ? (
              <div className="flex flex-col gap-3">
                {result.risks.map((risk, idx) => (
                  <div key={idx} className="bg-surface border border-border rounded-lg p-4 shadow-sm flex items-start gap-3">
                    <span className={`material-symbols-outlined text-[20px] mt-0.5 ${
                      risk.level === 'High' ? 'text-conf-critical' :
                      risk.level === 'Medium' ? 'text-conf-amber' :
                      'text-conf-high'
                    }`}>
                      {risk.level === 'High' ? 'error' : risk.level === 'Medium' ? 'warning' : 'info'}
                    </span>
                    <div className="flex flex-col gap-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${
                        risk.level === 'High' ? 'text-conf-critical' :
                        risk.level === 'Medium' ? 'text-conf-amber' :
                        'text-conf-high'
                      }`}>{risk.level} Risk</span>
                      <p className="text-sm text-text-primary leading-relaxed">{risk.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 border border-border rounded-lg bg-surface text-sm text-text-muted text-center">No significant risks identified.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
