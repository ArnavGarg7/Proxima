import { create } from 'zustand';

interface WorkspaceState {
  currentDocumentId: string | null;
  content: string;
  isStreaming: boolean;
  domain: string | null;
  setContent: (content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setDomain: (domain: string | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentDocumentId: null,
  content: '',
  isStreaming: false,
  domain: null,
  setContent: (content) => set({ content }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setDomain: (domain) => set({ domain }),
}));
