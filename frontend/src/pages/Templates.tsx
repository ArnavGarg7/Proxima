// frontend/src/pages/Templates.tsx
// Phase 4.20 — Template Library becomes a real workflow launcher

import { useEffect, useState } from 'react';
import { api } from '@/lib/axios';
import { type TemplateListItem } from '@/types/template';
import TemplateLaunchModal from '@/components/templates/TemplateLaunchModal';

// ---------------------------------------------------------------------------
// Domain styling
// ---------------------------------------------------------------------------
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

// Domains available in the filter sidebar — must match registry domains
const FILTER_DOMAINS = ['clinical', 'legal', 'code', 'general'] as const;
const FILTER_LABELS: Record<string, string> = {
  clinical: 'Clinical',
  legal:    'Legal',
  code:     'Code',
  general:  'General',
};

function domainKey(d: string): DomainKey {
  return (['clinical', 'legal', 'code', 'general'].includes(d) ? d : 'default') as DomainKey;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function Templates() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [domainFilter, setDomainFilter] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateListItem | null>(null);

  // Load templates from registry API
  useEffect(() => {
    api.get('/api/templates/')
      .then(res => setTemplates(Array.isArray(res.data) ? res.data : []))
      .catch(err => setError(err.message || 'Failed to load templates'))
      .finally(() => setLoading(false));
  }, []);

  const filteredTemplates = domainFilter
    ? templates.filter(t => t.domain === domainFilter)
    : templates;

  // ---------------------------------------------------------------------------
  // Loading / error states
  // ---------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-60px)]">
        <div className="w-8 h-8 border-2 border-gold-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center text-center">
        <span className="material-symbols-outlined text-conf-critical text-5xl mb-4">error</span>
        <h2 className="font-display text-xl text-text-primary mb-2">Failed to load Templates</h2>
        <p className="text-text-secondary font-sans text-sm">{error}</p>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  return (
    <>
      <div className="flex flex-1 overflow-hidden min-h-[calc(100vh-60px)]">

        {/* ── Left Sidebar: Filters ── */}
        <aside className="w-[260px] bg-surface border-r border-border flex flex-col py-6 flex-shrink-0 h-full overflow-y-auto">
          <div className="px-6 mb-6">
            <h2 className="font-display text-lg text-text-primary mb-1">Filters</h2>
            <p className="font-sans text-xs text-text-secondary">Refine by domain</p>
          </div>

          <div className="flex flex-col gap-1 px-4">
            {/* All */}
            <button
              onClick={() => setDomainFilter(null)}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-sans transition-colors ${
                !domainFilter
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">apps</span>
              All Domains
              <span className="ml-auto text-[11px] text-text-muted">{templates.length}</span>
            </button>

            {FILTER_DOMAINS.map(domain => {
              const isActive = domainFilter === domain;
              const count = templates.filter(t => t.domain === domain).length;
              const dk = domainKey(domain);
              return (
                <button
                  key={domain}
                  onClick={() => setDomainFilter(isActive ? null : domain)}
                  className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-sans transition-colors ${
                    isActive
                      ? `${DOMAIN_BADGE[dk]} font-semibold`
                      : 'text-text-secondary hover:text-text-primary hover:bg-elevated'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[16px] ${isActive ? DOMAIN_ICON_COLOR[dk] : ''}`}>
                    {domain === 'clinical' ? 'medical_services' :
                     domain === 'legal'    ? 'gavel' :
                     domain === 'code'     ? 'code' : 'summarize'}
                  </span>
                  {FILTER_LABELS[domain]}
                  <span className="ml-auto text-[11px] text-text-muted">{count}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-auto px-4 pt-6 border-t border-border mt-6">
            <button
              onClick={() => setDomainFilter(null)}
              className="w-full py-2 bg-transparent border border-border text-text-secondary text-sm font-sans rounded-lg hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Reset Filters
            </button>
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 bg-void relative overflow-y-auto">

          {/* Sticky header */}
          <div className="px-8 py-6 border-b border-border bg-void/80 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-end">
            <div>
              <h1 className="font-display text-3xl text-text-primary mb-1">Template Library</h1>
              <p className="font-sans text-sm text-text-secondary max-w-xl">
                Curated workflow templates that launch the correct Proxima workbench with pre-seeded instructions.
              </p>
            </div>
            <span className="font-sans text-xs text-text-muted">
              {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Template grid */}
          <div className="p-8">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-16 text-text-muted font-sans text-sm">
                No templates found for the selected filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTemplates.map(template => {
                  const dk = domainKey(template.domain);
                  return (
                    <div
                      key={template.id}
                      className={`bg-elevated border border-border rounded-2xl p-6 flex flex-col transition-all group relative overflow-hidden cursor-default ${DOMAIN_GLOW[dk]}`}
                    >
                      {/* Top accent line */}
                      <div className={`absolute top-0 left-0 w-full h-[2px] ${DOMAIN_TOP_LINE[dk]} opacity-0 group-hover:opacity-100 transition-opacity`} />

                      {/* Card header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className={`inline-flex items-center gap-1.5 border rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${DOMAIN_BADGE[dk]}`}>
                          <span className="material-symbols-outlined text-[12px]">{template.icon}</span>
                          {template.badge_label}
                        </div>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-surface border border-border`}>
                          <span className={`material-symbols-outlined text-[18px] ${DOMAIN_ICON_COLOR[dk]}`}>{template.icon}</span>
                        </div>
                      </div>

                      {/* Title + description */}
                      <h3 className="font-display text-lg text-text-primary mb-2 group-hover:text-primary transition-colors">
                        {template.name}
                      </h3>
                      <p className="font-sans text-sm text-text-secondary mb-4 flex-1 leading-relaxed line-clamp-3">
                        {template.description}
                      </p>

                      {/* Launch mode indicator */}
                      <div className="flex items-center gap-1.5 mb-4 text-text-muted font-sans text-[11px]">
                        <span className="material-symbols-outlined text-[13px]">
                          {template.launch_mode === 'document_required' ? 'description' :
                           template.launch_mode === 'code_input'        ? 'terminal' : 'bolt'}
                        </span>
                        <span>
                          {template.launch_mode === 'document_required' ? 'Requires a document' :
                           template.launch_mode === 'code_input'        ? 'Code input in Code Suite' : 'Document optional'}
                        </span>
                        <span className="mx-2 text-border">·</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                        <span className="capitalize">{template.target_workbench}</span>
                      </div>

                      {/* CTA */}
                      <div className="mt-auto pt-4 border-t border-border/50">
                        <button
                          onClick={() => setSelectedTemplate(template)}
                          className="w-full bg-gold-primary text-void py-2 rounded-lg font-sans text-sm font-bold hover:bg-gold-primary/90 transition-colors flex items-center justify-center gap-2 group/btn"
                        >
                          <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                          Use Template
                          <span className="material-symbols-outlined text-[14px] opacity-0 group-hover/btn:opacity-100 transition-opacity -ml-1">
                            arrow_forward
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Launch Modal */}
      {selectedTemplate && (
        <TemplateLaunchModal
          template={selectedTemplate}
          onClose={() => setSelectedTemplate(null)}
        />
      )}
    </>
  );
}
