import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

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
  diagnostics: Record<string, any>;
}

export default function DomainRadar() {
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
        console.error("Failed to load documents", err);
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
        document_id: selectedDocId
      });
      setResult(res.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    // Reset if document changes
    setResult(null);
    setError(null);
  }, [selectedDocId]);

  const getConfidenceColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'high': return 'text-conf-high border-conf-high/30 bg-conf-high/10';
      case 'medium': return 'text-conf-amber border-conf-amber/30 bg-conf-amber/10';
      case 'low': return 'text-conf-low border-conf-low/30 bg-conf-low/10';
      default: return 'text-text-secondary border-border bg-surface';
    }
  };

  const getConfidenceIcon = (label: string) => {
    switch (label.toLowerCase()) {
      case 'high': return 'check_circle';
      case 'medium': return 'remove_circle_outline';
      case 'low': return 'help_outline';
      default: return 'info';
    }
  };

  const getSurfaceIcon = (surface: string) => {
    switch (surface.toLowerCase()) {
      case 'workspace': return 'space_dashboard';
      case 'audit': return 'fact_check';
      case 'clinical': return 'medical_services';
      case 'compare': return 'compare_arrows';
      case 'code': return 'code';
      default: return 'dashboard';
    }
  };

  const activeDocument = documents.find(d => d.id === selectedDocId);

  if (!result && !isAnalyzing) {
    return (
      <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex flex-col items-center justify-center">
        <div className="w-full max-w-[600px] text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary">radar</span>
          </div>
          <div>
            <h1 className="font-display text-4xl text-text-primary mb-3">Domain Radar</h1>
            <p className="font-sans text-base text-text-secondary max-w-md mx-auto">
              Classify a document's domain, inspect classification signals, and see which Proxima workflows are best suited for it.
            </p>
          </div>
          
          <div className="bg-elevated border border-border rounded-xl p-6 text-left max-w-sm mx-auto">
            <ul className="space-y-4 text-sm text-text-secondary font-sans">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">category</span>
                Detect likely domain
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">sort</span>
                Surface confidence-scored candidates
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">psychology</span>
                Explain why it was classified
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">route</span>
                Recommend the right Proxima surface
              </li>
            </ul>
          </div>

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
                  className="bg-surface border border-border text-text-primary rounded-lg px-4 py-2 w-full focus:ring-1 focus:ring-primary focus:border-primary text-sm font-sans"
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
                  <span className="material-symbols-outlined text-[20px]">radar</span>
                  Start Radar Scan
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex gap-6 overflow-hidden">
      
      {/* Left Column: Snapshot */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <header className="flex justify-between items-center">
          <h1 className="font-display text-2xl text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">radar</span>
            Domain Radar
          </h1>
          <button onClick={() => setResult(null)} className="text-text-secondary hover:text-text-primary font-sans text-sm underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            New Scan
          </button>
        </header>

        {/* Selected Document Card */}
        <div className="bg-surface border border-border rounded-xl p-4">
          <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-2">Target Document</div>
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-text-secondary">description</span>
            <span className="font-sans text-sm font-medium text-text-primary truncate">{activeDocument?.title || 'Selected Document'}</span>
          </div>
          <button 
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full mt-4 bg-gold-primary text-void py-2.5 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
          >
            {isAnalyzing ? (
              <><span className="material-symbols-outlined animate-spin text-[18px]">sync</span> Analyzing...</>
            ) : (
              <><span className="material-symbols-outlined text-[18px]">refresh</span> Rerun Radar</>
            )}
          </button>
        </div>

        {error && (
          <div className="bg-conf-critical/10 border border-conf-critical/20 p-4 rounded-xl text-conf-critical flex items-start gap-3">
            <span className="material-symbols-outlined mt-0.5">error</span>
            <p className="font-sans text-sm">{error}</p>
          </div>
        )}

        {result && (
          <>
            {/* Primary Domain Hero */}
            <div className="bg-elevated border border-border rounded-xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <span className="material-symbols-outlined text-8xl">domain</span>
              </div>
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-4 relative z-10">Primary Domain</div>
              
              <div className="flex items-end gap-4 mb-2 relative z-10">
                <div className="font-display text-4xl text-text-primary capitalize">{result.primary_domain.domain}</div>
                <div className="font-sans text-lg text-text-secondary pb-1">{Math.round(result.primary_domain.score * 100)}%</div>
              </div>
              
              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-bold uppercase tracking-wider ${getConfidenceColor(result.primary_domain.confidence_label)} relative z-10`}>
                <span className="material-symbols-outlined text-[14px]">{getConfidenceIcon(result.primary_domain.confidence_label)}</span>
                {result.primary_domain.confidence_label} CONFIDENCE
              </div>
            </div>

            {/* Candidates */}
            <div className="bg-surface border border-border rounded-xl p-4">
               <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-4">Candidate Domains</div>
               <div className="space-y-3">
                 {result.candidate_domains.map(c => (
                   <div key={c.domain} className="flex flex-col gap-1">
                     <div className="flex justify-between items-center font-sans text-sm">
                       <span className="text-text-primary capitalize">{c.domain}</span>
                       <span className="text-text-secondary">{Math.round(c.score * 100)}%</span>
                     </div>
                     <div className="w-full bg-void rounded-full h-1.5 overflow-hidden border border-border">
                       <div 
                         className={`h-full rounded-full ${c.confidence_label === 'high' ? 'bg-conf-high' : c.confidence_label === 'medium' ? 'bg-conf-amber' : 'bg-conf-low'}`}
                         style={{ width: `${Math.round(c.score * 100)}%` }}
                       />
                     </div>
                   </div>
                 ))}
               </div>
            </div>

            {/* Recommended Surfaces */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-4">Recommended Proxima Workflows</div>
              <div className="space-y-3">
                {result.recommended_surfaces.map((s, i) => (
                  <div key={i} className="flex gap-3 items-start p-3 bg-elevated rounded-lg border border-border shadow-sm">
                    <span className="material-symbols-outlined text-primary mt-0.5">{getSurfaceIcon(s.surface)}</span>
                    <div>
                      <div className="font-sans text-sm font-bold text-text-primary capitalize mb-1">{s.surface}</div>
                      <div className="font-sans text-xs text-text-secondary leading-relaxed">{s.reason}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Right Column: Deep Analysis */}
      <div className="w-2/3 bg-elevated border border-border rounded-xl flex flex-col overflow-hidden relative">
        {isAnalyzing ? (
           <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-4">
             <span className="material-symbols-outlined animate-spin text-4xl text-primary">radar</span>
             <p className="font-sans text-sm animate-pulse">Scanning document and synthesizing domain...</p>
           </div>
        ) : result && (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            
            {/* Summary */}
            <div>
              <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">psychology</span>
                Classification Summary
              </h3>
              <div className="font-sans text-lg text-text-primary font-medium leading-relaxed p-6 bg-surface border border-border rounded-xl shadow-sm">
                {result.summary}
              </div>
            </div>

            {/* Signals */}
            <div>
              <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">track_changes</span>
                Detected Signals
              </h3>
              {result.signals.length === 0 ? (
                <div className="p-4 font-sans text-sm text-text-secondary bg-surface border border-border rounded-xl">No strong deterministic signals detected.</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {result.signals.map((sig, i) => (
                    <div key={i} className="p-4 bg-surface border border-border rounded-xl shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-sans text-sm font-bold text-text-primary">{sig.label}</div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getConfidenceColor(sig.strength)}`}>
                          {sig.strength}
                        </span>
                      </div>
                      <div className="font-sans text-xs text-text-secondary leading-relaxed">{sig.description}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Document Profile Diagnostics */}
            <div>
              <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">analytics</span>
                Document Profile
              </h3>
              <div className="flex flex-wrap gap-4">
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[120px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Words</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.word_count}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[120px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Lines</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.line_count}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[120px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Paragraphs</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.paragraph_count}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[120px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Headings</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.heading_like_lines}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[120px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Tables/Grids</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.table_like_lines}</div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
