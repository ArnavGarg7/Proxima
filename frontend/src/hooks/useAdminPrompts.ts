import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminPrompts, createAdminPrompt, activateAdminPrompt } from '@/lib/adminApi';

export const useAdminPrompts = (skip = 0, limit = 50) => {
  return useQuery({
    queryKey: ['admin_prompts', skip, limit],
    queryFn: () => fetchAdminPrompts(skip, limit),
  });
};

export const useCreatePrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { prompt_key: string; content: string; is_active: boolean }) => createAdminPrompt(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_prompts'] });
    },
  });
};

export const useActivatePrompt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => activateAdminPrompt(versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_prompts'] });
    },
  });
};
