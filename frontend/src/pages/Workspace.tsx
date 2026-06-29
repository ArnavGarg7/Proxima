import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useRef, useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

/* ── Workbench catalogue ─────────────────────────────────────────────────────
   Full literal class names so Tailwind JIT includes them.                     */

const WORKBENCHES = [
  {
    id:          'analyze',
    icon:        'hub',
    iconClass:   'text-gold-primary',
    accentClass: 'group-hover:bg-gold-primary/8',
    title:       'General Analyze',
    description: 'Extract key takeaways, topics, entities, metrics, and action items.',
    route:       '/analyze',
  },
  {
    id:          'clinical',
    icon:        'medical_services',
    iconClass:   'text-domain-medical',
    accentClass: 'group-hover:bg-domain-medical/8',
    title:       'Clinical Intelligence',
    description: 'Analyze clinical trials, patient history, and medical literature.',
    route:       '/clinical',
  },
  {
    id:          'legal',
    icon:        'gavel',
    iconClass:   'text-domain-legal',
    accentClass: 'group-hover:bg-domain-legal/8',
    title:       'Legal & Contract',
    description: 'Analyze contracts for risks, obligations, governing law, and payment terms.',
    route:       '/legal',
  },
  {
    id:          'audit',
    icon:        'verified',
    iconClass:   'text-conf-high',
    accentClass: 'group-hover:bg-conf-high/8',
    title:       'Confidence Audit',
    description: 'Evaluate hallucination risk and document quality with a deterministic pass.',
    route:       '/audit',
  },
] as const;

/* ── Upload info chips ──────────────────────────────────────────────────── */

const UPLOAD_INFO = [
  { label: 'Supported',  value: 'PDF · DOCX · TXT' },
  { label: 'Max size',   value: '25 MB'             },
  { label: 'Processing', value: '~10 sec'           },
] as const;

/* ── Recent document type ────────────────────────────────────────────────── */

interface RecentDocument {
  id:               string;
  filename?:        string;
  title?:           string;
  created_at?:      string;
  status?:          string;
  confidence_score?: number;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function docStatusVariant(status?: string): 'success' | 'warning' | 'error' | 'default' {
  switch (status?.toLowerCase()) {
    case 'ready':      return 'success';
    case 'processing': return 'warning';
    case 'failed':     return 'error';
    default:           return 'default';
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function Workspace() {
  const { currentDocumentId, setCurrentDocumentId } = useWorkspaceStore();

  const fileInputRef   = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  const [searchParams] = useSearchParams();
  const location       = useLocation();
  const navigate       = useNavigate();

  const [error,           setError]           = useState<string | null>(null);
  const [isUploading,     setIsUploading]     = useState(false);
  const [activeFilename,  setActiveFilename]  = useState<string | null>(null);
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);
  const [isDragging,      setIsDragging]      = useState(false);
  const [recentDocs,      setRecentDocs]      = useState<RecentDocument[]>([]);

  /* Load document from URL param ─────────────────────────────────────────── */
  useEffect(() => {
    const docId = searchParams.get('document_id');
    if (docId && docId !== currentDocumentId) {
      const fetchDocument = async () => {
        try {
          const res = await api.get(`/api/documents/${docId}`);
          handleNewDocument(docId, res.data.filename || res.data.title || `Document ${docId}`);
        } catch {
          setError(`Failed to load document: ${docId}. It may not exist or you don't have access.`);
        }
      };
      fetchDocument();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  /* Hydrate template launch context ──────────────────────────────────────── */
  useEffect(() => {
    const ctx: TemplateLaunchContext | null =
      location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx) {
      setTemplateContext(ctx);
      if (ctx.document_id) {
        setCurrentDocumentId(ctx.document_id);
        setActiveFilename(ctx.document_name || ctx.document_id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  /* Fetch recent documents (silent failure — section hides when empty) ───── */
  useEffect(() => {
    api.get('/api/documents')
      .then((res) => {
        const raw  = res.data as unknown;
        const list = Array.isArray(raw)
          ? (raw as RecentDocument[])
          : Array.isArray((raw as { documents?: unknown }).documents)
            ? ((raw as { documents: RecentDocument[] }).documents)
            : [];
        setRecentDocs(list.slice(0, 5));
      })
      .catch(() => { /* silent — section stays hidden */ });
  }, []);

  /* ── Upload helpers ──────────────────────────────────────────────────────── */

  const handleNewDocument = (docId: string, filename: string) => {
    setCurrentDocumentId(docId);
    setActiveFilename(filename);
    setError(null);
    /* Refresh recent list after upload */
    setRecentDocs((prev) => {
      const next: RecentDocument = { id: docId, filename, created_at: new Date().toISOString(), status: 'ready' };
      return [next, ...prev.filter((d) => d.id !== docId)].slice(0, 5);
    });
  };

  /* Shared upload logic ───────────────────────────────────────────────────── */
  const uploadFile = async (file: File) => {
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      handleNewDocument(response.data.document_id, file.name);
    } catch (err: unknown) {
      console.error('Upload failed:', err);
      const e = err as { response?: { status?: number } };
      if (e.response?.status === 401 || e.response?.status === 403) {
        setError('Unauthorized: Please log in again.');
      } else if (e.response?.status === 422) {
        setError('Validation Error: Invalid file format or size.');
      } else {
        setError('Failed to upload document. Internal Server Error.');
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  /* ── Drag-and-drop handlers ──────────────────────────────────────────────── */

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current++;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="flex-1 overflow-y-auto">

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        accept=".txt,.pdf,.docx"
      />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 px-4 py-3 rounded-lg
              bg-conf-critical/8 border border-conf-critical/20 text-conf-critical"
          >
            <span className="material-symbols-outlined text-[18px] mt-0.5 shrink-0" aria-hidden="true">
              error_outline
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-sans text-sm font-semibold">Upload failed</span>
              <span className="font-sans text-sm text-conf-critical/80">{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="ml-auto shrink-0 text-conf-critical/60 hover:text-conf-critical transition-colors duration-150"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>
        )}

        {/* ── Template banner ───────────────────────────────────────────────── */}
        {templateContext && (
          <div className="mb-6">
            <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
          </div>
        )}

        {!currentDocumentId ? (
          /* ══ State A — Empty workspace ══════════════════════════════════════ */
          <div className="flex flex-col gap-10">

            {/* ── Hero ───────────────────────────────────────────────────────── */}
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">

              {/* Radial ambient glow — anchored behind hero text */}
              <div
                className="absolute -left-8 -top-8 w-[400px] h-[200px] pointer-events-none"
                aria-hidden="true"
              >
                <div className="w-full h-full rounded-full bg-[radial-gradient(ellipse_at_top_left,rgba(201,168,76,0.06)_0%,transparent_65%)]" />
              </div>

              <div className="relative flex flex-col gap-1.5">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-gold-primary/70">
                  AI Workspace
                </span>
                <h1 className="font-display text-[2.25rem] font-semibold leading-tight text-text-primary">
                  Your documents become
                  <br />
                  <span className="text-gold-primary">structured intelligence.</span>
                </h1>
                <p className="font-sans text-sm text-text-secondary mt-0.5 max-w-sm">
                  Upload, organize, and route documents to specialized AI engines for
                  deep analysis.
                </p>
              </div>

              {/* Upload button — group so child arrow can react to hover */}
              <Button
                variant="primary"
                size="lg"
                className="group w-full sm:w-auto sm:shrink-0"
                leftIcon={
                  <span
                    className="material-symbols-outlined text-[17px] transition-transform duration-150 group-hover:-translate-y-0.5"
                    aria-hidden="true"
                  >
                    upload
                  </span>
                }
                rightIcon={
                  <span
                    className="material-symbols-outlined text-[15px] opacity-60 transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  >
                    arrow_forward
                  </span>
                }
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                isLoading={isUploading}
              >
                Upload Document
              </Button>
            </div>

            {/* ── Drop zone ──────────────────────────────────────────────────── */}
            <div className="relative">

              {/* Ambient glow behind the zone — fades in with drag */}
              <div
                aria-hidden="true"
                className={cn(
                  'absolute inset-0 -m-4 pointer-events-none rounded-2xl transition-opacity duration-300',
                  'bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.07)_0%,transparent_70%)]',
                  isDragging ? 'opacity-100' : 'opacity-0',
                )}
              />

              <div
                role="button"
                tabIndex={0}
                aria-label="Upload document — click or drag a file here"
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    if (!isUploading) fileInputRef.current?.click();
                  }
                }}
                className={cn(
                  'group relative flex flex-col items-center justify-center overflow-hidden',
                  'min-h-[200px] sm:min-h-[340px] rounded-xl border-2 border-dashed',
                  'cursor-pointer select-none',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
                  /* Transition everything cleanly */
                  'transition-all duration-300',
                  isDragging
                    ? 'border-gold-primary bg-gold-primary/5 shadow-[0_0_60px_rgba(201,168,76,0.12),inset_0_0_60px_rgba(201,168,76,0.04)]'
                    : 'border-border bg-void hover:border-gold-primary/40 hover:bg-gold-primary/[0.02] hover:shadow-[0_0_40px_rgba(201,168,76,0.06)]',
                  isUploading && 'pointer-events-none',
                )}
              >
                {/* Hover radial gradient layer — opacity transitions in */}
                <div
                  aria-hidden="true"
                  className={cn(
                    'absolute inset-0 pointer-events-none transition-opacity duration-300',
                    'bg-[radial-gradient(ellipse_at_center,rgba(201,168,76,0.04)_0%,transparent_65%)]',
                    isDragging ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
                  )}
                />

                {isUploading ? (
                  /* ── Uploading state ── */
                  <div className="relative flex flex-col items-center gap-5 text-center px-8">
                    {/* Layered illustration — uploading */}
                    <div className="relative flex items-center justify-center">
                      {/* Outer pulse ring */}
                      <div className="absolute w-20 h-20 rounded-full border border-gold-primary/20 animate-ping" />
                      <div className="w-16 h-16 rounded-full border border-gold-primary/30 bg-gold-primary/5 flex items-center justify-center">
                        <span
                          className="material-symbols-outlined text-gold-primary text-3xl animate-spin"
                          aria-hidden="true"
                        >
                          refresh
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <p className="font-sans text-sm font-semibold text-text-primary">
                        Uploading document…
                      </p>
                      <p className="font-sans text-xs text-text-muted">
                        Processing and extracting content
                      </p>
                    </div>

                    {/* Indeterminate progress bar */}
                    <div className="w-48 h-px rounded-full bg-border overflow-hidden">
                      <div
                        className="h-full bg-gold-primary rounded-full"
                        style={{ animation: 'shimmer 1.5s ease-in-out infinite' }}
                      />
                    </div>
                  </div>
                ) : (
                  /* ── Idle / drag-active state ── */
                  <div
                    className={cn(
                      'relative flex flex-col items-center gap-6 text-center px-8 py-2',
                      'transition-transform duration-300',
                      /* Entire illustration lifts on drag */
                      isDragging ? '-translate-y-1' : 'translate-y-0',
                    )}
                  >
                    {/* Layered illustration */}
                    <div className="relative flex items-center justify-center">
                      {/* Decorative outer ring */}
                      <div
                        className={cn(
                          'absolute w-28 h-28 rounded-full border transition-all duration-300',
                          isDragging
                            ? 'border-gold-primary/30 scale-110'
                            : 'border-border/40 group-hover:border-gold-primary/20 group-hover:scale-105',
                        )}
                      />

                      {/* Middle ring */}
                      <div
                        className={cn(
                          'absolute w-20 h-20 rounded-full border transition-all duration-300',
                          isDragging
                            ? 'border-gold-primary/20 scale-110'
                            : 'border-border/60 group-hover:border-gold-primary/15 group-hover:scale-105',
                        )}
                      />

                      {/* Core icon circle */}
                      <div
                        className={cn(
                          'relative z-10 w-14 h-14 rounded-full border flex items-center justify-center',
                          'transition-all duration-300',
                          isDragging
                            ? 'border-gold-primary/50 bg-gold-primary/10 scale-110'
                            : 'border-border bg-elevated group-hover:border-gold-primary/30 group-hover:bg-gold-primary/5 group-hover:scale-105',
                        )}
                      >
                        <span
                          className={cn(
                            'material-symbols-outlined text-[28px] transition-all duration-300',
                            isDragging
                              ? 'text-gold-primary'
                              : 'text-text-muted group-hover:text-gold-primary',
                          )}
                          style={{ fontVariationSettings: "'FILL' 1" }}
                          aria-hidden="true"
                        >
                          {isDragging ? 'move_to_inbox' : 'upload_file'}
                        </span>
                      </div>

                      {/* Sparkle dots — appear on drag or hover */}
                      {[
                        'absolute -top-1 right-5',
                        'absolute top-4 -right-1',
                        'absolute -bottom-1 left-5',
                      ].map((pos, i) => (
                        <div
                          key={i}
                          className={cn(
                            'w-1 h-1 rounded-full bg-gold-primary transition-all duration-300',
                            pos,
                            isDragging
                              ? 'opacity-80 scale-100'
                              : 'opacity-0 scale-0 group-hover:opacity-40 group-hover:scale-100',
                          )}
                          style={{ transitionDelay: `${i * 40}ms` }}
                          aria-hidden="true"
                        />
                      ))}
                    </div>

                    {/* Labels */}
                    <div className="flex flex-col gap-1.5">
                      <p
                        className={cn(
                          'font-sans text-base font-semibold transition-colors duration-200',
                          isDragging ? 'text-gold-primary' : 'text-text-primary',
                        )}
                      >
                        {isDragging ? 'Drop your document' : 'Drag & Drop'}
                      </p>
                      {!isDragging && (
                        <p className="font-sans text-sm text-text-secondary">
                          or{' '}
                          <span className="text-gold-primary transition-all duration-150 hover:underline underline-offset-2">
                            browse files
                          </span>{' '}
                          from your computer
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Info row ───────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 flex-wrap">
              {UPLOAD_INFO.map((info) => (
                <div
                  key={info.label}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg
                    bg-elevated border border-border"
                >
                  <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
                    {info.label}
                  </span>
                  <span className="w-px h-3 bg-border shrink-0" aria-hidden="true" />
                  <span className="font-mono text-xs font-semibold text-text-secondary">
                    {info.value}
                  </span>
                </div>
              ))}
            </div>

            {/* ── Recent uploads ─────────────────────────────────────────────── */}
            <Panel
              title="Recent Uploads"
              noPadding
            >
              {recentDocs.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-5 text-text-muted">
                  <span
                    className="material-symbols-outlined text-[18px]"
                    aria-hidden="true"
                  >
                    folder_open
                  </span>
                  <span className="font-sans text-sm">No uploads yet.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[480px] text-left border-collapse">
                    <thead>
                      <tr className="border-b border-border">
                        {['Name', 'Uploaded', 'Status', 'Confidence', ''].map((col) => (
                          <th
                            key={col}
                            className="px-5 py-3 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {recentDocs.map((doc) => (
                        <tr
                          key={doc.id}
                          className="border-b border-border/50 last:border-0 hover:bg-elevated/60 transition-colors duration-100"
                        >
                          {/* Name */}
                          <td className="px-5 py-3.5 max-w-[240px]">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="material-symbols-outlined text-[16px] text-text-muted shrink-0"
                                aria-hidden="true"
                              >
                                description
                              </span>
                              <span className="font-sans text-sm text-text-primary truncate">
                                {doc.filename ?? doc.title ?? doc.id}
                              </span>
                            </div>
                          </td>
                          {/* Date */}
                          <td className="px-5 py-3.5">
                            <span className="font-sans text-xs text-text-muted tabular-nums">
                              {formatDate(doc.created_at)}
                            </span>
                          </td>
                          {/* Status */}
                          <td className="px-5 py-3.5">
                            <Badge variant={docStatusVariant(doc.status)} size="sm">
                              {doc.status ?? 'ready'}
                            </Badge>
                          </td>
                          {/* Confidence */}
                          <td className="px-5 py-3.5">
                            <span className="font-mono text-xs text-text-secondary tabular-nums">
                              {doc.confidence_score != null
                                ? `${Math.round(doc.confidence_score)}%`
                                : '—'}
                            </span>
                          </td>
                          {/* Action */}
                          <td className="px-5 py-3.5">
                            <button
                              onClick={() => {
                                setCurrentDocumentId(doc.id);
                                setActiveFilename(doc.filename ?? doc.title ?? doc.id);
                              }}
                              className="inline-flex items-center gap-1 font-sans text-xs text-text-muted
                                hover:text-gold-primary transition-colors duration-150
                                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
                            >
                              Open
                              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                                arrow_forward
                              </span>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

          </div>
        ) : (
          /* ══ State B — Document loaded ══════════════════════════════════════ */
          <div className="flex flex-col gap-8">

            {/* Hero */}
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              {/* Ambient glow */}
              <div
                className="absolute -left-8 -top-8 w-[300px] h-[160px] pointer-events-none"
                aria-hidden="true"
              >
                <div className="w-full h-full rounded-full bg-[radial-gradient(ellipse_at_top_left,rgba(201,168,76,0.05)_0%,transparent_65%)]" />
              </div>

              <div className="relative flex flex-col gap-1">
                <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
                  Workspace
                </span>
                <h1 className="font-display text-[2rem] font-semibold leading-tight text-text-primary">
                  Document Ready
                </h1>
              </div>

              <Button
                variant="secondary"
                size="md"
                className="group w-full sm:w-auto sm:shrink-0"
                leftIcon={
                  <span
                    className="material-symbols-outlined text-[16px] transition-transform duration-150 group-hover:rotate-180"
                    aria-hidden="true"
                  >
                    swap_horiz
                  </span>
                }
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                isLoading={isUploading}
              >
                Swap Document
              </Button>
            </div>

            {/* Active document card */}
            <Panel title="Active Document" noPadding>
              <div className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-10 h-10 shrink-0 rounded border border-border bg-elevated flex items-center justify-center">
                    <span
                      className="material-symbols-outlined text-text-secondary text-[20px]"
                      aria-hidden="true"
                    >
                      description
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="font-sans text-sm font-semibold text-text-primary truncate">
                      {activeFilename || currentDocumentId}
                    </span>
                    <span className="font-sans text-xs text-text-muted">Active in workspace</span>
                  </div>
                </div>
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                    font-sans text-[11px] font-medium
                    bg-conf-high/10 text-conf-high border border-conf-high/20"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-conf-high" aria-hidden="true" />
                  Ready
                </span>
              </div>
            </Panel>

            {/* Workbench picker */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-0.5">
                <h2 className="font-sans text-sm font-semibold text-text-primary">
                  Send to Workbench
                </h2>
                <p className="font-sans text-xs text-text-muted">
                  Select a specialized intelligence engine to analyze this document.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {WORKBENCHES.map((bench) => (
                  <Card
                    key={bench.id}
                    variant="interactive"
                    noPadding
                    onClick={() => navigate(`${bench.route}?document_id=${currentDocumentId}`)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open ${bench.title}`}
                    onKeyDown={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`${bench.route}?document_id=${currentDocumentId}`);
                      }
                    }}
                    className="group p-5 flex flex-col gap-3"
                  >
                    <div
                      className={cn(
                        'w-9 h-9 rounded-lg border border-border flex items-center justify-center',
                        'transition-colors duration-150',
                        bench.accentClass,
                      )}
                    >
                      <span
                        className={cn('material-symbols-outlined text-[20px]', bench.iconClass)}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        aria-hidden="true"
                      >
                        {bench.icon}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="font-sans text-sm font-semibold text-text-primary">
                        {bench.title}
                      </span>
                      <span className="font-sans text-xs text-text-muted leading-relaxed">
                        {bench.description}
                      </span>
                    </div>

                    <span
                      className="material-symbols-outlined text-[14px] text-text-muted
                        ml-auto mt-auto opacity-0 group-hover:opacity-100 transition-all duration-150
                        group-hover:translate-x-0.5"
                      aria-hidden="true"
                    >
                      arrow_forward
                    </span>
                  </Card>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
