import { useState } from 'react';
import { Topic } from '@/types/analyze';

interface TopicCardProps {
  topic: Topic;
}

export function TopicCard({ topic }: TopicCardProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  return (
    <div className="bg-surface border border-border rounded-lg p-4 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <h4 className="font-display font-semibold text-text-primary text-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-gold-primary"></span>
          {topic.name}
        </h4>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed pl-4">{topic.description}</p>
      
      {topic.evidence && topic.evidence.length > 0 && (
        <div className="pl-4 mt-1">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-[11px] font-semibold uppercase tracking-wider text-text-muted hover:text-gold-primary transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {showEvidence ? 'expand_less' : 'expand_more'}
            </span>
            {showEvidence ? 'Hide Evidence' : 'View Evidence'}
          </button>
          
          {showEvidence && (
            <div className="mt-2 flex flex-col gap-2">
              {topic.evidence.map((ev, idx) => (
                <div key={idx} className="bg-elevated p-2 rounded border border-border relative">
                  <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold-primary/50 rounded-l"></div>
                  <p className="text-[11px] text-text-secondary italic font-serif">"{ev.quote}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
