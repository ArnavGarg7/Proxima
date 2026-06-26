import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { diffWords } from 'diff';

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
        console.error("Failed to load documents", err);
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
        target_document_id: targetId
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
    } catch (err: any) {
      if (err.response) {
        setError(err.response.data.detail || `Error ${err.response.status}`);
      } else {
        setError(err.message || 'Failed to run comparison');
      }
    } finally {
      setComparing(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    const s = severity.toLowerCase();
    if (s.includes('high') || s.includes('critical')) return <span className="material-symbols-outlined text-conf-critical text-sm mt-0.5">report</span>;
    if (s.includes('medium')) return <span className="material-symbols-outlined text-conf-amber text-sm mt-0.5">warning</span>;
    return <span className="material-symbols-outlined text-conf-low text-sm mt-0.5">info</span>;
  };

  const renderOldWithHighlight = (oldStr: string | null, newStr: string | null) => {
    if (!oldStr) return <span className="italic opacity-50">Not present</span>;
    if (!newStr) return oldStr;
    const diffs = diffWords(oldStr, newStr);
    return diffs.filter(p => !p.added).map((part, i) => {
      if (part.removed) return <span key={i} className="bg-conf-critical/30 text-conf-critical font-bold">{part.value}</span>;
      return <span key={i}>{part.value}</span>;
    });
  };

  const renderNewWithHighlight = (oldStr: string | null, newStr: string | null) => {
    if (!newStr) return <span className="italic opacity-50">Not present</span>;
    if (!oldStr) return newStr;
    const diffs = diffWords(oldStr, newStr);
    return diffs.filter(p => !p.removed).map((part, i) => {
      if (part.added) return <span key={i} className="bg-conf-high/30 text-conf-high font-bold">{part.value}</span>;
      return <span key={i}>{part.value}</span>;
    });
  };

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-60px)] bg-void overflow-hidden">
      
      {/* Header & Controls */}
      <header className="px-8 py-6 border-b border-border bg-surface shrink-0 z-10 shadow-sm relative">
        <h1 className="font-display text-3xl text-text-primary mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-gold-primary">difference</span>
          Revision Intelligence
        </h1>
        <p className="font-sans text-sm text-text-secondary mb-6 max-w-2xl">
          Analyze structural and semantic deviations between two documents. Understand what changed, where it changed, and what it means for you.
        </p>
        
        <div className="flex flex-col md:flex-row gap-6 items-end">
          <div className="flex-1 w-full bg-void p-4 rounded-lg border border-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-text-muted/30"></div>
            <label className="font-sans text-xs font-medium text-text-muted mb-2 block uppercase tracking-wide">Source Document (Baseline)</label>
            <select 
              value={sourceId} onChange={(e) => setSourceId(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select Source --</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          
          <button 
            onClick={() => { const temp = sourceId; setSourceId(targetId); setTargetId(temp); }}
            className="flex-shrink-0 flex items-center justify-center p-3 rounded-full hover:bg-elevated text-text-muted hover:text-text-primary transition-colors border border-transparent hover:border-border"
            title="Swap Documents"
          >
            <span className="material-symbols-outlined">swap_horiz</span>
          </button>

          <div className="flex-1 w-full bg-void p-4 rounded-lg border border-border relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-gold-primary/50"></div>
            <label className="font-sans text-xs font-medium text-text-muted mb-2 block uppercase tracking-wide">Target Document (Revision)</label>
            <select 
              value={targetId} onChange={(e) => setTargetId(e.target.value)}
              className="w-full bg-surface border border-border rounded px-3 py-2 text-text-primary focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Select Target --</option>
              {documents.map(d => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          </div>
          
          <button 
            onClick={runCompare}
            disabled={comparing || !sourceId || !targetId || sourceId === targetId}
            className="h-[68px] bg-gold-primary text-void px-8 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm uppercase tracking-wide"
          >
            {comparing ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">analytics</span>}
            {comparing ? "Analyzing..." : "Analyze Diff"}
          </button>
        </div>
        
        {error && (
          <div className="mt-6 bg-conf-critical/10 border border-conf-critical/20 p-4 rounded-lg text-conf-critical flex items-start gap-3">
            <span className="material-symbols-outlined">error</span>
            <span className="font-sans text-sm">{error}</span>
          </div>
        )}
      </header>

      {/* Main Area */}
      {!result && !comparing && !error && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 opacity-50">
          <span className="material-symbols-outlined text-[64px] text-text-muted mb-4">compare_arrows</span>
          <p className="font-sans text-text-secondary max-w-md text-center">Select a baseline document and a revised document above to generate a structured revision intelligence report.</p>
        </div>
      )}

      {result && !error && (
        <div className="flex-1 overflow-y-auto p-8 flex gap-8 bg-void">
          
          {/* LEFT SIDEBAR: Snapshot & Priorities */}
          <div className="w-[340px] shrink-0 flex flex-col gap-6">
            
            {/* Top Hero Similarity */}
            <div className="bg-surface border border-border rounded-xl p-6 shadow-sm text-center relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-full h-1 ${
                  result.similarity_score >= 90 ? 'bg-conf-high' : 
                  result.similarity_score >= 70 ? 'bg-conf-amber' : 'bg-conf-critical'
                }`} 
              />
              <h2 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Similarity Score</h2>
              <div className={`font-display text-5xl leading-none mb-2 ${
                  result.similarity_score >= 90 ? 'text-conf-high' : 
                  result.similarity_score >= 70 ? 'text-conf-amber' : 'text-conf-critical'
                }`}>
                {result.similarity_score}%
              </div>
              <div className="font-sans text-sm font-medium text-text-primary">
                {result.overall_change_level} Change
              </div>
              <div className="mt-4 inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-elevated border border-border text-text-primary">
                {result.overall_change_level} Revision
              </div>
            </div>

            {/* Quick Snapshot */}
            <div className="bg-elevated border border-border rounded-xl p-5 shadow-sm">
              <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">data_exploration</span>
                Structural Diff
              </h3>
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-conf-high"></span>Added Sections</span>
                  <span className="font-mono text-text-primary font-bold">{result.change_snapshot.added_sections_count}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-conf-critical"></span>Removed Sections</span>
                  <span className="font-mono text-text-primary font-bold">{result.change_snapshot.removed_sections_count}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-conf-amber"></span>Modified Sections</span>
                  <span className="font-mono text-text-primary font-bold">{result.change_snapshot.modified_sections_count}</span>
                </div>
                <div className="h-px bg-border my-1"></div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-secondary">Overall Risk Shift</span>
                  <span className={`font-sans font-bold ${
                    result.change_snapshot.overall_risk.toLowerCase() === 'high' ? 'text-conf-critical' :
                    result.change_snapshot.overall_risk.toLowerCase() === 'medium' ? 'text-conf-amber' : 'text-conf-low'
                  }`}>{result.change_snapshot.overall_risk}</span>
                </div>
              </div>
            </div>

            {/* Reviewer Priorities */}
            {result.reviewer_priorities.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">rule</span>
                  Reviewer Priorities
                </h3>
                <div className="flex flex-col gap-3">
                  {result.reviewer_priorities.map((p, idx) => (
                    <div key={idx} className="p-3 bg-elevated border border-border rounded-lg text-left shadow-sm hover:border-gold-primary/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-sans text-sm font-semibold text-text-primary">{p.title}</h4>
                        {getSeverityIcon(p.severity)}
                      </div>
                      <p className="font-sans text-xs text-text-secondary line-clamp-2">{p.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Deterministic Signals */}
            {result.deterministic_signals.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                <h3 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">radar</span>
                  Semantic Shift Signals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {result.deterministic_signals.map((sig, idx) => (
                    <span key={idx} className="px-2 py-1 rounded bg-elevated border border-border text-[11px] font-sans text-text-primary whitespace-nowrap">
                      {sig}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
          </div>

          {/* RIGHT COLUMN: Main Intelligence Report */}
          <div className="flex-1 flex flex-col gap-6 max-w-4xl pb-10">
            
            {/* Executive Summary */}
            <div className="bg-gold-primary/5 border border-gold-primary/20 rounded-2xl p-8 relative overflow-hidden shadow-sm">
              <span className="material-symbols-outlined absolute -top-4 -right-4 text-[120px] text-gold-primary/5 select-none pointer-events-none">summarize</span>
              <h2 className="font-display text-xl text-gold-primary mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-xl">insights</span>
                Executive Summary
              </h2>
              <p className="font-sans text-base text-text-primary leading-relaxed">
                {result.executive_summary}
              </p>
            </div>

            {/* Semantic Changes */}
            {result.semantic_changes.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-display text-xl text-text-primary border-b border-border pb-2">Semantic & Meaning Shifts</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.semantic_changes.map((sc, idx) => (
                    <div key={idx} className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-elevated text-text-secondary border border-border">
                          {sc.category}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-1 p-2 bg-conf-critical/5 border border-conf-critical/20 rounded text-sm text-text-secondary line-through decoration-conf-critical/50 truncate" title={sc.old_value}>
                          {sc.old_value}
                        </div>
                        <span className="material-symbols-outlined text-text-muted">arrow_forward</span>
                        <div className="flex-1 p-2 bg-conf-high/5 border border-conf-high/20 rounded text-sm text-text-primary font-medium truncate" title={sc.new_value}>
                          {sc.new_value}
                        </div>
                      </div>
                      <p className="font-sans text-xs text-text-secondary">{sc.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Structural Changes */}
            {result.structural_changes.length > 0 && (
              <div className="space-y-4 mt-4">
                <h3 className="font-display text-xl text-text-primary border-b border-border pb-2 flex justify-between items-end">
                  Structural Changes
                  <span className="text-sm font-sans text-text-secondary">{result.structural_changes.length} total</span>
                </h3>
                <div className="flex flex-col gap-3">
                  {(expandedStructural ? result.structural_changes : result.structural_changes.slice(0, 5)).map((st, idx) => (
                    <div key={idx} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-start gap-4">
                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        st.change_type.toLowerCase().includes('add') ? 'bg-conf-high/10 text-conf-high' :
                        st.change_type.toLowerCase().includes('remove') ? 'bg-conf-critical/10 text-conf-critical' : 
                        (st.change_type.toLowerCase().includes('reorder') || st.change_type.toLowerCase().includes('move')) ? 'bg-blue-500/10 text-blue-500' :
                        'bg-conf-amber/10 text-conf-amber'
                      }`}>
                        <span className="material-symbols-outlined text-[18px]">
                          {st.change_type.toLowerCase().includes('add') ? 'add' :
                           st.change_type.toLowerCase().includes('remove') ? 'remove' : 'move_item'}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-sans text-xs font-bold text-text-muted uppercase">{st.change_type}</span>
                          <span className="text-text-muted text-xs">•</span>
                          <span className="font-mono text-sm text-text-primary">{st.heading}</span>
                        </div>
                        <p className="font-sans text-sm text-text-secondary">{st.description}</p>
                      </div>
                    </div>
                  ))}
                  {result.structural_changes.length > 5 && (
                    <button 
                      onClick={() => setExpandedStructural(!expandedStructural)}
                      className="text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text-primary mt-2 flex items-center justify-center gap-1"
                    >
                      {expandedStructural ? 'Collapse' : `▼ Expand ${result.structural_changes.length - 5} more`}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Risk Changes */}
            {result.risk_changes.length > 0 && (
              <div className="space-y-4 mt-4">
                <h3 className="font-display text-xl text-text-primary border-b border-border pb-2">Risk Impact Analysis</h3>
                <div className="grid grid-cols-1 gap-3">
                  {result.risk_changes.map((rc, idx) => (
                    <div key={idx} className="bg-surface border border-border rounded-xl p-4 shadow-sm flex items-start gap-4">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            rc.severity.toLowerCase().includes('high') ? 'bg-conf-critical/15 text-conf-critical border border-conf-critical/30' :
                            rc.severity.toLowerCase().includes('medium') ? 'bg-conf-amber/15 text-conf-amber border border-conf-amber/30' :
                            'bg-conf-low/15 text-conf-low border border-conf-low/30'
                          }`}>
                          {rc.severity}
                        </span>
                        <h4 className="font-sans text-sm font-semibold text-text-primary mb-1 mt-2">{rc.title}</h4>
                        <p className="font-sans text-sm text-text-secondary">{rc.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Side-by-Side Evidence */}
            {result.evidence.length > 0 && (
              <div className="space-y-4 mt-4">
                <h3 className="font-display text-xl text-text-primary border-b border-border pb-2">Direct Evidence</h3>
                <div className="flex flex-col gap-6">
                  {result.evidence.map((ev, idx) => (
                    <div key={idx} className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                      <div className="bg-elevated px-4 py-2 border-b border-border flex items-center justify-between">
                        <span className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider">{ev.label}</span>
                      </div>
                      <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-border">
                        <div className="flex-1 p-4 bg-conf-critical/5">
                          <div className="font-sans text-xs font-bold text-conf-critical/80 mb-2 uppercase tracking-wide">Old Clause</div>
                          <div className="font-mono text-sm text-text-secondary whitespace-pre-wrap leading-relaxed decoration-conf-critical/30 line-through">
                            {renderOldWithHighlight(ev.old_excerpt, ev.new_excerpt)}
                          </div>
                        </div>
                        <div className="flex-1 p-4 bg-conf-high/5">
                          <div className="font-sans text-xs font-bold text-conf-high/80 mb-2 uppercase tracking-wide">New Clause</div>
                          <div className="font-mono text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                            {renderNewWithHighlight(ev.old_excerpt, ev.new_excerpt)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Document Profile Delta */}
            <div className="space-y-4 mt-4">
              <h3 className="font-display text-xl text-text-primary border-b border-border pb-2">Document Profile Delta</h3>
              <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-elevated border-b border-border">
                      <th className="p-3 font-sans text-xs font-bold text-text-muted uppercase tracking-wider">Metric</th>
                      <th className="p-3 font-sans text-xs font-bold text-text-muted uppercase tracking-wider text-right">Source</th>
                      <th className="p-3 font-sans text-xs font-bold text-text-muted uppercase tracking-wider text-right">Target</th>
                      <th className="p-3 font-sans text-xs font-bold text-text-muted uppercase tracking-wider text-right">Delta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {['word_count', 'paragraph_count', 'heading_count', 'list_count'].map((metric) => {
                      const delta = result.document_profile.delta[metric];
                      const s = result.document_profile.source[metric as keyof DocumentProfileStats];
                      const t = result.document_profile.target[metric as keyof DocumentProfileStats];
                      const label = metric.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                      return (
                        <tr key={metric} className="hover:bg-elevated/50 transition-colors">
                          <td className="p-3 font-sans text-sm text-text-primary">{label}</td>
                          <td className="p-3 font-mono text-sm text-text-secondary text-right">{s}</td>
                          <td className="p-3 font-mono text-sm text-text-primary text-right">{t}</td>
                          <td className={`p-3 font-mono text-sm font-medium text-right ${
                            delta > 0 ? 'text-conf-high' : delta < 0 ? 'text-conf-critical' : 'text-text-muted'
                          }`}>
                            {delta > 0 ? `+${delta}` : delta}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
