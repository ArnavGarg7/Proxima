import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface ComingSoonProps {
  /** Material symbol representing the module */
  icon: string;
  title: string;
  description: string;
  /** Planned capabilities, shown as a checklist */
  capabilities: string[];
  /** Optional back action */
  onBack?: () => void;
  backLabel?: string;
}

/**
 * ComingSoon — a polished placeholder for analyzer modules that intentionally
 * await backend implementation. Built from the existing Card/Badge/Button
 * primitives and mirrors AnalysisEmptyState's language, so an unfinished feature
 * still reads as an intentional part of the product rather than a broken page.
 */
export function ComingSoon({
  icon,
  title,
  description,
  capabilities,
  onBack,
  backLabel = 'Back',
}: ComingSoonProps) {
  return (
    <div className="flex flex-1 items-center justify-center bg-void px-5 py-12 min-h-[calc(100vh-60px)]">
      <div className="w-full max-w-[560px]">
        <Card variant="info" className="flex flex-col gap-6">

          {/* Identity */}
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface">
              <span
                className="material-symbols-outlined text-[32px] text-gold-primary"
                style={{ fontVariationSettings: "'FILL' 1" }}
                aria-hidden="true"
              >
                {icon}
              </span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Badge variant="warning" size="sm">Coming Soon</Badge>
              <h1 className="font-display text-2xl font-semibold text-text-primary">{title}</h1>
              <p className="mx-auto max-w-md font-sans text-sm leading-relaxed text-text-secondary">
                {description}
              </p>
            </div>
          </div>

          {/* Planned capabilities */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4">
            <span className="font-sans text-[10px] font-medium uppercase tracking-widest text-text-muted">
              Planned capabilities
            </span>
            <ul className="flex flex-col gap-2">
              {capabilities.map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold-primary/30 bg-gold-primary/10">
                    <span className="material-symbols-outlined text-[11px] text-gold-primary" aria-hidden="true">
                      bolt
                    </span>
                  </span>
                  <span className="font-sans text-xs text-text-secondary">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {onBack && (
            <Button
              variant="secondary"
              onClick={onBack}
              className="w-full"
              leftIcon={
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  arrow_back
                </span>
              }
            >
              {backLabel}
            </Button>
          )}
        </Card>
      </div>
    </div>
  );
}
