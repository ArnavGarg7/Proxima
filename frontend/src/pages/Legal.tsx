import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '@/lib/axios';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface LegalDomainHint {
  is_legal_like: boolean;
  confidence: number;
  reason: string;
  top_signals?: string[];
}

interface LegalSnapshot {
  contract_type: string;
  top_risk: string;
  top_obligation: string;
  top_clause_gap: string;
}

interface ClauseCard {
  clause_type: string;
  status: 'present' | 'partial' | 'not_detected';
  summary: string;
  evidence_excerpt?: string | null;
}

interface RiskFlag {
  title: string;
  category: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  evidence_excerpt?: string | null;
}

interface EvidenceCard {
  label: string;
  summary: string;
  evidence_excerpt: string;
}

interface LegalResult {
  document_id: string;
  document_title: string;
  document_domain_hint: LegalDomainHint;
  extraction_confidence: number;
  classification_summary: string;
  contract_type: string;
  parties_summary: string;
  effective_date_summary: string;
  term_or_duration_summary: string;
  legal_snapshot: LegalSnapshot;
  executive_summary: string;
  key_obligations: string[];
  payment_terms: string[];
  termination_or_renewal_terms: string[];
  clause_cards: ClauseCard[];
  risk_flags: RiskFlag[];
  evidence_cards: EvidenceCard[];
  deterministic_signals: string[];
  document_profile: {
    word_count: number;
    line_count: number;
    paragraph_count: number;
    heading_count: number;
    numbered_clauses?: number;
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function confidenceColor(score: number): string {
  if (score >= 70) return 'text-conf-high border-conf-high/30 bg-conf-high/10';
  if (score >= 40) return 'text-conf-amber border-conf-amber/30 bg-conf-amber/10';
  return 'text-conf-critical border-conf-critical/30 bg-conf-critical/10';
}

function confidenceLabel(score: number): string {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

function severityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'high': case 'critical': return 'text-conf-critical';
    case 'medium': case 'moderate': return 'text-conf-amber';
    default: return 'text-conf-low';
  }
}

function severityIcon(severity: string): string {
  switch (severity.toLowerCase()) {
    case 'high': case 'critical': return 'warning';
    case 'medium': case 'moderate': return 'error';
    default: return 'info';
  }
}

function statusBadge(status: ClauseCard['status']) {
  switch (status) {
    case 'present':
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-conf-high bg-conf-high/10 border border-conf-high/30 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-conf-high inline-block" />Present
      </span>;
    case 'partial':
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-conf-amber bg-conf-amber/10 border border-conf-amber/30 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-conf-amber inline-block" />Partial
      </span>;
    case 'not_detected':
    default:
      return <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted bg-elevated border border-border px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-text-muted inline-block" />Not Detected
      </span>;
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Legal() {
  const location = useLocation();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<LegalResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);

  useEffect(() => {
    api.get('/api/documents/').then(res => {
      const docs = Array.isArray(res.data) ? res.data : [];
      setDocuments(docs);
      if (docs.length > 0) setSelectedDocId(docs[0].id);
    }).catch(console.error).finally(() => setLoadingDocs(false));
  }, []);

  // Hydrate template launch context
  useEffect(() => {
    const ctx: TemplateLaunchContext | null =
      location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx && ctx.target_workbench === 'legal') {
      setTemplateContext(ctx);
      if (ctx.document_id) setSelectedDocId(ctx.document_id);
    }
  }, [location.state]);

  useEffect(() => { setResult(null); setError(null); }, [selectedDocId]);

  const runAnalysis = async () => {
    if (!selectedDocId) return;
    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post('/api/intelligence/legal', { document_id: selectedDocId });
      const data = res.data;

      // Helper: coerce an array item to a string (handles LLM returning objects instead of strings)
      const toStr = (item: unknown): string => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          // obligation objects: {party, obligation, category, evidence}
          if (typeof o.obligation === 'string') return o.obligation;
          // payment objects
          if (typeof o.term === 'string') return o.term;
          if (typeof o.description === 'string') return o.description;
          if (typeof o.text === 'string') return o.text;
          if (typeof o.summary === 'string') return o.summary;
          // fallback: join all string values
          return Object.values(o).filter(v => typeof v === 'string').join(' — ');
        }
        return String(item ?? '');
      };

      // Null-safe + type-safe defaults for all array fields
      data.key_obligations = (data.key_obligations ?? []).map(toStr);
      data.payment_terms = (data.payment_terms ?? []).map(toStr);
      data.termination_or_renewal_terms = (data.termination_or_renewal_terms ?? []).map(toStr);
      data.clause_cards = data.clause_cards ?? [];
      data.risk_flags = data.risk_flags ?? [];
      data.evidence_cards = data.evidence_cards ?? [];
      data.deterministic_signals = (data.deterministic_signals ?? []).map(toStr);
      data.document_profile = data.document_profile ?? {};
      data.legal_snapshot = data.legal_snapshot ?? { contract_type: '', top_risk: '', top_obligation: '', top_clause_gap: '' };
      data.document_domain_hint = data.document_domain_hint ?? { is_legal_like: false, confidence: 0, reason: '' };
      setResult(data);

    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.response?.data?.detail || err.message || 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const activeDocument = documents.find(d => d.id === selectedDocId);

  // -------------------------------------------------------------------------
  // State A — Onboarding
  // -------------------------------------------------------------------------
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
            <span className="material-symbols-outlined text-3xl text-primary">gavel</span>
          </div>

          <div>
            <h1 className="font-display text-4xl text-text-primary mb-3">Contract Analyzer</h1>
            <p className="font-sans text-base text-text-secondary max-w-md mx-auto">
              Upload or select a contract-like legal document to extract clause coverage, obligations, risk signals, and key agreement metadata.
            </p>
          </div>

          <div className="bg-elevated border border-border rounded-xl p-6 text-left max-w-sm mx-auto">
            <ul className="space-y-4 text-sm text-text-secondary font-sans">
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">description</span>
                Analyze one legal document at a time
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">policy</span>
                Extract key contract clauses and obligations
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">shield_with_heart</span>
                Detect missing or risky clause coverage
              </li>
              <li className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary text-[20px]">info</span>
                Not a substitute for legal review or counsel
              </li>
            </ul>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col items-center gap-4 max-w-md mx-auto">
            <label className="font-sans text-sm font-medium text-text-primary">Select Contract to Analyze</label>
            {loadingDocs ? (
              <div className="text-text-muted text-sm">Loading documents...</div>
            ) : documents.length === 0 ? (
              <div className="text-text-muted text-sm">No documents available. Upload one in Workspace first.</div>
            ) : (
              <div className="flex flex-col gap-4 w-full">
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
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
                  <span className="material-symbols-outlined text-[20px]">gavel</span>
                  Start Contract Analysis
                </button>
              </div>
            )}

            {error && (
              <div className="w-full bg-conf-critical/10 border border-conf-critical/20 p-3 rounded-lg text-conf-critical text-sm font-sans flex items-start gap-2">
                <span className="material-symbols-outlined text-[18px] mt-0.5">error</span>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // State B — Active Workbench
  // -------------------------------------------------------------------------
  return (
    <div className="flex-1 p-8 bg-void min-h-[calc(100vh-60px)] flex gap-6 overflow-hidden">

      {/* ── Left column: controls + snapshot ── */}
      <div className="w-[300px] shrink-0 flex flex-col gap-5 overflow-y-auto pr-2">

        <header className="flex justify-between items-center">
          <h1 className="font-display text-xl text-text-primary flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">gavel</span>
            Contract Analyzer
          </h1>
          <button onClick={() => setResult(null)} className="text-text-secondary hover:text-text-primary font-sans text-xs underline flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">arrow_back</span>
            New Scan
          </button>
        </header>

        {templateContext && (
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        )}

        {/* Target Document */}
        <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
          <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-2">Target Document</div>
          <div className="flex items-center gap-2 mb-4">
            <span className="material-symbols-outlined text-text-secondary text-[18px]">description</span>
            <span className="font-sans text-sm font-medium text-text-primary truncate">{activeDocument?.title || 'Selected Document'}</span>
          </div>
          <button
            onClick={runAnalysis}
            disabled={isAnalyzing}
            className="w-full bg-gold-primary text-void py-2 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
          >
            {isAnalyzing
              ? <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Analyzing...</>
              : <><span className="material-symbols-outlined text-[16px]">refresh</span> Rerun Analysis</>}
          </button>
        </div>

        {error && (
          <div className="bg-conf-critical/10 border border-conf-critical/20 p-3 rounded-xl text-conf-critical text-sm font-sans flex items-start gap-2">
            <span className="material-symbols-outlined text-[16px] mt-0.5">error</span>
            {error}
          </div>
        )}

        {result && (
          <>
            {/* Non-legal warning */}
            {!result.document_domain_hint.is_legal_like && (
              <div className="bg-conf-low/10 border border-conf-low/30 p-4 rounded-xl flex items-start gap-3">
                <span className="material-symbols-outlined text-conf-amber mt-0.5">info</span>
                <div>
                  <h4 className="font-sans text-sm font-bold text-text-primary mb-1">Non-Legal Document Detected</h4>
                  <p className="font-sans text-xs text-text-secondary leading-relaxed">{result.document_domain_hint.reason}</p>
                </div>
              </div>
            )}

            {/* Extraction Confidence */}
            <div className="bg-elevated border border-border rounded-xl p-4 shadow-sm">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-3">Extraction Confidence</div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${confidenceColor(result.extraction_confidence)}`}>
                  {confidenceLabel(result.extraction_confidence)}
                </span>
                <span className="font-display text-2xl text-text-primary">{result.extraction_confidence}%</span>
              </div>
            </div>

            {/* Legal Snapshot */}
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-4">Legal Snapshot</div>
              <div className="space-y-3">
                {[
                  { label: 'Contract Type', value: result.legal_snapshot.contract_type },
                  { label: 'Top Risk', value: result.legal_snapshot.top_risk },
                  { label: 'Top Obligation', value: result.legal_snapshot.top_obligation },
                  { label: 'Top Clause Gap', value: result.legal_snapshot.top_clause_gap },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">{label}</div>
                    <div className="font-sans text-xs text-text-primary leading-relaxed">{value || 'Not clearly identifiable'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Flags */}
            <div className="bg-surface border border-border rounded-xl p-4 shadow-sm">
              <div className="text-xs font-sans text-text-muted uppercase tracking-wider mb-3">Risk Flags</div>
              {result.risk_flags.length === 0 ? (
                <div className="font-sans text-xs text-text-secondary">No major risk flags detected.</div>
              ) : (
                <div className="space-y-3">
                  {result.risk_flags.map((flag, idx) => (
                    <div key={idx} className="bg-void border border-border rounded-lg p-3 flex gap-2 items-start">
                      <span className={`material-symbols-outlined mt-0.5 text-sm ${severityColor(flag.severity)}`}>
                        {severityIcon(flag.severity)}
                      </span>
                      <div>
                        <div className="font-sans text-xs font-bold text-text-primary flex items-start justify-between gap-1">
                          <span>{flag.title}</span>
                          <span className="text-[9px] text-text-muted bg-elevated px-1 py-0.5 rounded border border-border capitalize shrink-0">
                            {flag.category.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div className="font-sans text-[11px] text-text-secondary mt-1 leading-relaxed">{flag.description}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Right column: deep analysis ── */}
      <div className="flex-1 bg-elevated border border-border rounded-xl flex flex-col overflow-hidden">
        {isAnalyzing ? (
          <div className="flex-1 flex flex-col items-center justify-center text-text-muted gap-4">
            <span className="material-symbols-outlined animate-spin text-4xl text-primary">gavel</span>
            <p className="font-sans text-sm animate-pulse">Extracting legal structure…</p>
          </div>
        ) : result && (
          <div className="flex-1 overflow-y-auto p-8 space-y-10">

            {/* ── 1. Legal Overview Hero ── */}
            <section>
              <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">summarize</span>
                Legal Overview
              </h2>
              <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-3">
                <p className="font-sans text-xs text-text-muted uppercase tracking-wider font-bold">{result.classification_summary}</p>
                <p className="font-sans text-base text-text-primary leading-relaxed">{result.executive_summary}</p>
              </div>
            </section>

            {/* ── 2. Contract Metadata Grid ── */}
            <section>
              <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">article</span>
                Agreement Metadata
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: 'contract', label: 'Contract Type', value: result.contract_type },
                  { icon: 'groups', label: 'Parties', value: result.parties_summary },
                  { icon: 'calendar_today', label: 'Effective Date', value: result.effective_date_summary },
                  { icon: 'schedule', label: 'Term / Duration', value: result.term_or_duration_summary },
                ].map(({ icon, label, value }) => (
                  <div key={label} className="bg-surface border border-border rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-primary text-[16px]">{icon}</span>
                      <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{label}</span>
                    </div>
                    <p className="font-sans text-sm text-text-primary leading-relaxed">{value || 'Not clearly identifiable'}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── 3. Clause Coverage Grid ── */}
            {result.clause_cards && result.clause_cards.length > 0 && (
              <section>
                <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm">checklist</span>
                  Clause Coverage
                </h2>
                <div className="grid grid-cols-2 xl:grid-cols-3 gap-4">
                  {result.clause_cards.map((card, idx) => (
                    <div
                      key={idx}
                      className={`bg-surface border rounded-xl p-4 shadow-sm flex flex-col gap-2 ${
                        card.status === 'present' ? 'border-conf-high/20' :
                        card.status === 'partial' ? 'border-conf-amber/20' :
                        'border-border'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-sans text-sm font-bold text-text-primary">{card.clause_type}</span>
                        {statusBadge(card.status)}
                      </div>
                      <p className="font-sans text-xs text-text-secondary leading-relaxed">{card.summary}</p>
                      {card.evidence_excerpt && (
                        <div className="mt-1 border-l-2 border-gold-primary pl-2 font-serif text-[11px] text-text-muted italic">
                          "{(card.evidence_excerpt ?? '').slice(0, 150)}{(card.evidence_excerpt ?? '').length > 150 ? '…' : ''}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── 4. Obligations / Commercial Terms ── */}
            <section>
              <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">handshake</span>
                Obligations & Commercial Terms
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {/* Key Obligations */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[16px]">task_alt</span>
                    Key Obligations
                  </h3>
                  {result.key_obligations.length === 0 ? (
                    <p className="font-sans text-xs text-text-muted">None clearly detected.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.key_obligations.map((ob, i) => (
                        <li key={i} className="flex gap-2 items-start text-xs text-text-secondary font-sans">
                          <span className="material-symbols-outlined text-gold-primary text-[14px] mt-0.5 shrink-0">adjust</span>
                          {ob}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Payment Terms */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[16px]">payments</span>
                    Payment Terms
                  </h3>
                  {result.payment_terms.length === 0 ? (
                    <p className="font-sans text-xs text-text-muted">None clearly detected.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.payment_terms.map((pt, i) => (
                        <li key={i} className="flex gap-2 items-start text-xs text-text-secondary font-sans">
                          <span className="material-symbols-outlined text-gold-primary text-[14px] mt-0.5 shrink-0">adjust</span>
                          {pt}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                {/* Termination & Renewal */}
                <div className="bg-surface border border-border rounded-xl p-5 shadow-sm">
                  <h3 className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-primary text-[16px]">event_repeat</span>
                    Termination & Renewal
                  </h3>
                  {result.termination_or_renewal_terms.length === 0 ? (
                    <p className="font-sans text-xs text-text-muted">None clearly detected.</p>
                  ) : (
                    <ul className="space-y-2">
                      {result.termination_or_renewal_terms.map((t, i) => (
                        <li key={i} className="flex gap-2 items-start text-xs text-text-secondary font-sans">
                          <span className="material-symbols-outlined text-gold-primary text-[14px] mt-0.5 shrink-0">adjust</span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </section>

            {/* ── 5. Section Evidence ── */}
            {result.evidence_cards && result.evidence_cards.length > 0 && (
              <section>
                <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm">plagiarism</span>
                  Clause Evidence
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {result.evidence_cards.map((ev, i) => (
                    <div key={i} className="p-4 bg-surface border border-border rounded-xl shadow-sm flex flex-col gap-2">
                      <div className="font-sans text-sm font-bold text-text-primary">{ev.label}</div>
                      <div className="font-sans text-xs text-text-muted">{ev.summary}</div>
                      <div className="mt-1 border-l-2 border-gold-primary pl-3 font-serif text-sm text-text-secondary italic">
                        "{(ev.evidence_excerpt ?? '').slice(0, 250)}{(ev.evidence_excerpt ?? '').length > 250 ? '…' : ''}"
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* ── 6. Deterministic Signals ── */}
            {result.deterministic_signals && result.deterministic_signals.length > 0 && (
              <section>
                <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                  <span className="material-symbols-outlined text-sm">track_changes</span>
                  Deterministic Signals Used
                </h2>
                <div className="flex flex-wrap gap-2">
                  {result.deterministic_signals.map((sig, i) => (
                    <span key={i} className="px-3 py-1.5 bg-void border border-border rounded-md text-[11px] font-sans font-medium text-text-secondary shadow-sm">
                      {sig}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* ── 7. Document Profile ── */}
            <section>
              <h2 className="font-sans text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-sm">analytics</span>
                Document Profile
              </h2>
              <div className="flex flex-wrap gap-4">
                {[
                  { label: 'Words', value: result.document_profile?.word_count ?? '—' },
                  { label: 'Lines', value: result.document_profile?.line_count ?? '—' },
                  { label: 'Paragraphs', value: result.document_profile?.paragraph_count ?? '—' },
                  { label: 'Headings', value: result.document_profile?.heading_count ?? '—' },
                  { label: 'Numbered Clauses', value: result.document_profile?.numbered_clauses ?? '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-surface border border-border rounded-lg p-3 flex-1 min-w-[100px]">
                    <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1">{label}</div>
                    <div className="font-mono text-lg text-text-primary">{value}</div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        )}
      </div>
    </div>
  );
}
