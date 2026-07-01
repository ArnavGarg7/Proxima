import { Badge } from '@/components/ui/Badge';
import type { BadgeVariant } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';
import { RecentRun } from '@/types/dashboard';

interface RecentRunCardProps {
  run: RecentRun;
  onClick: (id: string, analyzer: string) => void;
}

function statusVariant(status: string): BadgeVariant {
  if (status === 'completed') return 'success';
  if (status === 'error' || status === 'failed') return 'error';
  return 'warning';
}

function confidenceColor(conf: number): string {
  if (conf >= 90) return 'text-conf-high';
  if (conf >= 70) return 'text-conf-amber';
  return 'text-conf-critical';
}

export function RecentRunCard({ run, onClick }: RecentRunCardProps) {
  return (
    <tr
      onClick={() => onClick(run.id, run.analyzer)}
      className="border-b border-border hover:bg-elevated transition-colors duration-100 cursor-pointer group"
    >
      {/* Document name */}
      <td className="px-5 py-3.5 text-sm text-text-primary font-medium">
        <div className="flex items-center gap-2.5">
          <span
            className="material-symbols-outlined text-base text-text-muted group-hover:text-gold-primary transition-colors duration-100"
            aria-hidden="true"
          >
            description
          </span>
          <span className="truncate max-w-[220px]">{run.document_name}</span>
        </div>
        {run.template && (
          <div className="flex items-center gap-1 mt-1 ml-[26px] text-xs text-text-muted">
            <span className="material-symbols-outlined text-[12px]" aria-hidden="true">view_quilt</span>
            {run.template}
          </div>
        )}
      </td>

      {/* Analyzer */}
      <td className="px-5 py-3.5 text-sm text-text-secondary capitalize">
        {run.analyzer.replace('_', ' ')}
      </td>

      {/* Status */}
      <td className="px-5 py-3.5">
        <Badge variant={statusVariant(run.status)} size="sm">
          {run.status}
        </Badge>
      </td>

      {/* Confidence */}
      <td className="px-5 py-3.5">
        {run.confidence !== null ? (
          <span className={cn('font-mono text-sm', confidenceColor(run.confidence))}>
            {run.confidence}%
          </span>
        ) : (
          <span className="text-text-muted text-sm">—</span>
        )}
      </td>

      {/* Date */}
      <td className="px-5 py-3.5 text-sm text-text-muted">
        {new Date(run.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
      </td>

      {/* Action — revealed on hover */}
      <td className="px-5 py-3.5 text-right">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150">
          Open
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">arrow_forward</span>
        </span>
      </td>
    </tr>
  );
}
