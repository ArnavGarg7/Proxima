import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api } from '@/lib/axios';
import { useAuthStore } from '@/store/useAuthStore';
import { DashboardSummary } from '@/types/dashboard';
import { duration } from '@/theme/motion';
import { DashboardStatCard } from '@/components/dashboard/DashboardStatCard';
import { ConfidenceCard } from '@/components/dashboard/ConfidenceCard';
import { RecentRunCard } from '@/components/dashboard/RecentRunCard';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { SessionCard } from '@/components/dashboard/SessionCard';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import { Panel } from '@/components/ui/Panel';
import { Badge } from '@/components/ui/Badge';
import { Divider } from '@/components/ui/Divider';
import { cn } from '@/lib/cn';

/* ── Framer Motion helpers ───────────────────────────────────────────────────
   Bezier arrays matching motion.ts ease values.
   Framer Motion requires [x1, y1, x2, y2] format, not CSS strings.          */

const EASE_OUT: [number, number, number, number] = [0, 0, 0.2, 1];

/* Derived seconds from motion tokens */
const fm = {
  fast:  duration.fast  / 1000,   // 0.10s
  base:  duration.base  / 1000,   // 0.15s
  slow:  duration.slow  / 1000,   // 0.25s
  page:  duration.page  / 1000,   // 0.30s
  enter: duration.enter / 1000,   // 0.40s
} as const;

/* ── Framer Motion variant definitions ───────────────────────────────────────
   All timings derived from Stage 4.1 motion tokens above.                    */

const FADE_UP = {
  hidden:  { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
};

/* Stagger container — propagates hidden/visible to direct motion children */
const STAGGER_GRID = {
  hidden:  {},
  visible: {
    transition: {
      staggerChildren: 0.05,        // motionSpec.cardStagger.container
      delayChildren:   fm.base,     // 0.15s — after hero settles
    },
  },
};

/* Each staggered card item */
const CARD_ITEM = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: fm.slow, ease: EASE_OUT },
  },
};

/* Left column — enters after metric cards */
const LEFT_COL = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: fm.slow, ease: EASE_OUT, delay: fm.page + fm.fast },
  },
};

/* Right column — slight offset after left */
const RIGHT_COL = {
  hidden:  { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: fm.slow, ease: EASE_OUT, delay: fm.page + fm.base },
  },
};

/* ── Static data ─────────────────────────────────────────────────────────────
   Full class names as literals so Tailwind JIT includes them.                */

const ANALYZER_META: Record<string, { label: string; bar: string; dot: string }> = {
  clinical:     { label: 'Clinical',  bar: 'bg-domain-medical', dot: 'bg-domain-medical' },
  legal:        { label: 'Legal',     bar: 'bg-domain-legal',   dot: 'bg-domain-legal'   },
  code:         { label: 'Code',      bar: 'bg-domain-code',    dot: 'bg-domain-code'    },
  audit:        { label: 'Audit',     bar: 'bg-conf-amber',     dot: 'bg-conf-amber'     },
  compare:      { label: 'Compare',   bar: 'bg-gold-dim',       dot: 'bg-gold-dim'       },
  domain_radar: { label: 'Radar',     bar: 'bg-conf-low',       dot: 'bg-conf-low'       },
  analyze:      { label: 'Analyze',   bar: 'bg-conf-high',      dot: 'bg-conf-high'      },
  workspace:    { label: 'Workspace', bar: 'bg-border-strong',  dot: 'bg-border-strong'  },
};

const ANALYZER_ORDER = [
  'clinical', 'legal', 'code', 'audit',
  'compare', 'domain_radar', 'analyze', 'workspace',
];

/* ── Greeting ────────────────────────────────────────────────────────────────*/

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

/* ── Premium icon treatment for empty states ─────────────────────────────────
   Concentric rings + centered icon. No inline styles, no cartoonish art.     */

interface RingedIconProps { icon: string; size?: 'sm' | 'md' }

function RingedIcon({ icon, size = 'md' }: RingedIconProps) {
  const iconSize  = size === 'md' ? 'text-3xl' : 'text-2xl';
  const innerSize = size === 'md' ? 'w-14 h-14' : 'w-10 h-10';
  const outerSize = size === 'md' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div className="relative flex items-center justify-center">
      <div className={cn('rounded-full border border-border/30', outerSize)} />
      <div className={cn('absolute rounded-full border border-border bg-elevated flex items-center justify-center', innerSize)}>
        <span
          className={cn('material-symbols-outlined text-text-muted', iconSize)}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function runStatusVariant(status: string): 'success' | 'error' | 'warning' {
  if (status === 'completed') return 'success';
  if (status === 'error' || status === 'failed') return 'error';
  return 'warning';
}

/* ─────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const firstName = user?.name?.split(' ')[0] ?? '';

  const [data,    setData]    = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  /* Respect prefers-reduced-motion — skip all animations when true */
  const reduced       = useReducedMotion() ?? false;
  const motionInitial = reduced ? 'visible' : 'hidden';

  useEffect(() => {
    const fetchDashboard = async (silent = false) => {
      try {
        const res = await api.get('/api/dashboard');
        setData(res.data);
      } catch (err: unknown) {
        if (!silent) {
          const e = err as { message?: string };
          setError(e.message ?? 'Failed to load dashboard');
        }
      } finally {
        if (!silent) setLoading(false);
      }
    };

    fetchDashboard();
    const id = setInterval(() => fetchDashboard(true), 10_000);
    return () => clearInterval(id);
  }, []);

  /* ── Loading ─────────────────────────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-60px)]">
        <Spinner size="lg" />
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────────────────────── */

  if (error || !data) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-60px)]">
        <EmptyState
          variant="error"
          icon={<RingedIcon icon="error_outline" />}
          title="Failed to load dashboard"
          description={error ?? 'An unexpected error occurred. Please try again.'}
          action={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      </div>
    );
  }

  /* ── Handlers ────────────────────────────────────────────────────────────── */

  const handleResume = (_id: string, analyzer: string) => {
    const routes: Record<string, string> = {
      clinical: '/clinical', legal: '/legal',  compare: '/compare',
      code:     '/code',     audit: '/audit',  analyze: '/analyze',
    };
    navigate(routes[analyzer] ?? '/workspace');
  };

  /* ── Derived ─────────────────────────────────────────────────────────────── */

  const distTotal = Object.values(data.analyzer_distribution ?? {}).reduce(
    (sum, v) => sum + v, 0,
  );

  const distributionItems = ANALYZER_ORDER
    .map((key) => ({ key, ...ANALYZER_META[key], count: data.analyzer_distribution[key] ?? 0 }))
    .filter((a) => a.count > 0);

  /* ── Quick Actions ───────────────────────────────────────────────────────── */

  const firstSession = data.active_sessions[0];
  const hasSession   = Boolean(firstSession);

  interface QuickAction {
    label:    string;
    icon:     string;
    disabled: boolean;
    onClick:  () => void;
  }

  const QUICK_ACTIONS: QuickAction[] = [
    { label: 'New Analysis',     icon: 'add_circle',  disabled: false, onClick: () => navigate('/workspace') },
    { label: 'Browse Templates', icon: 'view_quilt',  disabled: false, onClick: () => navigate('/templates') },
    { label: 'Workspace',        icon: 'folder_open', disabled: false, onClick: () => navigate('/workspace') },
    {
      label:    'Continue Session',
      icon:     'play_circle',
      disabled: !hasSession,
      onClick:  () => {
        if (firstSession) handleResume(firstSession.id, firstSession.analyzer);
      },
    },
  ];

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <motion.header
          variants={FADE_UP}
          initial={motionInitial}
          animate="visible"
          transition={{ duration: fm.slow, ease: EASE_OUT }}
          className="flex flex-col gap-3 mb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6"
        >
          <div className="flex flex-col gap-1">
            <span className="font-sans text-[11px] font-medium uppercase tracking-[0.16em] text-text-muted">
              {getGreeting()}
            </span>
            <h1 className="font-display text-[1.75rem] sm:text-[2rem] font-semibold leading-tight text-text-primary">
              {firstName || 'Welcome back'}
            </h1>
            <p className="font-sans text-sm text-text-secondary mt-0.5">
              {data.quick_stats.analyses_completed}{' '}
              {data.quick_stats.analyses_completed === 1 ? 'analysis' : 'analyses'} completed this
              week
            </p>
          </div>
        </motion.header>

        {/* ── Quick Actions ─────────────────────────────────────────────────── */}
        <motion.div
          variants={FADE_UP}
          initial={motionInitial}
          animate="visible"
          transition={{ duration: fm.slow, ease: EASE_OUT, delay: fm.fast }}
          className="flex flex-wrap items-center gap-2 mb-8"
        >
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                'min-h-[44px] sm:min-h-0',
                'font-sans text-xs font-medium',
                'bg-elevated border border-border text-text-muted',
                'hover:border-border-strong hover:bg-surface hover:text-text-primary',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
                'disabled:opacity-35 disabled:cursor-not-allowed disabled:pointer-events-none',
              )}
            >
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">
                {action.icon}
              </span>
              {action.label}
            </button>
          ))}
        </motion.div>

        {/* ── Metric Cards ──────────────────────────────────────────────────── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-8"
          variants={STAGGER_GRID}
          initial={motionInitial}
          animate="visible"
        >
          <motion.div variants={CARD_ITEM}>
            <DashboardStatCard
              label="Documents"
              value={data.quick_stats.documents_uploaded}
              icon="description"
            />
          </motion.div>
          <motion.div variants={CARD_ITEM}>
            <DashboardStatCard
              label="Analyses"
              value={data.quick_stats.analyses_completed}
              icon="done_all"
            />
          </motion.div>
          <motion.div variants={CARD_ITEM}>
            <DashboardStatCard
              label="Templates"
              value={data.quick_stats.templates_used}
              icon="view_quilt"
            />
          </motion.div>
          <motion.div variants={CARD_ITEM}>
            <DashboardStatCard
              label="Domains"
              value={data.quick_stats.domains_detected}
              icon="category"
            />
          </motion.div>
          <motion.div variants={CARD_ITEM}>
            <ConfidenceCard value={data.quick_stats.average_confidence} />
          </motion.div>
        </motion.div>

        {/* ── Main Content Grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left column — 2/3 */}
          <motion.div
            className="lg:col-span-2 flex flex-col gap-6"
            variants={LEFT_COL}
            initial={motionInitial}
            animate="visible"
          >

            {/* Recent Documents */}
            <Panel
              title="Recent Documents"
              headerAction={
                data.recent_runs.length > 0 ? (
                  <Badge variant="default" size="sm" uppercase={false}>
                    {data.recent_runs.length}
                  </Badge>
                ) : undefined
              }
              noPadding
            >
              {data.recent_runs.length === 0 ? (
                <EmptyState
                  icon={<RingedIcon icon="description" />}
                  title="No analyses yet"
                  description="Upload a document and run your first analysis to see results here."
                  action={{ label: 'Go to Workspace', onClick: () => navigate('/workspace') }}
                  secondaryAction={{ label: 'Browse Templates', onClick: () => navigate('/templates') }}
                />
              ) : (
                <>
                  {/* Mobile stacked cards */}
                  <div className="sm:hidden divide-y divide-border">
                    {data.recent_runs.map((run) => (
                      <button
                        key={run.id}
                        onClick={() => handleResume(run.id, run.analyzer)}
                        className="flex w-full items-center gap-3 px-4 py-3.5 text-left hover:bg-elevated/60 transition-colors duration-100"
                      >
                        <span className="material-symbols-outlined text-[16px] text-text-muted shrink-0" aria-hidden="true">
                          description
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <span className="truncate font-sans text-sm font-medium text-text-primary">
                            {run.document_name}
                          </span>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-sans text-xs capitalize text-text-muted">
                              {run.analyzer.replace('_', ' ')}
                            </span>
                            <Badge variant={runStatusVariant(run.status)} size="sm">
                              {run.status}
                            </Badge>
                          </div>
                        </div>
                        {run.confidence !== null && (
                          <span className={cn(
                            'shrink-0 font-mono text-sm tabular-nums',
                            run.confidence >= 90 ? 'text-conf-high' : run.confidence >= 70 ? 'text-conf-amber' : 'text-conf-critical',
                          )}>
                            {run.confidence}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="px-5 py-3 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">Document</th>
                          <th className="px-5 py-3 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">Analyzer</th>
                          <th className="px-5 py-3 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">Status</th>
                          <th className="px-5 py-3 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">Confidence</th>
                          <th className="px-5 py-3 font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">Date</th>
                          <th className="px-5 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {data.recent_runs.map((run) => (
                          <RecentRunCard key={run.id} run={run} onClick={handleResume} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </Panel>

            {/* Analyzer Distribution */}
            <Panel title="Analyzer Distribution">
              {distTotal === 0 ? (
                <EmptyState
                  icon={<RingedIcon icon="donut_large" size="sm" />}
                  title="No distribution data"
                  description="Run analyses across multiple analyzers to see usage breakdown."
                  centered={false}
                  className="py-4"
                />
              ) : (
                <div className="flex flex-col gap-5">

                  {/* Segmented bar — each segment animates scaleX from 0 → 1 */}
                  <div
                    className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full"
                    role="img"
                    aria-label="Analyzer usage distribution"
                  >
                    {distributionItems.map((a, i) => {
                      const pct     = (a.count / distTotal) * 100;
                      const isFirst = i === 0;
                      const isLast  = i === distributionItems.length - 1;
                      return (
                        <motion.div
                          key={a.key}
                          className={cn(
                            a.bar, 'h-full origin-left',
                            isFirst && 'rounded-l-full',
                            isLast  && 'rounded-r-full',
                          )}
                          style={{ width: `${pct}%` }}
                          initial={{ scaleX: reduced ? 1 : 0 }}
                          animate={{ scaleX: 1 }}
                          transition={{
                            duration: fm.page,
                            ease:     EASE_OUT,
                            delay:    reduced ? 0 : fm.base + i * (fm.fast * 0.6),
                          }}
                          title={`${a.label}: ${a.count}`}
                        />
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3">
                    {distributionItems.map((a) => (
                      <div key={a.key} className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn('w-2 h-2 rounded-full shrink-0', a.dot)} />
                          <span className="font-sans text-xs text-text-secondary truncate">
                            {a.label}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-text-primary tabular-nums shrink-0">
                          {a.count}
                        </span>
                      </div>
                    ))}
                  </div>

                </div>
              )}
            </Panel>

          </motion.div>

          {/* Right column — 1/3 */}
          <motion.div
            className="flex flex-col gap-6"
            variants={RIGHT_COL}
            initial={motionInitial}
            animate="visible"
          >

            {/* Active Sessions */}
            <Panel title="Active Sessions">
              {data.active_sessions.length === 0 ? (
                <EmptyState
                  icon={<RingedIcon icon="pending_actions" size="sm" />}
                  title="No active sessions"
                  description="In-progress work will appear here."
                  centered={false}
                  className="py-4"
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {data.active_sessions.map((session) => (
                    <SessionCard key={session.id} session={session} onResume={handleResume} />
                  ))}
                </div>
              )}
            </Panel>

            {/* Recent Activity */}
            <Panel title="Recent Activity">
              <ActivityTimeline runs={data.recent_runs} />
            </Panel>

            {/* Template Usage */}
            <Panel title="Template Usage">
              {data.template_usage.length === 0 ? (
                <EmptyState
                  icon={<RingedIcon icon="view_quilt" size="sm" />}
                  title="No templates used"
                  description="Launch a workflow from Templates to track usage here."
                  action={{ label: 'Browse Templates', onClick: () => navigate('/templates') }}
                  centered={false}
                  className="py-4"
                />
              ) : (
                <div className="flex flex-col">
                  {data.template_usage.map((t, i) => (
                    <div key={t.template_name}>
                      {i > 0 && <Divider className="my-0" />}
                      <div className="flex items-center justify-between py-3">
                        <span className="font-sans text-sm text-text-secondary truncate pr-4">
                          {t.template_name}
                        </span>
                        <span className="font-mono text-sm font-semibold text-gold-primary shrink-0 tabular-nums">
                          {t.usage_count}×
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

          </motion.div>
        </div>
      </div>
    </div>
  );
}
