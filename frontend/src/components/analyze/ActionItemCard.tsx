import { useState } from 'react';
import { ActionItem } from '@/types/analyze';

interface ActionItemCardProps {
  action: ActionItem;
}

export function ActionItemCard({ action }: ActionItemCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-sm flex flex-col gap-2">
      <div className="flex gap-3 items-start">
        <span className="material-symbols-outlined text-gold-primary mt-0.5">task_alt</span>
        <div className="flex flex-col gap-1 w-full">
          <p className="text-sm text-text-primary leading-relaxed">{action.action}</p>
          
          <div className="flex justify-between items-center mt-1">
            {action.assignee ? (
              <span className="text-xs bg-elevated border border-border rounded px-2 py-0.5 text-text-secondary flex items-center gap-1 w-fit">
                <span className="material-symbols-outlined text-[12px]">person</span>
                {action.assignee}
              </span>
            ) : (
              <div></div> // spacer
            )}
            
            {action.evidence && action.evidence.length > 0 && (
              <button
                onClick={() => setShowEvidence(!showEvidence)}
                className="text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:text-gold-primary transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[14px]">
                  {showEvidence ? 'expand_less' : 'expand_more'}
                </span>
                {showEvidence ? 'Hide Evidence' : 'View Evidence'}
              </button>
            )}
          </div>

          {showEvidence && action.evidence && action.evidence.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {action.evidence.map((ev, idx) => (
                <div key={idx} className="bg-elevated p-2 rounded border border-border relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold-primary/50 rounded-l"></div>
                  <p className="text-[11px] text-text-secondary italic font-serif">"{ev.quote}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
