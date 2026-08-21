import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/axios';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface Job {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | string;
  error_message?: string | null;
  result?: unknown;
}

async function fetchJob(id: string): Promise<Job> {
  const res = await api.get(`/api/jobs/${id}`);
  return res.data;
}

const STATUS: Record<string, { label: string; variant: 'default' | 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pending', variant: 'default' },
  running: { label: 'Running', variant: 'warning' },
  completed: { label: 'Completed', variant: 'success' },
  failed: { label: 'Failed', variant: 'error' },
};

interface JobStatusProps {
  jobId: string;
}

/**
 * JobStatus — thin surface for a durable analysis BackgroundJob. Polls
 * GET /api/jobs/{id} every 2s while pending/running and stops when terminal.
 */
export function JobStatus({ jobId }: JobStatusProps) {
  const { data, error } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => fetchJob(jobId),
    refetchInterval: (query) => {
      const s = (query.state.data as Job | undefined)?.status;
      return s === 'completed' || s === 'failed' ? false : 2000;
    },
  });

  if (error) {
    return <span className="font-sans text-xs text-conf-critical">Could not load job status.</span>;
  }
  if (!data) {
    return (
      <span className="inline-flex items-center gap-2 font-sans text-xs text-text-muted">
        <Spinner size="xs" /> Starting…
      </span>
    );
  }

  const s = STATUS[data.status] ?? { label: data.status, variant: 'default' as const };
  const active = data.status === 'pending' || data.status === 'running';

  return (
    <div className="flex items-center gap-2">
      {active && <Spinner size="xs" />}
      <Badge variant={s.variant} size="sm">{s.label}</Badge>
      {data.status === 'failed' && data.error_message && (
        <span className="truncate font-sans text-xs text-text-muted" title={data.error_message}>
          {data.error_message}
        </span>
      )}
    </div>
  );
}
