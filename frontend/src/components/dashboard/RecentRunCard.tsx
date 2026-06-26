import React from 'react';
import { RecentRun } from '@/types/dashboard';

interface RecentRunCardProps {
  run: RecentRun;
  onClick: (id: string, analyzer: string) => void;
}

export function RecentRunCard({ run, onClick }: RecentRunCardProps) {
  return (
    <tr 
      onClick={() => onClick(run.id, run.analyzer)}
      className="border-b border-border hover:bg-surface-container-lowest transition-colors cursor-pointer group"
    >
      <td className="p-4 text-text-primary font-medium flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-text-secondary group-hover:text-primary">description</span>
          {run.document_name}
        </div>
        {run.template && (
          <span className="text-xs text-text-muted ml-8 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">view_quilt</span> {run.template}
          </span>
        )}
      </td>
      <td className="p-4 text-text-secondary capitalize font-medium">
        {run.analyzer.replace('_', ' ')}
      </td>
      <td className="p-4">
        <span className={`inline-flex px-2 py-1 rounded font-label-sm text-label-sm ${
          run.status === 'completed' ? 'bg-status-high/15 text-status-high' :
          run.status === 'error' || run.status === 'failed' ? 'bg-status-critical/15 text-status-critical' :
          'bg-status-amber/15 text-status-amber'
        }`}>
          {run.status}
        </span>
      </td>
      <td className="p-4">
        {run.confidence !== null ? (
          <span className={`font-mono ${run.confidence >= 90 ? 'text-conf-high' : run.confidence >= 70 ? 'text-conf-amber' : 'text-conf-critical'}`}>
            {run.confidence}%
          </span>
        ) : (
          <span className="text-text-muted">-</span>
        )}
      </td>
      <td className="p-4 text-text-secondary text-sm">
        {new Date(run.created_at).toLocaleDateString()}
      </td>
      <td className="p-4 text-primary font-medium text-sm text-right opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-end gap-1">
        Open <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </td>
    </tr>
  );
}
