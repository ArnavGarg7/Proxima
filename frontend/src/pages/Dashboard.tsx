import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/axios';
import { DashboardSummary } from '@/types/dashboard';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { RecentRunCard } from '@/components/dashboard/RecentRunCard';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { SessionCard } from '@/components/dashboard/SessionCard';

export default function Dashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  useEffect(() => {

    const fetchDashboard = async (silent = false) => {
      try {
        const response = await api.get('/api/dashboard');
        setData(response.data);
        
        if (!silent) {
          const authResponse = await api.get('/api/users/me');
          if (authResponse.data && authResponse.data.name) {
            setUserName(authResponse.data.name.split(' ')[0]);
          }
        }
      } catch (err: unknown) {
        if (!silent) {
          const e = err as { message?: string };
          setError(e.message || 'Failed to load dashboard data');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchDashboard();
    
    // Make dashboard "alive" by polling every 10 seconds
    const intervalId = setInterval(() => fetchDashboard(true), 10000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-60px)]">
        <div className="w-8 h-8 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-status-critical text-5xl mb-4">error</span>
        <h2 className="text-headline-lg font-headline-lg text-text-primary mb-2">Failed to load Dashboard</h2>
        <p className="text-text-secondary">{error}</p>
      </div>
    );
  }

  const handleResume = (_id: string, analyzer: string) => {
    if (analyzer === 'clinical') navigate('/clinical');
    else if (analyzer === 'legal') navigate('/legal');
    else if (analyzer === 'compare') navigate('/compare');
    else if (analyzer === 'code') navigate('/code');
    else if (analyzer === 'audit') navigate('/audit');
    else if (analyzer === 'analyze') navigate('/analyze');
    else navigate('/workspace');
  };

  const distTotal = Object.values(data.analyzer_distribution || {}).reduce((acc, val) => acc + val, 0);
  const analyzersList = [
    { key: 'clinical', label: 'Clinical', color: 'bg-primary' },
    { key: 'legal', label: 'Legal', color: 'bg-blue-500' },
    { key: 'code', label: 'Code', color: 'bg-green-500' },
    { key: 'audit', label: 'Audit', color: 'bg-purple-500' },
    { key: 'compare', label: 'Compare', color: 'bg-gold-primary' },
    { key: 'domain_radar', label: 'Radar', color: 'bg-orange-500' },
    { key: 'analyze', label: 'Analyze', color: 'bg-indigo-500' },
    { key: 'workspace', label: 'Workspace', color: 'bg-gray-500' }
  ];

  return (
    <div className="flex-1 p-8 bg-void flex flex-col gap-8 max-w-[1400px] mx-auto w-full min-h-[calc(100vh-60px)] overflow-y-auto">
      {/* Section 1: Hero */}
      <header className="flex justify-between items-end">
        <div>
          <h1 className="font-display text-4xl text-text-primary mb-2">
            Welcome back{userName ? `, ${userName}` : ''}
          </h1>
          <p className="font-sans text-base text-text-secondary">
            {data.quick_stats.analyses_completed} analyses completed this week
          </p>
        </div>
      </header>

      {/* Section 2: Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <DashboardStatCard label="Documents" value={data.quick_stats.documents_uploaded} icon="description" />
        <DashboardStatCard label="Completed Analyses" value={data.quick_stats.analyses_completed} icon="done_all" />
        <DashboardStatCard label="Templates Used" value={data.quick_stats.templates_used} icon="view_quilt" />
        <DashboardStatCard label="Domains" value={data.quick_stats.domains_detected} icon="category" />
        <DashboardStatCard label="Avg. Confidence" value={`${data.quick_stats.average_confidence}%`} icon="analytics" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8">
        {/* Left Column */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Section 4: Recent Documents */}
          <div className="bg-elevated border border-border rounded-xl overflow-hidden flex flex-col shadow-sm">
            <div className="p-5 border-b border-border flex justify-between items-center">
              <h3 className="font-display text-xl text-text-primary">Recent Documents</h3>
            </div>
            <div className="overflow-x-auto">
              {data.recent_runs.length === 0 ? (
                <div className="p-8 text-center text-text-secondary flex flex-col items-center gap-2">
                  <span className="material-symbols-outlined text-4xl text-text-muted">description</span>
                  <div>No analyses yet. Run your first document from Workspace or Templates.</div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface border-b border-border">
                      <th className="p-4 font-sans text-xs text-text-muted uppercase tracking-wider">Document Name</th>
                      <th className="p-4 font-sans text-xs text-text-muted uppercase tracking-wider">Analyzer</th>
                      <th className="p-4 font-sans text-xs text-text-muted uppercase tracking-wider">Status</th>
                      <th className="p-4 font-sans text-xs text-text-muted uppercase tracking-wider">Confidence</th>
                      <th className="p-4 font-sans text-xs text-text-muted uppercase tracking-wider">Date</th>
                      <th className="p-4 font-sans text-xs text-text-muted uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="font-sans text-sm">
                    {data.recent_runs.map((run) => (
                      <RecentRunCard key={run.id} run={run} onClick={handleResume} />
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
          
          {/* Section 7: Analyzer Distribution */}
          <div className="bg-elevated border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-display text-xl text-text-primary mb-4">Analyzer Distribution</h3>
            {distTotal === 0 ? (
              <div className="text-sm text-text-secondary">No distribution data available yet.</div>
            ) : (
              <>
                <div className="flex gap-1 h-6 rounded-full overflow-hidden w-full mb-4">
                  {analyzersList.map(a => {
                    const count = data.analyzer_distribution[a.key] || 0;
                    if (count === 0) return null;
                    const pct = (count / distTotal) * 100;
                    return (
                      <div key={a.key} className={`${a.color} h-full`} style={{ width: `${pct}%` }} title={`${a.label} (${count})`}></div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 text-xs font-sans text-text-secondary">
                  {analyzersList.map(a => {
                    const count = data.analyzer_distribution[a.key] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={a.key} className="flex justify-between items-center bg-surface p-2 rounded border border-border">
                        <div className="flex items-center gap-2">
                          <div className={`w-2.5 h-2.5 rounded-full ${a.color}`}></div> 
                          {a.label}
                        </div>
                        <span className="font-mono font-bold text-text-primary">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-8">
          {/* Section 5: Active Sessions */}
          <div className="flex flex-col gap-3">
            <h3 className="font-display text-xl text-text-primary mb-1">Active Sessions</h3>
            {data.active_sessions.length === 0 ? (
              <div className="p-4 bg-surface border border-border rounded-lg text-text-secondary text-sm flex flex-col items-center gap-2 text-center">
                <span className="material-symbols-outlined text-3xl text-text-muted">pending_actions</span>
                <div>No active sessions. Your in-progress work will appear here.</div>
              </div>
            ) : (
              data.active_sessions.map(session => (
                <SessionCard key={session.id} session={session} onResume={handleResume} />
              ))
            )}
          </div>

          {/* Section 3: Recent Activity Timeline */}
          <div className="bg-elevated border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-display text-xl text-text-primary mb-4">Recent Activity</h3>
            <ActivityTimeline runs={data.recent_runs} />
          </div>

          {/* Section 6: Template Usage */}
          <div className="bg-elevated border border-border rounded-xl p-5 shadow-sm">
            <h3 className="font-display text-xl text-text-primary mb-4">Template Usage</h3>
            {data.template_usage.length === 0 ? (
              <div className="text-text-secondary text-sm p-4 bg-surface rounded-lg border border-border text-center">
                No templates used yet. Run workflows from Templates to see your usage here.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {data.template_usage.map(t => (
                  <div key={t.template_name} className="flex justify-between items-center text-sm p-2 bg-surface rounded border border-border">
                    <span className="text-text-secondary font-medium">{t.template_name}</span>
                    <span className="font-mono font-bold text-primary">{t.usage_count}×</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
