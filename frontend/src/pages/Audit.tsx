import { useState, useEffect } from 'react';
import { api } from '@/lib/axios';

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface AuditResult {
  document_id: string;
  document_title: string;
  overall_score: number;
  grade: string;
  dimensions: {
    clarity: number;
    structure: number;
    terminology: number;
    compliance_signals: number;
  };
  actions: {
    title: string;
    description: string;
    severity: string;
    dimension: string;
  }[];
  evidence: {
    title: string;
    description: string;
    dimension: string;
    excerpt: string;
  }[];
  diagnostics: Record<string, unknown>;
}

export default function Audit() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditing, setAuditing] = useState(false);
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

  const runAudit = async () => {
    if (!selectedDocId) return;
    setAuditing(true);
    setError(null);
    setAuditResult(null);
    
    try {
      const res = await api.post('/api/intelligence/confidence', {
        document_id: selectedDocId
      });
      setAuditResult(res.data);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      if (err.response) {
        setError(err.response.data.detail || `Error ${err.response.status}`);
      } else {
        setError(err.message || 'Failed to run audit');
      }
    } finally {
      setAuditing(false);
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch(priority) {
      case 'high': return <span className="material-symbols-outlined text-conf-critical text-sm mt-0.5">warning</span>;
      case 'medium': return <span className="material-symbols-outlined text-conf-amber text-sm mt-0.5">error</span>;
      default: return <span className="material-symbols-outlined text-conf-low text-sm mt-0.5">info</span>;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-conf-high bg-conf-high/15';
    if (score >= 60) return 'text-conf-amber bg-conf-amber/15';
    return 'text-conf-critical bg-conf-critical/15';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 80) return 'bg-conf-high';
    if (score >= 60) return 'bg-conf-amber';
    return 'bg-conf-critical';
  };

  return (
    <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex flex-col items-center overflow-y-auto">
      <div className="w-full max-w-[1000px] space-y-8">
        
        {/* Header */}
        <header>
          <h1 className="font-display text-3xl text-text-primary mb-2">Confidence Audit</h1>
          <p className="font-sans text-sm text-body-md text-text-secondary">Select a document to run a comprehensive multi-dimensional compliance scan.</p>
        </header>

        {/* Document Selector */}
        <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-start gap-4">
          <label className="font-sans text-sm font-medium text-text-primary">Select Document to Audit</label>
          {loadingDocs ? (
            <div className="text-text-muted">Loading documents...</div>
          ) : documents.length === 0 ? (
             <div className="text-text-muted">No documents available. Upload one in Workspace first.</div>
          ) : (
            <div className="flex gap-4 w-full">
              <select 
                value={selectedDocId} 
                onChange={(e) => setSelectedDocId(e.target.value)}
                className="bg-surface border border-border text-text-primary rounded px-3 py-2 flex-1 focus:ring-1 focus:ring-primary focus:border-primary"
              >
                {documents.map(doc => (
                  <option key={doc.id} value={doc.id}>{doc.title} ({new Date(doc.created_at).toLocaleDateString()})</option>
                ))}
              </select>
              <button 
                onClick={runAudit}
                disabled={auditing || !selectedDocId}
                className="bg-gold-primary text-void px-6 py-2 rounded font-sans text-sm font-medium hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
              >
                {auditing ? <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span> : <span className="material-symbols-outlined text-[20px]">verified_user</span>}
                {auditing ? "Auditing..." : "Run Audit"}
              </button>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-conf-critical/10 border border-conf-critical/20 p-4 rounded-xl text-conf-critical flex items-start gap-3">
            <span className="material-symbols-outlined">error</span>
            <div>
              <h3 className="font-sans text-sm font-medium">Audit Failed</h3>
              <p className="font-sans text-sm text-conf-critical/80">{error}</p>
            </div>
          </div>
        )}

        {/* Audit Results */}
        {auditResult && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
            
            {/* Left Column: Grade & Recommendations */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Grade Card */}
              <div className="bg-elevated border border-border rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-[2px] bg-gold-primary"></div>
                <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider mb-4">Overall Confidence Grade</h3>
                <div className="flex items-end gap-4 mb-2">
                  <span className={`font-display text-4xl leading-none ${
                    ['A','B'].includes(auditResult.grade) ? 'text-conf-high' : 
                    ['C','D'].includes(auditResult.grade) ? 'text-conf-amber' : 'text-conf-critical'
                  }`}>
                    {auditResult.grade}
                  </span>
                  <span className="font-sans text-base text-text-secondary pb-2">Score: {auditResult.overall_score.toFixed(1)}/100</span>
                </div>
              </div>

              {/* Actions */}
              <div className="bg-elevated border border-border rounded-xl p-6">
                <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">list_alt</span>
                  Prioritized Actions
                </h3>
                <div className="space-y-4">
                  {auditResult.actions.map((act, i) => (
                    <div key={i} className="flex gap-3 items-start p-4 bg-elevated border border-border rounded-lg shadow-sm">
                      <div className="mt-0.5">{getPriorityIcon(act.severity)}</div>
                      <div>
                        <p className="font-sans text-sm font-medium text-text-primary mb-1">{act.title}</p>
                        <p className="font-sans text-xs text-text-secondary">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Dimensions & Heatmap */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Dimension Scorecards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'clarity', label: 'Clarity', score: auditResult.dimensions.clarity },
                  { key: 'structure', label: 'Structure', score: auditResult.dimensions.structure },
                  { key: 'terminology', label: 'Terminology', score: auditResult.dimensions.terminology },
                  { key: 'compliance_signals', label: 'Compliance Signals', score: auditResult.dimensions.compliance_signals }
                ].map(dim => (
                  <div key={dim.key} className="bg-elevated border border-border rounded-xl p-4 flex flex-col justify-between h-28">
                    <div className="flex justify-between items-start">
                      <span className="font-sans text-sm font-medium text-text-secondary">{dim.label}</span>
                      <span className={`px-2 py-0.5 rounded-full font-sans text-xs font-medium ${getScoreColor(dim.score)}`}>
                        {dim.score.toFixed(0)}%
                      </span>
                    </div>
                    <div className="w-full bg-elevated h-1.5 rounded-full overflow-hidden mt-4">
                      <div className={`h-full ${getScoreBarColor(dim.score)}`} style={{ width: `${dim.score}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Heatmap / Evidence View */}
              <div className="bg-elevated border border-border rounded-xl p-6 flex flex-col">
                <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider mb-4 flex justify-between items-center">
                  <span>Segment Evidence</span>
                </h3>
                <div className="flex-1 space-y-4">
                  {auditResult.evidence.length > 0 ? auditResult.evidence.map((seg, i) => (
                     <div key={i} className="p-4 bg-elevated border border-border rounded-lg shadow-sm">
                        <div className="font-sans text-sm font-medium text-text-primary mb-1 flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-primary">policy</span>
                          {seg.title}
                        </div>
                        <div className="font-sans text-xs text-text-secondary mb-3">{seg.description}</div>
                        <div className="font-sans text-sm bg-surface border border-border p-3 rounded text-text-primary whitespace-pre-wrap break-words line-clamp-4 overflow-hidden leading-relaxed">
                          {seg.excerpt}
                        </div>
                     </div>
                  )) : (
                    <p className="text-text-muted italic">No specific segments flagged.</p>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
