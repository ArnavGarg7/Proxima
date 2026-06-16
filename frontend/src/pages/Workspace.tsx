import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useRef } from 'react';
import { api } from '@/lib/axios';

export default function Workspace() {
  const { content, setContent, isStreaming, setStreaming } = useWorkspaceStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Stub for Stage 1: simulate file parsing
      setContent(`[File Uploaded: ${file.name}]\n` + content);
    }
  };

  const handleComplete = async () => {
    setStreaming(true);
    try {
      // Stage 1 stub: simulate streaming from intelligence router
      await api.post('/api/intelligence/complete', { text: content }, { responseType: 'stream' });
      // In a real implementation we would read the stream chunk by chunk
      setContent(content + '\n[... streaming response ...]');
    } catch (err) {
      console.error(err);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-4">
      <div className="panel-header flex justify-between items-center">
        <span>Active Document</span>
        <div className="flex space-x-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".txt,.pdf,.docx" 
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn-secondary">
            Upload File
          </button>
          <button onClick={handleComplete} disabled={isStreaming} className="btn-primary">
            {isStreaming ? 'Completing...' : 'AI Complete'}
          </button>
        </div>
      </div>
      <textarea
        className="input-base flex-1 resize-none font-mono text-sm leading-relaxed"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Type or paste document content here..."
        spellCheck={false}
      />
    </div>
  );
}
