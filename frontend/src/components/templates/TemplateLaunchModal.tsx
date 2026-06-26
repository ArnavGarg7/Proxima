// frontend/src/components/templates/TemplateLaunchModal.tsx
// Phase 4.20 — Template Launch Modal

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import {
  type TemplateListItem,
  type TemplateLaunchContext,
  saveTemplateLaunchContext,
} from '@/types/template';

interface Document {
  id: string;
  title: string;
  created_at: string;
}

interface TemplateLaunchModalProps {
  template: TemplateListItem;
  onClose: () => void;
}

const ROUTE_MAP: Record<string, string> = {
  clinical: '/clinical',
  legal:    '/legal',
  code:     '/code',
  analyze:  '/analyze',
};

const DOMAIN_STYLES: Record<string, string> = {
  clinical: 'text-conf-high bg-conf-high/10 border-conf-high/25',
  legal:    'text-primary bg-primary/10 border-primary/25',
  code:     'text-conf-amber bg-conf-amber/10 border-conf-amber/25',
  general:  'text-text-secondary bg-surface border-border',
};

export default function TemplateLaunchModal({ template, onClose }: TemplateLaunchModalProps) {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const needsDocument = template.launch_mode === 'document_required';
  const isCodeInput   = template.launch_mode === 'code_input';
  const domainStyle   = DOMAIN_STYLES[template.domain] ?? DOMAIN_STYLES.general;

  // Load documents if template needs one
  useEffect(() => {
    if (!needsDocument) { setLoadingDocs(false); return; }
    api.get('/api/documents/')
      .then(res => {
        const docs: Document[] = Array.isArray(res.data) ? res.data : [];
        setDocuments(docs);
        if (docs.length > 0) setSelectedDocId(docs[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingDocs(false));
  }, [needsDocument]);

  const handleLaunch = async () => {
    setIsLaunching(true);
    setError(null);

    try {
      const res = await api.post('/api/templates/launch', {
        template_id: template.id,
        document_id: needsDocument ? selectedDocId : null,
      });

      const ctx: TemplateLaunchContext = res.data;

      // Persist to sessionStorage for refresh resilience
      saveTemplateLaunchContext(ctx);

      // Route to the correct workbench, passing context via navigation state
      const route = ROUTE_MAP[template.target_workbench] ?? '/workspace';
      navigate(route, { state: { templateContext: ctx } });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || err.message || 'Launch failed');
    } finally {
      setIsLaunching(false);
    }
  };

  const canLaunch = isCodeInput || !needsDocument || Boolean(selectedDocId);

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-[520px] bg-elevated border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-primary">{template.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${domainStyle}`}>
                  {template.badge_label}
                </span>
              </div>
              <h2 className="font-display text-lg text-text-primary">{template.name}</h2>
            </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-text-secondary transition-colors mt-1">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5">

          {/* Description */}
          <p className="font-sans text-sm text-text-secondary leading-relaxed">{template.description}</p>

          {/* What this workflow does */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px]">bolt</span>
              Default Workflow Instructions
            </div>
            <p className="font-sans text-xs text-text-secondary leading-relaxed line-clamp-4">
              {template.default_instructions}
            </p>
          </div>

          {/* Code input explanation */}
          {isCodeInput && (
            <div className="bg-conf-amber/8 border border-conf-amber/25 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-conf-amber text-sm mt-0.5">code</span>
              <p className="font-sans text-xs text-text-secondary leading-relaxed">
                This template routes to <strong className="text-text-primary">Code Suite</strong> where you paste or upload code directly. No uploaded document is required.
              </p>
            </div>
          )}

          {/* Document selector */}
          {needsDocument && (
            <div>
              <label className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider mb-2 block">
                Select Document to Analyze
              </label>
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-text-muted text-sm py-2">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Loading documents…
                </div>
              ) : documents.length === 0 ? (
                <div className="text-text-muted text-sm py-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  No documents available. Upload one in Workspace first.
                </div>
              ) : (
                <select
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  className="w-full bg-surface border border-border text-text-primary rounded-lg px-3 py-2 text-sm font-sans focus:ring-1 focus:ring-primary focus:border-primary"
                >
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({new Date(doc.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-conf-critical/10 border border-conf-critical/20 p-3 rounded-lg text-conf-critical text-xs font-sans flex items-start gap-2">
              <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0">error</span>
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleLaunch}
            disabled={!canLaunch || isLaunching || (needsDocument && documents.length === 0)}
            className="bg-gold-primary text-void px-5 py-2 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {isLaunching ? (
              <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Launching…</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]">rocket_launch</span> Launch Template</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
