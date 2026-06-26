// frontend/src/components/templates/TemplateBanner.tsx
// Phase 4.20 — Compact template-origin banner shown at top of target workbenches

import { clearTemplateLaunchContext, type TemplateLaunchContext } from '@/types/template';

const DOMAIN_STYLES: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  clinical: { bg: 'bg-conf-high/8', border: 'border-conf-high/25', text: 'text-conf-high', dot: 'bg-conf-high' },
  legal:    { bg: 'bg-primary/8',   border: 'border-primary/25',   text: 'text-primary',   dot: 'bg-primary' },
  code:     { bg: 'bg-conf-amber/8',border: 'border-conf-amber/25',text: 'text-conf-amber', dot: 'bg-conf-amber' },
  general:  { bg: 'bg-text-muted/8',border: 'border-border',       text: 'text-text-secondary', dot: 'bg-text-muted' },
};

const DOMAIN_ICONS: Record<string, string> = {
  clinical: 'medical_services',
  legal:    'gavel',
  code:     'code',
  general:  'summarize',
};

interface TemplateBannerProps {
  context: TemplateLaunchContext;
  onClear: () => void;
}

export default function TemplateBanner({ context, onClear }: TemplateBannerProps) {
  const style = DOMAIN_STYLES[context.template_domain] ?? DOMAIN_STYLES.general;
  const icon = DOMAIN_ICONS[context.template_domain] ?? 'bolt';

  const handleClear = () => {
    clearTemplateLaunchContext();
    onClear();
  };

  return (
    <div className={`flex items-center justify-between gap-4 px-4 py-2.5 rounded-xl border ${style.bg} ${style.border} mb-4`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${style.bg} border ${style.border}`}>
          <span className={`material-symbols-outlined text-[14px] ${style.text}`}>{icon}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-sans text-[10px] font-bold uppercase tracking-wider text-text-muted">Template Active</span>
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${style.bg} ${style.border} ${style.text}`}>
              <span className={`w-1 h-1 rounded-full inline-block ${style.dot}`} />
              {context.template_domain}
            </span>
          </div>
          <div className="font-sans text-sm font-semibold text-text-primary truncate">{context.template_name}</div>
        </div>
      </div>
      <button
        onClick={handleClear}
        title="Clear template context"
        className="shrink-0 text-text-muted hover:text-text-secondary transition-colors flex items-center gap-1 font-sans text-xs"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
        <span className="hidden sm:inline">Clear</span>
      </button>
    </div>
  );
}
