import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useRef, useState, useEffect } from 'react';
import { api } from '@/lib/axios';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import TemplateBanner from '@/components/templates/TemplateBanner';
import { loadTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';

export default function Workspace() {
  const { 
    currentDocumentId, setCurrentDocumentId, 
  } = useWorkspaceStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeFilename, setActiveFilename] = useState<string | null>(null);
  const [templateContext, setTemplateContext] = useState<TemplateLaunchContext | null>(null);

  useEffect(() => {
    const docId = searchParams.get('document_id');
    if (docId && docId !== currentDocumentId) {
      const fetchDocument = async () => {
        try {
          const res = await api.get(`/api/documents/${docId}`);
          handleNewDocument(docId, res.data.filename || res.data.title || `Document ${docId}`);
        } catch (err: unknown) {
          setError(`Failed to load document: ${docId}. It may not exist or you don't have access.`);
        }
      };
      fetchDocument();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // Hydrate template launch context
  useEffect(() => {
    const ctx: TemplateLaunchContext | null = location.state?.templateContext ?? loadTemplateLaunchContext();
    if (ctx) {
      setTemplateContext(ctx);
      // Preselect the document if provided
      if (ctx.document_id) {
        setCurrentDocumentId(ctx.document_id);
        setActiveFilename(ctx.document_name || ctx.document_id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const handleNewDocument = (docId: string, filename: string) => {
    setCurrentDocumentId(docId);
    setActiveFilename(filename);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/api/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
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

  return (
    <div className="flex-1 flex flex-col p-8 bg-void h-full overflow-hidden">
      
      {/* Hidden File Input */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".txt,.pdf,.docx" 
      />

      {/* Error Toast */}
      {error && (
        <div className="mb-6 bg-conf-critical/10 border border-conf-critical/20 p-4 rounded-lg text-conf-critical flex items-start gap-3 shadow-sm flex-shrink-0 max-w-4xl mx-auto w-full">
          <span className="material-symbols-outlined mt-0.5">error</span>
          <div className="flex flex-col">
            <span className="font-sans font-semibold text-sm">Error</span>
            <span className="font-sans text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Template Banner */}
      {templateContext && (
        <div className="mb-6 flex-shrink-0 max-w-4xl mx-auto w-full">
          <TemplateBanner context={templateContext} onClear={() => setTemplateContext(null)} />
        </div>
      )}

      {!currentDocumentId ? (
        /* State A: Empty Workspace */
        <div className="flex-1 flex items-center justify-center">
          <div className="max-w-xl w-full bg-surface border border-border rounded-xl p-10 flex flex-col items-center text-center shadow-lg">
            <div className="w-16 h-16 bg-gold-primary/10 rounded-full flex items-center justify-center mb-6 border border-gold-primary/20">
              <span className="material-symbols-outlined text-gold-primary text-3xl">upload_file</span>
            </div>
            <h1 className="font-display text-3xl text-text-primary mb-3">Workspace</h1>
            <p className="font-sans text-text-secondary mb-8 leading-relaxed">
              Upload a document to add it to your workspace. Once uploaded, you can route it to a specialized intelligence workbench for analysis.
            </p>

            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading} 
              className="h-12 bg-gold-primary text-void px-8 rounded-lg font-sans text-sm font-medium hover:bg-gold-primary/90 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm w-full max-w-sm justify-center"
            >
              {isUploading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">upload</span>}
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      ) : (
        /* State B: Active Document Loaded */
        <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full mt-10">
          
          <h2 className="font-display text-2xl text-text-primary">Document Ready</h2>
          
          {/* Section 1: Active Document Header */}
          <div className="bg-surface border border-border rounded-xl p-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-elevated rounded flex items-center justify-center border border-border">
                <span className="material-symbols-outlined text-text-secondary text-2xl">description</span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-xl text-text-primary mb-1">{activeFilename || currentDocumentId}</span>
                <span className="font-sans text-xs uppercase tracking-wider text-text-muted">Currently Active in Workspace</span>
              </div>
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={isUploading}
              className="text-text-secondary hover:text-text-primary flex items-center gap-2 text-sm transition-colors border border-border px-4 py-2 rounded-md hover:bg-elevated"
            >
              <span className="material-symbols-outlined text-[18px]">swap_horiz</span>
              {isUploading ? 'Uploading...' : 'Swap Document'}
            </button>
          </div>

          <h3 className="font-display text-lg text-text-primary mt-4">Open in Workbench</h3>
          <p className="text-sm text-text-secondary -mt-3 mb-2">Select a specialized intelligence engine to analyze this document.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              onClick={() => navigate(`/analyze?document_id=${currentDocumentId}`)}
              className="bg-surface hover:bg-elevated border border-border rounded-xl p-6 text-left transition-colors flex flex-col gap-2 group"
            >
              <span className="material-symbols-outlined text-indigo-500 text-3xl group-hover:scale-110 transition-transform">hub</span>
              <h4 className="font-display text-lg text-text-primary">General Analyze</h4>
              <p className="text-sm text-text-secondary">Extract key takeaways, topics, entities, metrics, and action items across general domains.</p>
            </button>

            <button 
              onClick={() => navigate(`/clinical?document_id=${currentDocumentId}`)}
              className="bg-surface hover:bg-elevated border border-border rounded-xl p-6 text-left transition-colors flex flex-col gap-2 group"
            >
              <span className="material-symbols-outlined text-primary text-3xl group-hover:scale-110 transition-transform">medical_services</span>
              <h4 className="font-display text-lg text-text-primary">Clinical Intelligence</h4>
              <p className="text-sm text-text-secondary">Analyze clinical trials, patient history, and medical literature with specialized extraction.</p>
            </button>

            <button 
              onClick={() => navigate(`/legal?document_id=${currentDocumentId}`)}
              className="bg-surface hover:bg-elevated border border-border rounded-xl p-6 text-left transition-colors flex flex-col gap-2 group"
            >
              <span className="material-symbols-outlined text-blue-500 text-3xl group-hover:scale-110 transition-transform">gavel</span>
              <h4 className="font-display text-lg text-text-primary">Legal & Contract</h4>
              <p className="text-sm text-text-secondary">Analyze contracts for risks, obligations, governing law, and payment terms.</p>
            </button>
            
            <button 
              onClick={() => navigate(`/audit?document_id=${currentDocumentId}`)}
              className="bg-surface hover:bg-elevated border border-border rounded-xl p-6 text-left transition-colors flex flex-col gap-2 group"
            >
              <span className="material-symbols-outlined text-purple-500 text-3xl group-hover:scale-110 transition-transform">verified</span>
              <h4 className="font-display text-lg text-text-primary">Confidence Audit</h4>
              <p className="text-sm text-text-secondary">Run a deterministic pass to evaluate hallucination risk and document quality.</p>
            </button>
          </div>
          
        </div>
      )}
    </div>
  );
}
