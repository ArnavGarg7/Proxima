import { Link } from 'react-router-dom';

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-void p-4">
      <div className="max-w-md w-full bg-surface rounded-2xl shadow-card-raised p-8 text-center border border-border">
        {/* Ringed status icon — matches the product's empty/error treatment */}
        <div className="relative mx-auto mb-6 flex items-center justify-center w-16 h-16">
          <div className="absolute w-16 h-16 rounded-full border border-conf-critical/20" />
          <div className="absolute w-11 h-11 rounded-full border border-conf-critical/30 bg-conf-critical/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-[22px] text-conf-critical" aria-hidden="true">
              gpp_maybe
            </span>
          </div>
        </div>

        <h1 className="font-display text-2xl font-semibold text-text-primary mb-2">Access Denied</h1>
        <p className="font-sans text-sm text-text-secondary leading-relaxed mb-8">
          You do not have the required permissions to access this administrative area.
        </p>

        <Link
          to="/workspace"
          className="inline-flex w-full justify-center items-center gap-2 px-6 py-3 rounded font-sans text-sm font-medium
            bg-gold-primary text-void shadow-[0_1px_3px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.18)]
            hover:bg-gold-bright transition-colors duration-150
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50 focus-visible:ring-offset-1 focus-visible:ring-offset-void"
        >
          <span className="material-symbols-outlined text-[17px]" aria-hidden="true">arrow_back</span>
          Return to Workspace
        </Link>
      </div>
    </div>
  );
}
