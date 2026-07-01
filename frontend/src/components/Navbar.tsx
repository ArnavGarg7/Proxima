import { Link } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import proximaLogo from '@/assets/proxima-logo.png';

interface NavbarProps {
  onMenuClick: () => void;
  isDrawerOpen: boolean;
}

export default function Navbar({ onMenuClick, isDrawerOpen }: NavbarProps) {
  const { user, logout } = useAuthStore();

  return (
    <header className="flex h-[60px] shrink-0 items-center border-b border-border bg-surface px-4 sm:px-6">
      {/* Left: hamburger (mobile) + brand (mobile) */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className={cn(
            'flex md:hidden h-9 w-9 items-center justify-center rounded-lg',
            'text-text-secondary hover:text-text-primary hover:bg-white/5',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
          )}
          onClick={onMenuClick}
          aria-expanded={isDrawerOpen}
          aria-controls="app-sidebar"
          aria-label="Toggle navigation"
        >
          <span className="material-symbols-outlined text-[22px]" aria-hidden="true">
            {isDrawerOpen ? 'close' : 'menu'}
          </span>
        </button>
        {/* Brand visible on mobile only — sidebar carries it on tablet+ */}
        <span className="flex items-center gap-2 md:hidden">
          <img src={proximaLogo} alt="" aria-hidden="true" className="h-6 w-auto shrink-0" />
          <span className="brand-wordmark text-lg">
            Proxima
          </span>
        </span>
      </div>

      {/* Right: admin link · email · sign out */}
      <div className="ml-auto flex items-center gap-3">
        {user?.role === 'admin' && (
          <Link
            to="/admin"
            className="hidden sm:block text-xs bg-red-900/30 text-red-400 px-3 py-1.5 rounded border border-red-900 hover:bg-red-900/50 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
          >
            Admin
          </Link>
        )}
        <span className="hidden sm:block text-sm text-text-muted truncate max-w-[200px]">
          {user?.email}
        </span>
        <Button variant="ghost" size="sm" onClick={logout}>
          Sign Out
        </Button>
      </div>
    </header>
  );
}
