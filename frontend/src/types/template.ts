// frontend/src/types/template.ts
// Phase 4.20 — Shared template launch context type

export type TemplateDomain = 'clinical' | 'legal' | 'code' | 'general';
export type TargetWorkbench = 'clinical' | 'legal' | 'code' | 'analyze';
export type LaunchMode = 'document_required' | 'document_optional' | 'code_input';

export interface TemplateListItem {
  id: string;
  slug: string;
  name: string;
  description: string;
  domain: TemplateDomain;
  target_workbench: TargetWorkbench;
  launch_mode: LaunchMode;
  badge_label: string;
  icon: string;
  default_instructions: string;
  expected_domain_hint?: string | null;
}

export interface TemplateLaunchContext {
  template_id: string;
  template_name: string;
  template_domain: TemplateDomain;
  target_workbench: TargetWorkbench;
  launch_mode: LaunchMode;
  document_id?: string | null;
  document_name?: string | null;
  default_instructions: string;
  default_analysis_mode?: string | null;
  expected_domain_hint?: string | null;
}

// ---------------------------------------------------------------------------
// Session storage key for refresh resilience
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'proxima_template_launch_context';

export function saveTemplateLaunchContext(ctx: TemplateLaunchContext): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch { /* empty */ }
}

export function loadTemplateLaunchContext(): TemplateLaunchContext | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as TemplateLaunchContext) : null;
  } catch {
    return null;
  }
}

export function clearTemplateLaunchContext(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch { /* empty */ }
}
