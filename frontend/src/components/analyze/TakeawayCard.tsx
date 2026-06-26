import React, { useState } from 'react';
import { Takeaway, Evidence } from '@/types/analyze';

interface TakeawayCardProps {
  takeaway: Takeaway;
}

export function TakeawayCard({ takeaway }: TakeawayCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-sm flex flex-col gap-3">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <span className="material-symbols-outlined text-gold-primary mt-0.5">check_circle</span>
          <p className="text-sm text-text-primary leading-relaxed">{takeaway.point}</p>
        </div>
      </div>
      
      {takeaway.evidence && takeaway.evidence.length > 0 && (
        <div className="pl-9">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs text-text-muted hover:text-gold-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {showEvidence ? 'expand_less' : 'expand_more'}
            </span>
            {showEvidence ? 'Hide Evidence' : 'View Evidence'}
          </button>
          
          {showEvidence && (
            <div className="mt-3 flex flex-col gap-2">
              {takeaway.evidence.map((ev, idx) => (
                <div key={idx} className="bg-elevated p-3 rounded-md border border-border relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold-primary/50 rounded-l-md"></div>
                  <p className="text-xs text-text-secondary italic font-serif">"{ev.quote}"</p>
                  {ev.context && <p className="text-xs text-text-muted mt-2 font-sans">{ev.context}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
