/**
 * WorkspaceSidebar — vertical workspace navigation.
 *
 * Dark rail aligned with header. Single-line labels, hints only in native
 * title tooltips. Active state: left accent + subtle surface (no stacked
 * marketing copy in the rail).
 */

import {
  LayoutDashboard,
  Settings,
  TrendingUp,
  Tag,
  Megaphone,
  FileText,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useEffect } from 'react';
import type { WorkspaceTab } from '../../types/navigation';

export const WORKSPACE_TABS: {
  id: WorkspaceTab;
  label: string;
  hint: string;
  icon: React.FC<{ className?: string }>;
}[] = [
  { id: 'overview',   label: 'Overview',   hint: 'Snapshot and workspace shortcuts', icon: LayoutDashboard },
  { id: 'operations', label: 'Operations', hint: 'Registration, location, and risk',   icon: Settings },
  { id: 'financial',  label: 'Finance',    hint: 'Funds, forecasts, and capital',      icon: TrendingUp },
  { id: 'pricing',    label: 'Pricing',    hint: 'Pricing and product copy',           icon: Tag },
  { id: 'marketing',  label: 'Marketing',  hint: 'Strategy and campaigns',             icon: Megaphone },
  { id: 'owner',      label: 'Reports',    hint: 'Exports and summaries',              icon: FileText },
];

interface WorkspaceSidebarProps {
  isMobileOpen: boolean;
  onMobileClose: () => void;
  companyName?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

function NavList({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  return (
    <nav aria-label="Workspace sections" className="flex flex-col gap-0.5 px-2 py-2">
      {WORKSPACE_TABS.map(({ id, label, hint, icon: Icon }) => (
          <NavLink
            key={id}
            to={`/workspace/${id}`}
            end
            onClick={onItemClick}
            title={collapsed ? `${label} — ${hint}` : hint}
            className={({ isActive }) => {
              const row = collapsed
                ? `justify-center px-0 py-2.5 min-h-[44px] ${
                    isActive
                      ? 'bg-primary-500/12 text-neutral-900 dark:bg-white/[0.09] dark:text-white'
                      : 'text-neutral-600 hover:bg-neutral-100/90 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-200'
                  }`
                : `gap-2.5 px-2.5 py-2 min-h-[40px] ${
                    isActive
                      ? 'bg-primary-500/10 text-neutral-900 border-l-2 border-l-primary-600 pl-[calc(0.625rem-2px)] dark:bg-white/[0.06] dark:text-white dark:border-l-primary-400'
                      : 'border-l-2 border-l-transparent text-neutral-600 hover:bg-neutral-100/80 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.04] dark:hover:text-neutral-200'
                  }`;
              return [
                'group relative flex items-center rounded-lg no-underline transition-colors duration-150',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#07070b]',
                row,
              ].join(' ');
            }}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={`shrink-0 h-[18px] w-[18px] ${
                    isActive
                      ? 'text-primary-600 dark:text-primary-300'
                      : 'text-neutral-500 group-hover:text-primary-600 dark:group-hover:text-neutral-300'
                  }`}
                  aria-hidden
                />

                {!collapsed && (
                  <span className="min-w-0 truncate text-[13px] font-medium tracking-tight">{label}</span>
                )}

                {collapsed && (
                  <span
                    className="
                  pointer-events-none absolute left-full ml-2.5 top-1/2 -translate-y-1/2 z-50
                  whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 py-1.5
                  text-[12px] font-medium text-neutral-800 shadow-lg backdrop-blur-sm
                  dark:border-white/[0.1] dark:bg-neutral-900/95 dark:text-neutral-100
                  opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100
                  translate-x-0.5 group-hover:translate-x-0 transition-[opacity,transform] duration-150
                "
                    role="tooltip"
                  >
                    {label}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
    </nav>
  );
}

function SidebarFooterNote() {
  return (
    <div className="mx-2 mb-2 mt-1 px-2.5 py-2 rounded-md border border-neutral-200/90 bg-white/70 dark:border-white/[0.06] dark:bg-black/25">
      <p className="text-[10px] leading-snug text-neutral-600 dark:text-neutral-500">
        Profile and drafts stay on this device.
      </p>
    </div>
  );
}

export default function WorkspaceSidebar({
  isMobileOpen,
  onMobileClose,
  companyName,
  isCollapsed,
  onToggleCollapse,
}: WorkspaceSidebarProps) {
  useEffect(() => {
    if (!isMobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onMobileClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isMobileOpen, onMobileClose]);

  useEffect(() => {
    if (!isMobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileOpen]);

  return (
    <>
      <aside
        aria-label="Workspace navigation"
        className={`
          hidden lg:flex fixed left-0 z-20 flex-col
          bg-white/95 backdrop-blur-xl border-r border-neutral-200
          dark:bg-[#07070b]/95 dark:border-white/[0.06]
          transition-[width] duration-200 ease-out
          ${isCollapsed ? 'w-16' : 'w-56 xl:w-60'}
        `}
        style={{ top: 'var(--header-h, 64px)', bottom: 0 }}
      >
        {!isCollapsed && companyName && (
          <div className="px-3 py-2.5 border-b border-neutral-200 dark:border-white/[0.06]">
            <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Company</p>
            <p className="text-sm font-medium text-neutral-900 truncate mt-0.5 leading-snug dark:text-white">
              {companyName}
            </p>
          </div>
        )}

        {isCollapsed && (
          <div className="h-px mx-2.5 my-2 bg-neutral-200 dark:bg-white/[0.08]" aria-hidden />
        )}

        <div className="flex-1 overflow-y-auto overflow-x-visible min-h-0">
          <NavList collapsed={isCollapsed} />
        </div>

        {!isCollapsed && <SidebarFooterNote />}

        <div className={`border-t border-white/[0.06] p-1.5 flex ${isCollapsed ? 'justify-center' : 'justify-end'}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!isCollapsed}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:hover:text-neutral-200 dark:hover:bg-white/[0.06] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" aria-hidden />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" aria-hidden />
            )}
          </button>
        </div>
      </aside>

      <div
        className={`lg:hidden fixed inset-0 z-50 transition-opacity duration-200 ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isMobileOpen}
      >
        <button
          type="button"
          className="absolute inset-0 bg-black/60"
          aria-label="Close navigation"
          onClick={onMobileClose}
          tabIndex={isMobileOpen ? 0 : -1}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
          className={`absolute inset-y-0 left-0 w-[min(85vw,17.5rem)] bg-white/98 backdrop-blur-xl border-r border-neutral-200 shadow-2xl flex flex-col transform transition-transform duration-200 ease-out dark:bg-[#07070b]/98 dark:border-white/[0.08] ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-neutral-200 dark:border-white/[0.08]">
            <div className="min-w-0 pr-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">Company</p>
              <p className="text-sm font-medium text-neutral-900 truncate mt-0.5 leading-snug dark:text-white">
                {companyName ?? 'SMEwise'}
              </p>
            </div>
            <button
              type="button"
              onClick={onMobileClose}
              className="p-2 shrink-0 rounded-lg hover:bg-neutral-100 text-neutral-500 hover:text-neutral-900 transition-colors dark:hover:bg-white/[0.06] dark:text-neutral-400 dark:hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <NavList collapsed={false} onItemClick={onMobileClose} />
          </div>

          <SidebarFooterNote />
        </aside>
      </div>
    </>
  );
}
