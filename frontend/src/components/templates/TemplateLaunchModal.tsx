// frontend/src/components/templates/TemplateLaunchModal.tsx

import { useState, useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import {
  type TemplateListItem,
  type TemplateLaunchContext,
  saveTemplateLaunchContext,
} from '@/types/template';
import { motionVariants } from '@/theme/motion';

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
  const reduced  = useReducedMotion();

  const [documents, setDocuments]     = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState('');
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [isLaunching, setIsLaunching] = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const closeButtonRef   = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<Element | null>(null);
  const modalRef         = useRef<HTMLDivElement>(null);

  /* Capture caller's focus, move into modal, restore on unmount */
  useEffect(() => {
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    return () => {
      (previousFocusRef.current as HTMLElement | null)?.focus();
    };
  }, []);

  /* Close on ESC */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  /* Trap Tab/Shift+Tab within the modal */
  useEffect(() => {
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !modalRef.current) return;
      const focusable = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last)  { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, []);

  const needsDocument = template.launch_mode === 'document_required';
  const isCodeInput   = template.launch_mode === 'code_input';
  const domainStyle   = DOMAIN_STYLES[template.domain] ?? DOMAIN_STYLES.general;

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
      saveTemplateLaunchContext(ctx);

      const route = ROUTE_MAP[template.target_workbench] ?? '/workspace';
      navigate(route, { state: { templateContext: ctx } });
      onClose();
    } catch (err: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) {
      setError(err.response?.data?.detail || err.message || 'Launch failed');
    } finally {
      setIsLaunching(false);
    }
  };

  const canLaunch = isCodeInput || !needsDocument || Boolean(selectedDocId);

  // Motion variants — duration 0 when reduced motion is preferred
  const overlayVariants = reduced
    ? { hidden: {}, visible: {}, exit: {} }
    : motionVariants.overlay;

  const dialogVariants = reduced
    ? { hidden: {}, visible: {}, exit: {} }
    : motionVariants.dialog;

  return (
    /* Backdrop */
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={overlayVariants}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Dialog */}
      <motion.div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tl-modal-title"
        className="w-full max-w-[520px] bg-elevated border border-white/[0.07] rounded-2xl shadow-dialog flex flex-col overflow-hidden"
        initial="hidden"
        animate="visible"
        exit="exit"
        variants={dialogVariants}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-primary" aria-hidden="true">{template.icon}</span>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${domainStyle}`}>
                  {template.badge_label}
                </span>
              </div>
              <h2 id="tl-modal-title" className="font-display text-lg text-text-primary">{template.name}</h2>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-text-muted hover:text-text-secondary transition-colors mt-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-6 space-y-5">

          {/* Description */}
          <p className="font-sans text-sm text-text-secondary leading-relaxed">{template.description}</p>

          {/* What this workflow does */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[12px]" aria-hidden="true">bolt</span>
              Default Workflow Instructions
            </div>
            <p className="font-sans text-xs text-text-secondary leading-relaxed line-clamp-4">
              {template.default_instructions}
            </p>
          </div>

          {/* Code input explanation */}
          {isCodeInput && (
            <div className="bg-conf-amber/8 border border-conf-amber/25 rounded-xl p-4 flex items-start gap-3">
              <span className="material-symbols-outlined text-conf-amber text-sm mt-0.5" aria-hidden="true">code</span>
              <p className="font-sans text-xs text-text-secondary leading-relaxed">
                This template routes to <strong className="text-text-primary">Code Suite</strong> where you paste or upload code directly. No uploaded document is required.
              </p>
            </div>
          )}

          {/* Document selector */}
          {needsDocument && (
            <div>
              <label htmlFor="tl-doc-select" className="font-sans text-xs font-bold text-text-primary uppercase tracking-wider mb-2 block">
                Select Document to Analyze
              </label>
              <div aria-live="polite" aria-atomic="true">
              {loadingDocs ? (
                <div className="flex items-center gap-2 text-text-muted text-sm py-2" role="status">
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Loading documents…
                </div>
              ) : documents.length === 0 ? (
                <div className="text-text-muted text-sm py-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">folder_open</span>
                  No documents available. Upload one in Workspace first.
                </div>
              ) : (
                <select
                  id="tl-doc-select"
                  value={selectedDocId}
                  onChange={e => setSelectedDocId(e.target.value)}
                  className="w-full bg-surface border border-border text-text-primary rounded-lg px-3 py-2 text-sm font-sans hover:border-border-strong transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-gold-primary/30 focus:border-gold-primary"
                >
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.title} ({new Date(doc.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              )}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="bg-conf-critical/10 border border-conf-critical/20 p-3 rounded-lg text-conf-critical text-xs font-sans flex items-start gap-2"
            >
              <span className="material-symbols-outlined text-[16px] mt-0.5 shrink-0" aria-hidden="true">error</span>
              {error}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="font-sans text-sm text-text-secondary hover:text-text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 rounded"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleLaunch}
            disabled={!canLaunch || isLaunching || (needsDocument && documents.length === 0)}
            aria-busy={isLaunching}
            className="bg-gold-primary text-void px-5 py-2 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 motion-safe:active:scale-[0.98]"
          >
            {isLaunching ? (
              <><span className="material-symbols-outlined text-[16px] motion-safe:animate-spin" aria-hidden="true">sync</span> Launching…</>
            ) : (
              <><span className="material-symbols-outlined text-[16px]" aria-hidden="true">rocket_launch</span> Launch Template</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
