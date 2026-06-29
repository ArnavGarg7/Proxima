import { RecentRun } from '@/types/dashboard';
import { Badge } from '@/components/ui/Badge';

interface SessionCardProps {
  session: RecentRun;
  onResume: (id: string, analyzer: string) => void;
}

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60)          return `${seconds}s ago`;
  if (seconds < 3600)        return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)       return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 2)   return 'Yesterday';
  if (seconds < 86400 * 30)  return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

const ANALYZER_ICONS: Record<string, string> = {
  clinical:     'medical_services',
  legal:        'gavel',
  code:         'terminal',
  audit:        'fact_check',
  compare:      'difference',
  analyze:      'analytics',
  domain_radar: 'radar',
};

export function SessionCard({ session, onResume }: SessionCardProps) {
  const icon = ANALYZER_ICONS[session.analyzer] ?? 'analytics';

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onResume(session.id, session.analyzer)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onResume(session.id, session.analyzer); }}
      className="flex items-center justify-between gap-4 p-4 bg-surface border border-border rounded-lg
        hover:border-gold-primary/50 hover:bg-elevated
        transition-all duration-150 cursor-pointer group
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50"
    >
      <div className="flex items-center gap-3 min-w-0">
        {/* Analyzer icon */}
        <div className="w-9 h-9 shrink-0 rounded-lg bg-elevated border border-border flex items-center justify-center group-hover:border-gold-primary/30 transition-colors duration-150">
          <span
            className="material-symbols-outlined text-base text-gold-primary"
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {icon}
          </span>
        </div>

        {/* Label + time */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-sans text-sm font-semibold text-text-primary capitalize">
              {session.analyzer.replace('_', ' ')}
            </span>
            <Badge variant="warning" size="sm">In progress</Badge>
          </div>
          <div className="font-sans text-xs text-text-muted mt-0.5">
            Last active {timeAgo(session.created_at)}
          </div>
        </div>
      </div>

      {/* Resume — revealed on hover */}
      <span className="shrink-0 inline-flex items-center gap-1 text-xs font-medium text-gold-primary opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        Resume
        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">play_arrow</span>
      </span>
    </div>
  );
}
