import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/cn';

interface AppSidebarProps {
  isDrawerOpen: boolean;
  onClose: () => void;
}

const NAV_GROUPS = [
  {
    label: 'Main',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: 'dashboard' },
      { label: 'Workspace', to: '/workspace', icon: 'folder_open' },
      { label: 'Templates', to: '/templates', icon: 'auto_awesome' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Analyze',      to: '/analyze',  icon: 'analytics' },
      { label: 'Legal',        to: '/legal',    icon: 'gavel' },
      { label: 'Clinical',     to: '/clinical', icon: 'medical_services' },
      { label: 'Compare',      to: '/compare',  icon: 'compare_arrows' },
      { label: 'Audit',        to: '/audit',    icon: 'fact_check' },
      { label: 'Code Suite',   to: '/code',     icon: 'code' },
      { label: 'Domain Radar', to: '/radar',    icon: 'radar' },
    ],
  },
] as const;

export function AppSidebar({ isDrawerOpen, onClose }: AppSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const location = useLocation();

  // Close drawer when the active route changes
  useEffect(() => {
    onClose();
  }, [location.pathname, onClose]);

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen, onClose]);

  return (
    <>
      {/* Backdrop — mobile only */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden',
          'motion-safe:transition-opacity motion-safe:duration-300',
          isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Sidebar */}
      <aside
        id="app-sidebar"
        aria-label="Application navigation"
        className={cn(
          // Mobile: fixed overlay that slides in from the left
          'fixed inset-y-0 left-0 z-50 flex flex-col bg-surface border-r border-border',
          // Always 240px on mobile (drawer)
          'w-[240px]',
          // Mobile slide transform
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full',
          // Tablet+: in-flow, override the mobile transform
          'md:static md:translate-x-0',
          // Tablet: collapsed = icon-rail (64px); expanded or desktop = full (240px)
          isCollapsed ? 'md:w-16 lg:w-[240px]' : 'md:w-[240px]',
          // Animated (only when user allows motion)
          'motion-safe:transition-[transform,width] motion-safe:duration-300',
        )}
      >
        {/* Brand header — matches AppHeader height exactly */}
        <div
          className={cn(
            'flex h-[60px] shrink-0 items-center border-b border-border px-4',
            isCollapsed && 'md:justify-center md:px-0 lg:justify-start lg:px-4',
          )}
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-gold-bright to-gold-dim shadow-[0_0_12px_rgba(201,168,76,0.35)]">
            <span
              className="material-symbols-outlined text-[15px] text-void"
              style={{ fontVariationSettings: "'FILL' 1" }}
              aria-hidden="true"
            >
              blur_on
            </span>
          </span>
          <span
            className={cn(
              'ml-3 font-display text-lg font-semibold text-gold-primary whitespace-nowrap',
              isCollapsed && 'md:hidden lg:block',
            )}
          >
            Proxima
          </span>
        </div>

        {/* Navigation */}
        <nav
          aria-label="Main navigation"
          className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2 space-y-5"
        >
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="flex flex-col gap-0.5">
              {/* Group label */}
              <span
                className={cn(
                  'text-[10px] font-medium uppercase tracking-widest text-text-muted px-2 py-1',
                  isCollapsed && 'md:hidden lg:block',
                )}
              >
                {group.label}
              </span>

              {/* Items */}
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-2 py-2 rounded-lg text-sm',
                      'motion-safe:transition-colors motion-safe:duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
                      isActive
                        ? 'bg-gold-primary/10 text-gold-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5',
                      isCollapsed && 'md:justify-center lg:justify-start',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <span
                        className="material-symbols-outlined text-[20px] shrink-0"
                        style={isActive ? { fontVariationSettings: "'FILL' 1" } : undefined}
                        aria-hidden="true"
                      >
                        {item.icon}
                      </span>
                      <span className={cn('truncate', isCollapsed && 'md:hidden lg:block')}>
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse toggle — tablet only (md, not lg+) */}
        <div className="shrink-0 border-t border-border p-2">
          <button
            type="button"
            onClick={() => setIsCollapsed((c) => !c)}
            className={cn(
              'hidden md:flex lg:hidden w-full items-center justify-center h-9 rounded-lg',
              'text-text-muted hover:text-text-primary hover:bg-white/5',
              'motion-safe:transition-colors motion-safe:duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary/50',
            )}
            aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          >
            <span className="material-symbols-outlined text-[20px]" aria-hidden="true">
              {isCollapsed ? 'chevron_right' : 'chevron_left'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
}
