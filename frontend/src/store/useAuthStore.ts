import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/axios';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      isLoading: false,
      user: null,

      login: (user: AuthUser) => set({ isAuthenticated: true, user, isLoading: false }),

      logout: () => {
        // Call backend to clear cookies, then update local state
        api.post('/api/auth/logout').catch(() => {});
        set({ isAuthenticated: false, user: null, isLoading: false });
      },

      hydrate: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get<AuthUser>('/api/users/me');
          set({ isAuthenticated: true, user: res.data, isLoading: false });
        } catch {
          // Not authenticated — clear any stale persisted state
          set({ isAuthenticated: false, user: null, isLoading: false });
        }
      },
    }),
    {
      name: 'proxima-auth',
      // Only persist the user profile — isAuthenticated is derived from /api/users/me on load
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
