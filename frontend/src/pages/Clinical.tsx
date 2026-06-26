import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/axios';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';

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

export default function Clinical() {
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
        console.error("Failed to load documents", err);
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
        document_id: selectedDocId
      });
      setResult(res.data);
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    setResult(null);
    setError(null);
  }, [selectedDocId]);

  const activeDocument = documents.find(d => d.id === selectedDocId);

  const getConfidenceColor = (label: string) => {
    switch (label.toLowerCase()) {
      case 'high': return 'text-conf-high border-conf-high/30 bg-conf-high/10';
      case 'moderate': case 'medium': return 'text-conf-amber border-conf-amber/30 bg-conf-amber/10';
      case 'low': return 'text-conf-critical border-conf-critical/30 bg-conf-critical/10';
      default: return 'text-text-secondary border-border bg-surface';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high': case 'critical': return <span className="material-symbols-outlined text-conf-critical mt-0.5 text-sm">warning</span>;
      case 'medium': case 'moderate': return <span className="material-symbols-outlined text-conf-amber mt-0.5 text-sm">error</span>;
      default: return <span className="material-symbols-outlined text-conf-low mt-0.5 text-sm">info</span>;
    }
  };

  const renderListSection = (title: string, icon: string, items: string[]) => {
    if (!items || items.length === 0) return null;
    return (
      <div className="bg-surface border border-border rounded-xl p-6 shadow-sm">
        <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-4">
          <span className="material-symbols-outlined text-primary text-[18px]">{icon}</span>
          {title}
        </h3>
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-3 text-text-secondary font-sans text-sm items-start">
              <span className="material-symbols-outlined text-gold-primary text-[16px] mt-0.5">adjust</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!result && !isAnalyzing) {
    return (
      <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex flex-col items-center justify-center">
        <div className="w-full max-w-[600px] text-center space-y-6">
          {templateContext && (
            <div className="text-left">
              <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
            </div>
          )}
          <div className="w-16 h-16 rounded-2xl bg-surface border border-border mx-auto flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-3xl text-primary">medical_services</span>
          </div>
          <div>
            <h1 className="font-display text-4xl text-text-primary mb-3">Clinical Analyzer</h1>
            <p className="font-sans text-base text-text-secondary max-w-md mx-auto">
              Upload or select a clinical note to generate a structured clinical summary. Extract complaint, findings, medications, plan, and follow-up items.
            </p>
          </div>
          
          <div className="bg-elevated border border-border rounded-xl p-6 text-left max-w-sm mx-auto">
            <ul className="space-y-4 text-sm text-text-secondary font-sans">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">assignment</span>
                Analyze one document at a time
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">vaccines</span>
                Extract core clinical entities
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">warning</span>
                Detect clinical risk and ambiguity
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                Not a substitute for clinical judgment
              </li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center gap-4 max-w-md mx-auto">
            <label className="font-sans text-sm font-medium text-text-primary">Select Clinical Note to Analyze</label>
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
                  <span className="material-symbols-outlined text-[20px]">science</span>
                  Start Clinical Analysis
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
      
      {/* Left Column: Snapshot & Controls */}
      <div className="w-1/3 flex flex-col gap-6 overflow-y-auto pr-2">
        <header className="flex justify-between items-center">
          <h1 className="font-display text-2xl text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">medical_services</span>
            Clinical Analyzer
          </h1>
          <button onClick={() => setResult(null)} className="text-text-secondary hover:text-text-primary font-sans text-sm underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            New Scan
          </button>
        </header>

        {templateContext && (
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        )}
        {/* Target Document Card */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
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
              <><span className="material-symbols-outlined text-[18px]">refresh</span> Rerun Analysis</>
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
            {/* Domain Hint Alert (if not strongly clinical) */}
            {!result.document_domain_hint.is_clinical_like && (
              <div className="bg-conf-low/10 border border-conf-low/30 p-4 rounded-xl text-text-primary flex items-start gap-3 shadow-sm">
                <span className="material-symbols-outlined text-conf-low mt-0.5">info</span>
                <div>
                  <h4 className="font-sans text-sm font-bold mb-1">Non-Clinical Document Detected</h4>
                  <p className="font-sans text-xs text-text-secondary leading-relaxed">{result.document_domain_hint.reason}</p>
                </div>
              </div>
            )}

            {/* Confidence Card */}
            <div className="bg-elevated border border-border rounded-xl p-5 shadow-sm">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-3">Extraction Confidence</div>
              <div className="flex items-center gap-3 mb-2">
                <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${getConfidenceColor(result.confidence.label)}`}>
                  {result.confidence.label}
                </span>
                <span className="font-display text-2xl text-text-primary">{result.confidence.overall}%</span>
              </div>
            </div>

            {/* Clinical Snapshot */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-4">Clinical Snapshot</div>
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Chief Complaint</div>
                  <div className="font-sans text-sm text-text-primary">{result.clinical_snapshot.chief_complaint_short || "Not clearly stated"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Top Assessment</div>
                  <div className="font-sans text-sm text-text-primary">{result.clinical_snapshot.top_assessment || "Not clearly stated"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Primary Plan</div>
                  <div className="font-sans text-sm text-text-primary">{result.clinical_snapshot.top_plan_item || "Not clearly stated"}</div>
                </div>
              </div>
            </div>

            {/* Risk Flags Card */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-4">Risk & Ambiguity Flags</div>
              {result.risk_flags.length === 0 ? (
                <div className="font-sans text-sm text-text-secondary">No major risk flags detected.</div>
              ) : (
                <div className="space-y-3">
                  {result.risk_flags.map((flag, idx) => (
                    <div key={idx} className="bg-void border border-border rounded-lg p-3 flex gap-3 items-start">
                      {getSeverityIcon(flag.severity)}
                      <div>
                        <div className="font-sans text-sm font-bold text-text-primary flex items-center justify-between">
                          {flag.title}
                          <span className="text-[10px] text-text-muted bg-elevated px-1.5 py-0.5 rounded border border-border ml-2 capitalize">{flag.category.replace('_', ' ')}</span>
                        </div>
                        <div className="font-sans text-xs text-text-secondary mt-1 leading-relaxed">{flag.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Right Column: Deep Analysis */}
      <div className="w-2/3 bg-elevated border border-border rounded-xl flex flex-col overflow-hidden relative">
        {isAnalyzing ? (
           <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-4">
             <span className="material-symbols-outlined animate-spin text-4xl text-primary">medical_services</span>
             <p className="font-sans text-sm animate-pulse">Structuring clinical document...</p>
           </div>
        ) : result && (
          <div className="flex-1 overflow-y-auto p-8 space-y-8">
            
            {/* Clinical Summary Hero */}
            <div>
              <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">summarize</span>
                Clinical Overview
              </h3>
              <div className="font-sans text-lg text-text-primary font-medium leading-relaxed p-6 bg-surface border border-border rounded-xl shadow-sm">
                {result.summary}
              </div>
            </div>

            {/* Structured Sections Grid */}
            <div className="grid grid-cols-2 gap-6">
              {/* Presenting Summary */}
              {result.clinical_summary.presenting_summary && (
                <div className="col-span-2 bg-surface border border-border rounded-xl p-6 shadow-sm">
                  <h3 className="font-sans text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[18px]">history</span>
                    History / Presenting Summary
                  </h3>
                  <p className="font-sans text-sm text-text-secondary leading-relaxed">
                    {result.clinical_summary.presenting_summary}
                  </p>
                </div>
              )}

              {renderListSection("Diagnoses & Assessment", "health_and_safety", result.clinical_summary.diagnoses_or_assessment)}
              {renderListSection("Key Findings", "search", result.clinical_summary.key_findings)}
              {renderListSection("Medications & Therapies", "medication", result.clinical_summary.medications_or_therapies)}
              {renderListSection("Tests & Imaging", "biotech", result.clinical_summary.tests_or_imaging)}
              
              {result.clinical_summary.plan_items && result.clinical_summary.plan_items.length > 0 && (
                <div className="col-span-2">
                   {renderListSection("Plan & Next Steps", "next_plan", result.clinical_summary.plan_items)}
                </div>
              )}
            </div>

            {/* Evidence Section */}
            <div>
              <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">plagiarism</span>
                Section Evidence
              </h3>
              {result.section_evidence.length === 0 ? (
                <div className="p-4 font-sans text-sm text-text-secondary bg-surface border border-border rounded-xl">No explicit section evidence clipped.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.section_evidence.map((ev, i) => (
                    <div key={i} className="p-4 bg-surface border border-border rounded-xl shadow-sm flex flex-col gap-2">
                      <div className="font-sans text-sm font-bold text-text-primary">{ev.title}</div>
                      <div className="font-sans text-xs text-text-muted">{ev.description}</div>
                      <div className="font-serif text-sm text-text-secondary italic border-l-2 border-gold-primary pl-3 mt-2">
                        "{ev.excerpt}"
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Detected Signals */}
            <div>
              <h3 className="font-sans text-sm font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">track_changes</span>
                Deterministic Signals Used
              </h3>
              {result.detected_signals.length === 0 ? (
                <div className="p-4 font-sans text-sm text-text-secondary bg-surface border border-border rounded-xl">No strong signals detected.</div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {result.detected_signals.map((sig, i) => (
                    <div key={i} className="px-3 py-1.5 bg-void border border-border rounded-md shadow-sm inline-flex flex-col gap-1">
                      <div className="font-sans text-[11px] font-bold text-text-primary">{sig.label}</div>
                      <div className="font-sans text-[10px] text-text-muted">{sig.description}</div>
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
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[100px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Words</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.word_count}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[100px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Lines</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.line_count}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[100px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Paragraphs</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.paragraph_count}</div>
                </div>
                <div className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[100px]">
                  <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">Headings</div>
                  <div className="font-mono text-lg text-text-primary">{result.document_profile.heading_count}</div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

    </div>
  );
}
