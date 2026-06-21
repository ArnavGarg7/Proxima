import { api } from './axios';

export interface AdminAnalyticsData {
  total_users: number;
  active_users: number;
  total_requests: number;
  total_cost: number;
  total_tokens: number;
  top_users: Array<{
    user_id: string;
    email: string;
    name: string;
    cost: number;
    requests: number;
  }>;
  cost_by_model: Array<{
    model_id: string;
    cost: number;
    requests: number;
  }>;
}

export const fetchAdminAnalyticsOverview = async (): Promise<AdminAnalyticsData> => {
  const response = await api.get('/api/admin/analytics/overview');
  return response.data.data;
};

// --- Users ---
export interface AdminUser {
  user_id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  is_active: boolean;
  created_at: string;
}

export const fetchAdminUsers = async (skip = 0, limit = 50, search = ''): Promise<{ total: number; items: AdminUser[] }> => {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  if (search) params.append('search', search);
  const response = await api.get(`/api/admin/users?${params.toString()}`);
  return response.data;
};

export const updateAdminUserRole = async (userId: string, role: string) => {
  const response = await api.patch(`/api/admin/users/${userId}/role`, { role });
  return response.data;
};

export const updateAdminUserStatus = async (userId: string, isActive: boolean) => {
  const response = await api.patch(`/api/admin/users/${userId}/deactivate`, { is_active: isActive });
  return response.data;
};

// --- Prompts ---
export interface AdminPrompt {
  version_id: string;
  prompt_key: string;
  content: string;
  version: number;
  is_active: boolean;
  created_at: string;
}

export const fetchAdminPrompts = async (skip = 0, limit = 50): Promise<{ total: number; items: AdminPrompt[] }> => {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  const response = await api.get(`/api/admin/prompts?${params.toString()}`);
  return response.data;
};

export const createAdminPrompt = async (data: { prompt_key: string; content: string; is_active: boolean }) => {
  const response = await api.post('/api/admin/prompts', data);
  return response.data;
};

export const activateAdminPrompt = async (versionId: string) => {
  const response = await api.patch(`/api/admin/prompts/${versionId}/activate`);
  return response.data;
};

// --- Knowledge ---
export interface AdminKnowledgeChunk {
  chunk_id: string;
  kb_name: string;
  title: string;
  chunk_index: number;
  token_count: number;
  source: string;
  created_at: string;
  embedded_at: string | null;
}

export const fetchAdminKnowledge = async (skip = 0, limit = 50): Promise<{ total: number; items: AdminKnowledgeChunk[] }> => {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  const response = await api.get(`/api/admin/knowledge?${params.toString()}`);
  return response.data;
};

export const syncAdminKnowledge = async (kbName: string, forceReindex = false) => {
  const response = await api.post('/api/admin/knowledge/sync', { kb_name: kbName, force_reindex: forceReindex });
  return response.data;
};

// --- Audit Logs ---
export interface AdminAuditLog {
  log_id: string;
  admin_user_id: string;
  action: string;
  target_resource: string;
  details: Record<string, unknown>;
  ip_address: string;
  created_at: string;
}

export const fetchAdminLogs = async (skip = 0, limit = 50): Promise<{ total: number; items: AdminAuditLog[] }> => {
  const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
  const response = await api.get(`/api/admin/logs?${params.toString()}`);
  return response.data;
};
