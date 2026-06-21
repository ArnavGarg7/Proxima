import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAdminKnowledge, syncAdminKnowledge } from '@/lib/adminApi';

export const useAdminKnowledge = (skip = 0, limit = 50) => {
  return useQuery({
    queryKey: ['admin_knowledge', skip, limit],
    queryFn: () => fetchAdminKnowledge(skip, limit),
  });
};

export const useSyncKnowledge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ kbName, forceReindex }: { kbName: string; forceReindex: boolean }) => syncAdminKnowledge(kbName, forceReindex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_knowledge'] });
    },
  });
};
