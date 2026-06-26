import { RecentRun } from '@/types/dashboard';

interface SessionCardProps {
  session: RecentRun;
  onResume: (id: string, analyzer: string) => void;
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

export function SessionCard({ session, onResume }: SessionCardProps) {
  return (
    <div className="p-4 bg-surface border border-border rounded-lg flex justify-between items-center group hover:border-primary transition-colors cursor-pointer" onClick={() => onResume(session.id, session.analyzer)}>
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-lg bg-elevated border border-border flex items-center justify-center">
          <span className="material-symbols-outlined text-primary text-xl">
            {session.analyzer === 'clinical' ? 'medical_services' : 
             session.analyzer === 'legal' ? 'gavel' :
             session.analyzer === 'code' ? 'terminal' :
             session.analyzer === 'audit' ? 'fact_check' :
             session.analyzer === 'compare' ? 'difference' : 'analytics'}
          </span>
        </div>
        <div>
          <div className="font-sans font-bold text-text-primary capitalize flex items-center gap-2">
            {session.analyzer.replace('_', ' ')}
            <span className="bg-status-amber/15 text-status-amber text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded font-bold">Open</span>
          </div>
          <div className="text-xs text-text-muted mt-1">Last active {timeAgo(session.created_at)}</div>
        </div>
      </div>
      <div className="text-primary font-sans text-sm font-bold flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        Resume <span className="material-symbols-outlined text-[16px]">play_arrow</span>
      </div>
    </div>
  );
}
