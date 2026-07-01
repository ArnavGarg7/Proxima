
interface CodeMetricCardProps {
  label: string;
  value: number | string;
  icon: string;
  color?: string;
}

export function CodeMetricCard({ label, value, icon, color = 'text-text-primary' }: CodeMetricCardProps) {
  return (
    <div className="bg-elevated border border-border rounded-xl p-4 shadow-card flex flex-col justify-between">
      <div className="flex justify-between items-start mb-2">
        <span className="font-sans text-xs font-bold text-text-muted uppercase tracking-wider">{label}</span>
        <span className={`material-symbols-outlined text-[18px] opacity-70 ${color}`}>{icon}</span>
      </div>
      <div className={`font-mono text-2xl font-bold ${color}`}>
        {value}
      </div>
    </div>
  );
}
