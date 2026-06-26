import React from 'react';
import { RecentRun } from '@/types/dashboard';

interface ActivityTimelineProps {
  runs: RecentRun[];
}

function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 2) return Math.floor(interval) + " days ago";
  if (interval >= 1) return "Yesterday";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " min ago";
  return Math.floor(seconds) + " seconds ago";
}

export function ActivityTimeline({ runs }: ActivityTimelineProps) {
  if (runs.length === 0) {
    return <div className="text-text-secondary text-sm">No recent activity.</div>;
  }

  // Group by "Today", "Yesterday", "Older"
  const grouped = runs.reduce((acc, run) => {
    const ago = timeAgo(run.created_at);
    let category = "Older";
    if (ago.includes("seconds") || ago.includes("min") || ago.includes("hours")) {
      category = "Today";
    } else if (ago === "Yesterday") {
      category = "Yesterday";
    }
    if (!acc[category]) acc[category] = [];
    acc[category].push({ ...run, agoText: ago });
    return acc;
  }, {} as Record<string, any[]>);

  const renderGroup = (title: string, groupRuns: any[]) => {
    if (!groupRuns || groupRuns.length === 0) return null;
    return (
      <div key={title} className="mb-6 last:mb-0">
        <h4 className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider mb-3">{title}</h4>
        <div className="flex flex-col gap-4 relative">
          <div className="absolute left-[7px] top-2 bottom-0 w-[2px] bg-border z-0"></div>
          {groupRuns.map((run, i) => (
            <div key={run.id} className="flex items-start gap-4 relative z-10">
              <div className="w-4 h-4 rounded-full bg-surface border-2 border-primary mt-1 shrink-0 z-10" />
              <div className="flex-1 bg-surface border border-border p-3 rounded-lg shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-sans font-medium text-text-primary capitalize">{run.analyzer.replace('_', ' ')} Analysis</span>
                  <span className="text-xs text-text-muted">{run.agoText}</span>
                </div>
                {run.template && (
                  <div className="text-sm text-text-secondary">{run.template}</div>
                )}
                {!run.template && run.document_name && (
                  <div className="text-sm text-text-secondary truncate">{run.document_name}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {renderGroup("Today", grouped["Today"])}
      {renderGroup("Yesterday", grouped["Yesterday"])}
      {renderGroup("Older", grouped["Older"])}
    </div>
  );
}
