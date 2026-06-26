import React from 'react';
import { NamedEntity } from '@/types/analyze';

interface EntityCardProps {
  entity: NamedEntity;
}

export function EntityCard({ entity }: EntityCardProps) {
  // Get icon/color based on entity type
  let icon = 'label';
  let colorClass = 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  
  const type = entity.entity_type.toLowerCase();
  if (type.includes('person')) {
    icon = 'person';
    colorClass = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
  } else if (type.includes('org') || type.includes('company')) {
    icon = 'domain';
    colorClass = 'text-purple-400 bg-purple-500/10 border-purple-500/20';
  } else if (type.includes('loc') || type.includes('place')) {
    icon = 'location_on';
    colorClass = 'text-green-400 bg-green-500/10 border-green-500/20';
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-3 shadow-sm flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <span className="font-display font-semibold text-text-primary text-sm">{entity.name}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border flex items-center gap-1 ${colorClass}`}>
          <span className="material-symbols-outlined text-[12px]">{icon}</span>
          {entity.entity_type}
        </span>
      </div>
      <p className="text-xs text-text-secondary line-clamp-2">{entity.context}</p>
    </div>
  );
}
