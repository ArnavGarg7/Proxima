// frontend/src/pages/Templates.tsx
// Stage 4.5H — Template Library Redesign

import { useEffect, useState, useMemo, useDeferredValue } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FadeIn, FadeUp } from '@/components/motion';
import { api } from '@/lib/axios';
import { type TemplateListItem, type LaunchMode } from '@/types/template';
import TemplateLaunchModal from '@/components/templates/TemplateLaunchModal';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { SidebarSection } from '@/components/ui/Panel';
import { cn } from '@/lib/cn';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

// ── Domain constants (all preserved from original) ────────────────────────────

type DomainKey = 'clinical' | 'legal' | 'code' | 'general' | 'default';

const DOMAIN_BADGE: Record<DomainKey, string> = {
  clinical: 'bg-conf-high/10 border-conf-high/20 text-conf-high',
  legal:    'bg-primary/10 border-primary/20 text-primary',
  code:     'bg-conf-amber/10 border-conf-amber/20 text-conf-amber',
  general:  'bg-surface border-border text-text-secondary',
  default:  'bg-surface border-border text-text-secondary',
};

const DOMAIN_GLOW: Record<DomainKey, string> = {
  clinical: 'hover:border-conf-high/40',
  legal:    'hover:border-primary/40',
  code:     'hover:border-conf-amber/40',
  general:  'hover:border-border',
  default:  'hover:border-border',
};

const DOMAIN_TOP_LINE: Record<DomainKey, string> = {
  clinical: 'bg-conf-high',
  legal:    'bg-primary',
  code:     'bg-conf-amber',
  general:  'bg-text-muted',
  default:  'bg-text-muted',
};

const DOMAIN_ICON_COLOR: Record<DomainKey, string> = {
  clinical: 'text-conf-high',
  legal:    'text-primary',
  code:     'text-conf-amber',
  general:  'text-text-secondary',
  default:  'text-text-secondary',
};

// ── Extended domain metadata ──────────────────────────────────────────────────

const DOMAIN_CAPABILITIES: Record<DomainKey, string[]> = {
  clinical: ['Risk Detection', 'Medication Review', 'Clinical Summary'],
  legal:    ['Risk Flags', 'Clause Extraction', 'Compliance Review'],
  code:     ['Code Review', 'Security Analysis', 'Documentation'],
  general:  ['Summarization', 'Extraction', 'Analysis'],
  default:  ['Analysis'],
};

const DOMAIN_TIME: Record<DomainKey, string> = {
  clinical: '3–5 min',
  legal:    '2–4 min',
  code:     '1–3 min',
  general:  '1–2 min',
  default:  '2–3 min',
};

const DOMAIN_ICONS: Record<string, string> = {
  clinical: 'medical_services',
  legal:    'gavel',
  code:     'code',
  general:  'summarize',
};

const WORKBENCH_LABEL: Record<string, string> = {
  clinical: 'Clinical Intelligence',
  legal:    'Legal Intelligence',
  code:     'Code Suite',
  analyze:  'General Analysis',
};

const FILTER_DOMAINS = ['clinical', 'legal', 'code', 'general'] as const;
const FILTER_LABELS: Record<string, string> = {
  clinical: 'Clinical',
  legal:    'Legal',
  code:     'Code',
  general:  'General',
};

type RequirementFilter = 'all' | LaunchMode;

function domainKey(d: string): DomainKey {
  return (['clinical', 'legal', 'code', 'general'].includes(d) ? d : 'default') as DomainKey;
}

function domainBadgeVariant(dk: DomainKey): BadgeVariant {
  const map: Record<DomainKey, BadgeVariant> = {
    clinical: 'domain-medical',
    legal:    'domain-legal',
    code:     'domain-code',
    general:  'default',
    default:  'default',
  };
  return map[dk];
}

// ── Primitive display helpers ─────────────────────────────────────────────────

function CapabilityChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-void px-2 py-0.5 font-sans text-[10px] text-text-secondary">
      <span className="material-symbols-outlined text-[10px] text-conf-high" aria-hidden="true">
        check
      </span>
      {label}
    </span>
  );
}

function LaunchBadge({ workbench }: { workbench: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-sans text-xs text-text-secondary">
      <span className="material-symbols-outlined text-[14px] text-gold-primary" aria-hidden="true">
        arrow_forward
      </span>
      {WORKBENCH_LABEL[workbench] ?? workbench}
    </span>
  );
}

function RequirementTag({ launchMode }: { launchMode: LaunchMode }) {
  const config: Record<LaunchMode, { icon: string; label: string; cls: string }> = {
    document_required: { icon: 'description', label: 'Requires Document', cls: 'text-text-secondary' },
    document_optional: { icon: 'bolt',        label: 'Doc Optional',      cls: 'text-text-muted'     },
    code_input:        { icon: 'terminal',    label: 'Requires Code',     cls: 'text-domain-code'    },
  };
  const { icon, label, cls } = config[launchMode];
  return (
    <span className={`inline-flex items-center gap-1 font-sans text-[11px] ${cls}`}>
      <span className="material-symbols-outlined text-[13px]" aria-hidden="true">{icon}</span>
      {label}
    </span>
  );
}

// ── Sidebar nav button ────────────────────────────────────────────────────────

function SidebarNavButton({
  active,
  icon,
  label,
  count,
  onClick,
  activeClass,
}: {
  active: boolean;
  icon: string;
  label: string;
  count: number;
  onClick: () => void;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 font-sans text-sm transition-colors',
        active
          ? activeClass ?? 'bg-gold-primary/10 font-semibold text-gold-primary'
          : 'text-text-secondary hover:bg-elevated hover:text-text-primary',
      )}
    >
      <span className="material-symbols-outlined shrink-0 text-[16px]" aria-hidden="true">
        {icon}
      </span>
      <span className="flex-1 text-left">{label}</span>
      <span className="font-mono text-[10px] text-text-muted">{count}</span>
    </button>
  );
}

// ── TemplateSidebar ───────────────────────────────────────────────────────────

function TemplateSidebar({
  templates,
  domainFilter,
  setDomainFilter,
  requirementFilter,
  setRequirementFilter,
  isDrawerOpen = false,
  onClose,
}: {
  templates: TemplateListItem[];
  domainFilter: string | null;
  setDomainFilter: (v: string | null) => void;
  requirementFilter: RequirementFilter;
  setRequirementFilter: (v: RequirementFilter) => void;
  isDrawerOpen?: boolean;
  onClose?: () => void;
}) {
  useEffect(() => {
    if (!isDrawerOpen) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isDrawerOpen, onClose]);

  const handleReset = () => {
    setDomainFilter(null);
    setRequirementFilter('all');
    onClose?.();
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden',
          'motion-safe:transition-opacity motion-safe:duration-300',
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={cn(
          'flex flex-col overflow-y-auto border-r border-border bg-surface py-6',
          'fixed inset-y-0 left-0 z-50 w-[280px]',
          'motion-safe:transition-transform motion-safe:duration-300',
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full',
          'lg:static lg:inset-auto lg:z-auto lg:translate-x-0 lg:w-[220px] lg:shrink-0 lg:h-full',
        )}
        aria-label="Template filters"
      >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between px-5">
        <div>
          <h2 className="font-display text-sm text-text-primary">Filters</h2>
          <p className="mt-0.5 font-sans text-[11px] text-text-muted">Refine by domain or type</p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close filters"
          className="lg:hidden -mr-1 flex h-8 w-8 items-center justify-center rounded-lg text-text-muted hover:bg-elevated hover:text-text-primary transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]" aria-hidden="true">close</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-5 px-4">
        {/* Domain */}
        <SidebarSection title="Domain">
          <SidebarNavButton
            active={!domainFilter}
            icon="apps"
            label="All Domains"
            count={templates.length}
            onClick={() => setDomainFilter(null)}
          />
          {FILTER_DOMAINS.map(domain => {
            const dk = domainKey(domain);
            return (
              <SidebarNavButton
                key={domain}
                active={domainFilter === domain}
                icon={DOMAIN_ICONS[domain]}
                label={FILTER_LABELS[domain]}
                count={templates.filter(t => t.domain === domain).length}
                onClick={() => setDomainFilter(domainFilter === domain ? null : domain)}
                activeClass={DOMAIN_BADGE[dk] + ' font-semibold border'}
              />
            );
          })}
        </SidebarSection>

        <div className="border-t border-border" />

        {/* Requirements */}
        <SidebarSection title="Requirements">
          <SidebarNavButton
            active={requirementFilter === 'all'}
            icon="filter_list"
            label="All Types"
            count={templates.length}
            onClick={() => setRequirementFilter('all')}
          />
          <SidebarNavButton
            active={requirementFilter === 'document_required'}
            icon="description"
            label="Needs Document"
            count={templates.filter(t => t.launch_mode === 'document_required').length}
            onClick={() =>
              setRequirementFilter(
                requirementFilter === 'document_required' ? 'all' : 'document_required',
              )
            }
          />
          <SidebarNavButton
            active={requirementFilter === 'code_input'}
            icon="terminal"
            label="Needs Code"
            count={templates.filter(t => t.launch_mode === 'code_input').length}
            onClick={() =>
              setRequirementFilter(requirementFilter === 'code_input' ? 'all' : 'code_input')
            }
          />
          <SidebarNavButton
            active={requirementFilter === 'document_optional'}
            icon="bolt"
            label="Doc Optional"
            count={templates.filter(t => t.launch_mode === 'document_optional').length}
            onClick={() =>
              setRequirementFilter(
                requirementFilter === 'document_optional' ? 'all' : 'document_optional',
              )
            }
          />
        </SidebarSection>
      </div>

      {/* Reset */}
      <div className="mt-6 border-t border-border px-4 pt-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-full"
          onClick={handleReset}
          leftIcon={
            <span className="material-symbols-outlined text-[15px]" aria-hidden="true">
              restart_alt
            </span>
          }
        >
          Reset Filters
        </Button>
      </div>
      </aside>
    </>
  );
}

// ── TemplateSearch ────────────────────────────────────────────────────────────

function TemplateSearch({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <span
        className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-text-muted"
        aria-hidden="true"
      >
        search
      </span>
      <input
        type="search"
        aria-label="Search templates"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Search templates…"
        className="w-full sm:w-52 rounded-lg border border-border bg-surface py-2 pl-9 pr-8 font-sans text-sm text-text-primary
          placeholder-text-muted focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
      />
      <FadeIn show={!!value} className="absolute right-2.5 top-1/2 -translate-y-1/2">
        <button
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="text-text-muted transition-colors hover:text-text-primary"
        >
          <span className="material-symbols-outlined text-[16px]">close</span>
        </button>
      </FadeIn>
    </div>
  );
}

// ── TemplateHero ──────────────────────────────────────────────────────────────

function TemplateHero({
  template,
  onSelect,
}: {
  template: TemplateListItem;
  onSelect: () => void;
}) {
  const dk = domainKey(template.domain);
  return (
    <div
      className={cn(
        'group relative mb-6 cursor-default overflow-hidden rounded-2xl border border-border bg-elevated p-6',
        'transition-all duration-200 hover:shadow-lg hover:shadow-void/40',
        DOMAIN_GLOW[dk],
      )}
    >
      {/* Top accent line — always visible for hero */}
      <div className={`absolute inset-x-0 top-0 h-[2px] opacity-70 ${DOMAIN_TOP_LINE[dk]}`} />

      {/* Watermark icon */}
      <div
        className="pointer-events-none absolute -right-6 -top-6 select-none opacity-[0.04]"
        aria-hidden="true"
      >
        <span
          className="material-symbols-outlined text-[180px] text-gold-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          {template.icon}
        </span>
      </div>

      <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3">
          {/* Ribbons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-primary/30 bg-gold-primary/10 px-2.5 py-1 font-sans text-[10px] font-bold text-gold-primary">
              <span className="material-symbols-outlined text-[11px]" aria-hidden="true">star</span>
              Featured
            </span>
            <Badge variant={domainBadgeVariant(dk)} size="sm" uppercase>
              {template.badge_label}
            </Badge>
          </div>

          {/* Title + description */}
          <div>
            <h2 className="font-display text-2xl text-text-primary transition-colors group-hover:text-gold-primary">
              {template.name}
            </h2>
            <p className="mt-1 line-clamp-1 max-w-xl font-sans text-sm text-text-secondary">
              {template.description}
            </p>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-5">
            <LaunchBadge workbench={template.target_workbench} />
            <RequirementTag launchMode={template.launch_mode} />
            <span className="flex items-center gap-1 font-sans text-[11px] text-text-muted">
              <span className="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>
              {DOMAIN_TIME[dk]}
            </span>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={onSelect}
          className="w-full sm:w-auto sm:shrink-0"
          rightIcon={
            <span
              className="material-symbols-outlined text-[16px] transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          }
        >
          Launch Template
        </Button>
      </div>
    </div>
  );
}

// ── TemplateCard (grid view) ──────────────────────────────────────────────────

function TemplateCard({
  template,
  onSelect,
  isPopular,
}: {
  template: TemplateListItem;
  onSelect: () => void;
  isPopular: boolean;
}) {
  const dk = domainKey(template.domain);
  const capabilities = DOMAIN_CAPABILITIES[dk];

  return (
    <div
      className={cn(
        'group relative flex cursor-default flex-col overflow-hidden rounded-2xl border border-border bg-elevated',
        'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-void/40',
        DOMAIN_GLOW[dk],
      )}
    >
      {/* Top accent line */}
      <div
        className={`h-[2px] w-full opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${DOMAIN_TOP_LINE[dk]}`}
      />

      {/* Popular ribbon */}
      {isPopular && (
        <div className="absolute right-3 top-3 flex items-center gap-1 rounded-full border border-gold-primary/30 bg-gold-primary/10 px-2 py-0.5">
          <span className="material-symbols-outlined text-[11px] text-gold-primary" aria-hidden="true">
            star
          </span>
          <span className="font-sans text-[10px] font-bold text-gold-primary">Popular</span>
        </div>
      )}

      {/* Card header: domain badge + spinning icon */}
      <div className="flex items-start justify-between p-5 pb-3">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded border font-sans text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5',
            DOMAIN_BADGE[dk],
          )}
        >
          <span className="material-symbols-outlined text-[11px]" aria-hidden="true">
            {template.icon}
          </span>
          {template.badge_label}
        </span>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface transition-transform duration-300 group-hover:rotate-6">
          <span
            className={`material-symbols-outlined text-[20px] ${DOMAIN_ICON_COLOR[dk]}`}
            style={{ fontVariationSettings: "'FILL' 1" }}
            aria-hidden="true"
          >
            {template.icon}
          </span>
        </div>
      </div>

      {/* Title + description */}
      <div className="px-5 pb-4">
        <h3 className="mb-1.5 font-display text-lg text-text-primary transition-colors group-hover:text-gold-primary">
          {template.name}
        </h3>
        <p className="line-clamp-2 font-sans text-sm leading-relaxed text-text-secondary">
          {template.description}
        </p>
      </div>

      <div className="mx-5 border-t border-border/60" />

      {/* Capabilities */}
      <div className="px-5 py-3">
        <p className="mb-2 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Capabilities
        </p>
        <div className="flex flex-wrap gap-1.5">
          {capabilities.map(cap => (
            <CapabilityChip key={cap} label={cap} />
          ))}
        </div>
      </div>

      <div className="mx-5 border-t border-border/60" />

      {/* Launches */}
      <div className="px-5 py-3">
        <p className="mb-1.5 font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">
          Launches
        </p>
        <LaunchBadge workbench={template.target_workbench} />
      </div>

      <div className="mx-5 border-t border-border/60" />

      {/* Requirements + estimated time */}
      <div className="flex flex-wrap items-center gap-4 px-5 py-3">
        <RequirementTag launchMode={template.launch_mode} />
        <span className="flex items-center gap-1 font-sans text-[11px] text-text-muted">
          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>
          {DOMAIN_TIME[dk]}
        </span>
      </div>

      {/* CTA */}
      <div className="mt-auto px-5 pb-5 pt-3">
        <Button
          variant="primary"
          className="w-full"
          onClick={onSelect}
          rightIcon={
            <span
              className="material-symbols-outlined text-[15px] transition-transform duration-200 group-hover:translate-x-0.5"
              aria-hidden="true"
            >
              arrow_forward
            </span>
          }
        >
          Use Template
        </Button>
      </div>
    </div>
  );
}

// ── TemplateListRow (list view) ───────────────────────────────────────────────

function TemplateListRow({
  template,
  onSelect,
  isPopular,
}: {
  template: TemplateListItem;
  onSelect: () => void;
  isPopular: boolean;
}) {
  const dk = domainKey(template.domain);
  return (
    <div
      className={cn(
        'group relative flex cursor-default items-center gap-4 rounded-xl border border-border bg-elevated p-4',
        'transition-all duration-200 hover:-translate-y-px hover:shadow-sm',
        DOMAIN_GLOW[dk],
      )}
    >
      {/* Domain accent bar */}
      <div
        className={`absolute inset-y-0 left-0 w-[3px] rounded-l-xl opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${DOMAIN_TOP_LINE[dk]}`}
      />

      {/* Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface transition-transform duration-300 group-hover:rotate-6">
        <span
          className={`material-symbols-outlined text-[20px] ${DOMAIN_ICON_COLOR[dk]}`}
          style={{ fontVariationSettings: "'FILL' 1" }}
          aria-hidden="true"
        >
          {template.icon}
        </span>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={domainBadgeVariant(dk)} size="sm" uppercase>
            {template.badge_label}
          </Badge>
          {isPopular && (
            <span className="inline-flex items-center gap-1 rounded-full border border-gold-primary/30 bg-gold-primary/10 px-2 py-0.5 font-sans text-[10px] font-bold text-gold-primary">
              <span className="material-symbols-outlined text-[10px]" aria-hidden="true">star</span>
              Popular
            </span>
          )}
        </div>
        <h3 className="font-sans text-sm font-semibold text-text-primary transition-colors group-hover:text-gold-primary">
          {template.name}
        </h3>
        <p className="line-clamp-1 font-sans text-xs text-text-muted">{template.description}</p>
      </div>

      {/* Meta (hidden on small screens) */}
      <div className="hidden shrink-0 items-center gap-6 font-sans text-xs text-text-muted md:flex">
        <LaunchBadge workbench={template.target_workbench} />
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[13px]" aria-hidden="true">schedule</span>
          {DOMAIN_TIME[dk]}
        </span>
        <RequirementTag launchMode={template.launch_mode} />
      </div>

      {/* CTA */}
      <Button
        variant="outline"
        size="sm"
        onClick={onSelect}
        className="shrink-0"
        rightIcon={
          <span className="material-symbols-outlined text-[14px]" aria-hidden="true">
            arrow_forward
          </span>
        }
      >
        Use
      </Button>
    </div>
  );
}

// ── EmptyTemplates ────────────────────────────────────────────────────────────

function EmptyTemplates({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-elevated">
        <span className="material-symbols-outlined text-3xl text-text-muted" aria-hidden="true">
          filter_none
        </span>
      </div>
      <h3 className="mb-2 font-display text-xl text-text-primary">
        No templates match your filters
      </h3>
      <p className="mb-6 font-sans text-sm text-text-muted">
        Try adjusting or clearing your filters to discover more workflows.
      </p>
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:w-auto sm:items-center">
        <Button
          variant="secondary"
          onClick={onReset}
          className="w-full sm:w-auto"
          leftIcon={
            <span className="material-symbols-outlined text-[16px]" aria-hidden="true">
              restart_alt
            </span>
          }
        >
          Reset Filters
        </Button>
        <Button variant="ghost" onClick={onReset} className="w-full sm:w-auto">
          Browse All
        </Button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Templates() {
  useDocumentTitle('Templates');
  // ── State (original preserved) ───────────────────────────────────────────
  const [templates, setTemplates]               = useState<TemplateListItem[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState<string | null>(null);
  const [domainFilter, setDomainFilter]         = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);

  // ── New additive state ───────────────────────────────────────────────────
  const [searchQuery, setSearchQuery]               = useState('');
  const [requirementFilter, setRequirementFilter]   = useState<RequirementFilter>('all');
  const [sortOrder, setSortOrder]                   = useState<'default' | 'name' | 'domain'>('default');
  const [viewMode, setViewMode]                     = useState<'grid' | 'list'>('grid');
  const [filterDrawerOpen, setFilterDrawerOpen]     = useState(false);

  const deferredQuery = useDeferredValue(searchQuery);

  // ── Load templates from registry API (preserved) ────────────────────────
  useEffect(() => {
    api.get('/api/templates/')
      .then(res => setTemplates(Array.isArray(res.data) ? res.data : []))
      .catch((err: unknown) => {
        const e = err as { message?: string };
        setError(e.message || 'Failed to load templates');
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Filtering — deferred query keeps the input responsive on every keystroke
  const filteredTemplates = useMemo(() => {
    const domainFiltered = domainFilter
      ? templates.filter(t => t.domain === domainFilter)
      : templates;
    const requirementFiltered =
      requirementFilter === 'all'
        ? domainFiltered
        : domainFiltered.filter(t => t.launch_mode === requirementFilter);
    const q = deferredQuery.trim().toLowerCase();
    const searchFiltered = q
      ? requirementFiltered.filter(
          t =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.badge_label.toLowerCase().includes(q),
        )
      : requirementFiltered;
    return [...searchFiltered].sort((a, b) => {
      if (sortOrder === 'name')   return a.name.localeCompare(b.name);
      if (sortOrder === 'domain') return a.domain.localeCompare(b.domain);
      return 0;
    });
  }, [templates, domainFilter, requirementFilter, deferredQuery, sortOrder]);

  const q              = deferredQuery.trim().toLowerCase();
  const popularId        = templates[0]?.id ?? null;
  const featuredTemplate = templates[0] ?? null;
  const showHero         = !domainFilter && requirementFilter === 'all' && !q;

  const handleResetFilters = () => {
    setDomainFilter(null);
    setRequirementFilter('all');
    setSearchQuery('');
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-1 items-center justify-center">
        <Spinner size="lg" label="Loading templates…" />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex min-h-[calc(100vh-60px)] flex-1 flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined mb-4 text-5xl text-conf-critical" aria-hidden="true">
          error
        </span>
        <h2 className="mb-2 font-display text-xl text-text-primary">Failed to load Templates</h2>
        <p className="font-sans text-sm text-text-secondary">{error}</p>
      </div>
    );
  }

  // ── Main layout ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex min-h-[calc(100vh-60px)] flex-1 overflow-hidden">

        {/* ── Left Sidebar ── */}
        <TemplateSidebar
          templates={templates}
          domainFilter={domainFilter}
          setDomainFilter={setDomainFilter}
          requirementFilter={requirementFilter}
          setRequirementFilter={setRequirementFilter}
          isDrawerOpen={filterDrawerOpen}
          onClose={() => setFilterDrawerOpen(false)}
        />

        {/* ── Main content ── */}
        <main className="relative flex-1 overflow-y-auto bg-void">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 border-b border-border bg-void/80 px-4 sm:px-6 md:px-8 py-4 sm:py-5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Title + count */}
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-display text-xl sm:text-2xl text-text-primary">Template Library</h1>
                  <span className="rounded-full border border-border bg-elevated px-2.5 py-1 font-sans text-xs text-text-muted">
                    {filteredTemplates.length}{' '}
                    {filteredTemplates.length === 1 ? 'template' : 'templates'}
                  </span>
                </div>
                <p className="mt-0.5 font-sans text-sm text-text-secondary">
                  Curated AI workflows
                </p>
              </div>

              {/* Controls — column-stack on mobile, row on sm+ */}
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
                {/* Search — full width on mobile */}
                <TemplateSearch value={searchQuery} onChange={setSearchQuery} />

                {/* Second row on mobile: filter btn + sort + toggle */}
                <div className="flex items-center gap-2">
                  {/* Mobile filter button */}
                  <button
                    onClick={() => setFilterDrawerOpen(true)}
                    aria-label="Open filters"
                    className={cn(
                      'lg:hidden inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface',
                      'px-3 py-2 font-sans text-sm text-text-secondary hover:bg-elevated hover:text-text-primary transition-colors',
                    )}
                  >
                    <span className="material-symbols-outlined text-[16px]" aria-hidden="true">tune</span>
                    Filters
                    {(domainFilter || requirementFilter !== 'all') && (
                      <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-gold-primary" aria-hidden="true" />
                    )}
                  </button>

                  <select
                    aria-label="Sort templates"
                    value={sortOrder}
                    onChange={e =>
                      setSortOrder(e.target.value as 'default' | 'name' | 'domain')
                    }
                    className="rounded-lg border border-border bg-surface px-3 py-2 font-sans text-sm text-text-secondary
                      focus:border-gold-primary focus:outline-none focus:ring-2 focus:ring-gold-primary/15"
                  >
                    <option value="default">Sort: Default</option>
                    <option value="name">Sort: Name</option>
                    <option value="domain">Sort: Domain</option>
                  </select>

                  {/* Grid / List toggle */}
                  <div className="flex rounded-lg border border-border bg-surface">
                    <button
                      onClick={() => setViewMode('grid')}
                      aria-label="Grid view"
                      className={cn(
                        'flex items-center justify-center rounded-l-lg px-2.5 py-2 transition-colors',
                        viewMode === 'grid'
                          ? 'bg-elevated text-text-primary'
                          : 'text-text-muted hover:text-text-secondary',
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        grid_view
                      </span>
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      aria-label="List view"
                      className={cn(
                        'flex items-center justify-center rounded-r-lg px-2.5 py-2 transition-colors',
                        viewMode === 'list'
                          ? 'bg-elevated text-text-primary'
                          : 'text-text-muted hover:text-text-secondary',
                      )}
                    >
                      <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                        view_list
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 sm:p-6 md:p-8">
            {/* Featured hero — only when no filters active */}
            {showHero && featuredTemplate && (
              <FadeUp>
                <TemplateHero
                  template={featuredTemplate}
                  onSelect={() => setSelectedTemplate(featuredTemplate)}
                />
              </FadeUp>
            )}

            <AnimatePresence mode="wait">
              {filteredTemplates.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <EmptyTemplates onReset={handleResetFilters} />
                </motion.div>
              ) : viewMode === 'grid' ? (
                <motion.div
                  key={`grid-${domainFilter ?? 'all'}-${requirementFilter}-${q}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3"
                >
                  {filteredTemplates.map(template => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => setSelectedTemplate(template)}
                      isPopular={template.id === popularId}
                    />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key={`list-${domainFilter ?? 'all'}-${requirementFilter}-${q}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-3"
                >
                  {filteredTemplates.map((template, i) => (
                    <FadeUp key={template.id} index={Math.min(i, 6)}>
                      <TemplateListRow
                        template={template}
                        onSelect={() => setSelectedTemplate(template)}
                        isPopular={template.id === popularId}
                      />
                    </FadeUp>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Launch Modal */}
      <AnimatePresence>
        {selectedTemplate && (
          <TemplateLaunchModal
            template={selectedTemplate}
            onClose={() => setSelectedTemplate(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
