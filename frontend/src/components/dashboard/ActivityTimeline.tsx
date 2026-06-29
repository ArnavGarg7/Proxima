import { RecentRun } from '@/types/dashboard';
import { FadeUp } from '@/components/motion';

interface ActivityTimelineProps {
  runs: RecentRun[];
}

type TimedRun = RecentRun & { agoText: string };

function timeAgo(dateString: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
  if (seconds < 60)         return `${seconds}s ago`;
  if (seconds < 3600)       return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400)      return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 86400 * 2)  return 'Yesterday';
  if (seconds < 86400 * 30) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 2592000)}mo ago`;
}

function groupCategory(agoText: string): string {
  if (agoText === 'Yesterday') return 'Yesterday';
  if (
    agoText.endsWith('s ago') ||
    agoText.endsWith('m ago') ||
    agoText.endsWith('h ago')
  ) return 'Today';
  return 'Older';
}

const GROUP_ORDER = ['Today', 'Yesterday', 'Older'] as const;

interface GroupSectionProps {
  title: string;
  runs: TimedRun[];
  index?: number;
}

function GroupSection({ title, runs, index = 0 }: GroupSectionProps) {
  if (runs.length === 0) return null;

  return (
    <FadeUp index={index} className="flex flex-col gap-1">
      <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted mb-2">
        {title}
      </span>

      <div className="relative flex flex-col gap-3">
        {/* Vertical timeline rail */}
        <div className="absolute left-[7px] top-1.5 bottom-1.5 w-px bg-border" aria-hidden="true" />

        {runs.map((run) => (
          <div key={run.id} className="flex items-start gap-3 relative">
            {/* Timeline dot */}
            <div className="w-3.5 h-3.5 shrink-0 rounded-full border-2 border-gold-primary bg-surface mt-0.5 z-10" />

            {/* Content */}
            <div className="flex-1 min-w-0 pb-0.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-sans text-sm font-medium text-text-primary capitalize leading-snug">
                  {run.analyzer.replace('_', ' ')} analysis
                </span>
                <span className="font-sans text-[11px] text-text-muted shrink-0 tabular-nums">
                  {run.agoText}
                </span>
              </div>
              {(run.template ?? run.document_name) && (
                <p className="font-sans text-xs text-text-muted mt-0.5 truncate">
                  {run.template ?? run.document_name}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </FadeUp>
  );
}

export function ActivityTimeline({ runs }: ActivityTimelineProps) {
  if (runs.length === 0) {
    return (
      <p className="font-sans text-sm text-text-muted text-center py-4">
        No activity yet.
      </p>
    );
  }

  const grouped = runs.reduce<Record<string, TimedRun[]>>((acc, run) => {
    const agoText = timeAgo(run.created_at);
    const cat = groupCategory(agoText);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...run, agoText });
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      {GROUP_ORDER.map((label, i) =>
        grouped[label] ? (
          <GroupSection key={label} title={label} runs={grouped[label]} index={i} />
        ) : null,
      )}
    </div>
  );
}
