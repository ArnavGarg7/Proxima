import { useQuery } from '@tanstack/react-query';
import { fetchAdminLogs } from '@/lib/adminApi';

export const useAdminLogs = (skip = 0, limit = 50) => {
  return useQuery({
    queryKey: ['admin_logs', skip, limit],
    queryFn: () => fetchAdminLogs(skip, limit),
  });
};
