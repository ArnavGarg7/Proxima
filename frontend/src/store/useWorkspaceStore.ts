import { create } from 'zustand';

interface WorkspaceState {
  currentDocumentId: string | null;
  content: string;
  isStreaming: boolean;
  domain: string | null;
  qheMetrics: any | null;
  setCurrentDocumentId: (id: string | null) => void;
  setContent: (content: string) => void;
  setStreaming: (isStreaming: boolean) => void;
  setDomain: (domain: string | null) => void;
  setQheMetrics: (metrics: any | null) => void;
  aiResponse: string;
  setAiResponse: (response: string) => void;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentDocumentId: null,
  content: '',
  aiResponse: '',
  isStreaming: false,
  domain: null,
  qheMetrics: null,
  setCurrentDocumentId: (id) => set({ currentDocumentId: id }),
  setContent: (content) => set({ content }),
  setAiResponse: (aiResponse) => set({ aiResponse }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setDomain: (domain) => set({ domain }),
  setQheMetrics: (metrics) => set({ qheMetrics: metrics }),
}));
