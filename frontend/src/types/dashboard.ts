export interface RecentRun {
  id: string;
  document_name: string;
  analyzer: string;
  status: string;
  created_at: string;
  confidence: number | null;
  domain: string | null;
  template: string | null;
  duration_ms: number | null;
}

export interface QuickStats {
  documents_uploaded: number;
  analyses_completed: number;
  templates_used: number;
  domains_detected: number;
  average_confidence: number;
}

export interface TemplateUsageStats {
  template_name: string;
  usage_count: number;
}

export interface DashboardSummary {
  total_documents: number;
  recent_runs: RecentRun[];
  active_sessions: RecentRun[];
  template_usage: TemplateUsageStats[];
  quick_stats: QuickStats;
  analyzer_distribution: Record<string, number>;
}
