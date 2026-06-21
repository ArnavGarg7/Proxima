import { useQuery } from '@tanstack/react-query';
import { fetchAdminAnalyticsOverview, AdminAnalyticsData } from '@/lib/adminApi';

export const useAdminAnalytics = () => {
  return useQuery<AdminAnalyticsData>({
    queryKey: ['admin_analytics_overview'],
    queryFn: fetchAdminAnalyticsOverview,
  });
};
