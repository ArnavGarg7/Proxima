
interface DashboardStatCardProps {
  label: string;
  value: string | number;
  icon: string;
  critical?: boolean;
}

export function DashboardStatCard({ label, value, icon, critical }: DashboardStatCardProps) {
  return (
    <div className="bg-surface border border-border rounded-lg p-5 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-full h-[2px] ${critical ? 'bg-status-critical' : 'bg-primary'}`}></div>
      <div className="flex justify-between items-start mb-4">
        <span className="font-label-sm text-label-sm text-text-secondary uppercase tracking-widest">{label}</span>
        <span className={`material-symbols-outlined ${critical ? 'text-status-critical' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>{icon}</span>
      </div>
      <div className="font-headline-xl text-[36px] font-bold text-text-primary mb-1">{value}</div>
    </div>
  );
}
