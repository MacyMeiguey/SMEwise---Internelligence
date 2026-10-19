/**
 * WorkspaceSidebar — vertical workspace navigation.
 *
 * Quiet product rail: solid surface, company identity, clear active state.
 * Collapsed mode shows icon + floating label tooltip.
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

/** One or two letters for the avatar — "Mcd" → "Mc", "Acme Foods" → "AF". */
function companyInitials(name?: string) {
  const trimmed = name?.trim();
  if (!trimmed) return 'S';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
  }
  return trimmed.slice(0, Math.min(2, trimmed.length)).toUpperCase();
}

function NavList({
  collapsed,
  onItemClick,
}: {
  collapsed: boolean;
  onItemClick?: () => void;
}) {
  return (
    <nav aria-label="Workspace sections" className="flex flex-col gap-1 px-2.5 py-3">
      {!collapsed && (
        <p className="px-2.5 mb-1.5 text-[11px] font-medium text-neutral-400 dark:text-neutral-500">
          Navigate
        </p>
      )}
      {WORKSPACE_TABS.map(({ id, label, hint, icon: Icon }) => (
        <NavLink
          key={id}
          to={`/workspace/${id}`}
          end
          onClick={onItemClick}
          title={collapsed ? `${label} — ${hint}` : hint}
          className={({ isActive }) => {
            const base =
              'group relative flex items-center rounded-lg no-underline transition-[background-color,color,box-shadow] duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#0c0c10]';
            if (collapsed) {
              return `${base} justify-center mx-auto h-10 w-10 ${
                isActive
                  ? 'bg-primary-600 text-white shadow-sm shadow-primary-600/25'
                  : 'text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.06] dark:hover:text-neutral-100'
              }`;
            }
            return `${base} gap-3 px-2.5 py-2 min-h-[42px] ${
              isActive
                ? 'bg-primary-50 text-neutral-900 dark:bg-primary-500/15 dark:text-white'
                : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-white/[0.045] dark:hover:text-neutral-100'
            }`;
          }}
        >
          {({ isActive }) => (
            <>
              {collapsed ? (
                <Icon className="h-[17px] w-[17px]" aria-hidden />
              ) : (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                    isActive
                      ? 'bg-primary-600 text-white'
                      : 'bg-neutral-100 text-neutral-500 group-hover:bg-neutral-200/80 group-hover:text-neutral-700 dark:bg-white/[0.06] dark:text-neutral-400 dark:group-hover:bg-white/[0.09] dark:group-hover:text-neutral-200'
                  }`}
                >
                  <Icon className="h-[15px] w-[15px]" aria-hidden />
                </span>
              )}

              {!collapsed && (
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium tracking-tight">
                  {label}
                </span>
              )}

              {!collapsed && isActive && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-500 dark:bg-primary-400"
                  aria-hidden
                />
              )}

              {collapsed && (
                <span
                  className="
                    pointer-events-none absolute left-full ml-3 top-1/2 z-50 -translate-y-1/2
                    whitespace-nowrap rounded-md border border-neutral-200 bg-white px-2.5 py-1.5
                    text-[12px] font-medium text-neutral-800 shadow-md
                    opacity-0 translate-x-1 transition-[opacity,transform] duration-150
                    group-hover:opacity-100 group-hover:translate-x-0
                    group-focus-visible:opacity-100 group-focus-visible:translate-x-0
                    dark:border-white/[0.1] dark:bg-[#14141c] dark:text-neutral-100
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

function CompanyHeader({
  companyName,
  onClose,
}: {
  companyName?: string;
  onClose?: () => void;
}) {
  const name = companyName?.trim() || 'SMEwise';
  const initials = companyInitials(name);

  return (
    <div className="p-2.5 border-b border-neutral-200/80 dark:border-white/[0.07]">
      <div className="relative flex items-center gap-3 rounded-xl bg-neutral-50 px-2.5 py-2.5 dark:bg-white/[0.04]">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-neutral-200/90 bg-white text-[13px] font-semibold tracking-tight text-neutral-800 dark:border-white/[0.1] dark:bg-[#14141c] dark:text-neutral-100"
          aria-hidden
        >
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className="text-[13px] font-semibold text-neutral-900 truncate leading-snug dark:text-white"
            title={name}
          >
            {name}
          </p>
          <p className="mt-0.5 text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
            Your workspace
          </p>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-1.5 right-1.5 p-1.5 rounded-md text-neutral-400 hover:bg-neutral-200/70 hover:text-neutral-800 transition-colors dark:hover:bg-white/[0.08] dark:hover:text-white"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SidebarFooterNote() {
  return (
    <p className="px-4 pb-2 text-[11px] leading-relaxed text-neutral-400 dark:text-neutral-500">
      Profile and drafts stay on this device.
    </p>
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
        id="workspace-sidebar"
        aria-label="Workspace navigation"
        className={`
          hidden lg:flex fixed left-0 z-20 flex-col
          bg-white border-r border-neutral-200/90
          dark:bg-[#0c0c10] dark:border-white/[0.07]
          transition-[width] duration-200 ease-out
          ${isCollapsed ? 'w-16' : 'w-60'}
        `}
        style={{ top: 'var(--header-h, 64px)', bottom: 0 }}
      >
        {!isCollapsed ? (
          <CompanyHeader companyName={companyName} />
        ) : (
          <div className="flex items-center justify-center py-3 border-b border-neutral-200/80 dark:border-white/[0.07]">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-neutral-200/90 bg-neutral-50 text-[11px] font-semibold tracking-tight text-neutral-800 dark:border-white/[0.1] dark:bg-white/[0.04] dark:text-neutral-100"
              title={companyName?.trim() || 'SMEwise'}
              aria-hidden
            >
              {companyInitials(companyName)}
            </span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-visible min-h-0">
          <NavList collapsed={isCollapsed} />
        </div>

        {!isCollapsed && <SidebarFooterNote />}

        <div
          className={`border-t border-neutral-200/80 dark:border-white/[0.07] p-2 flex ${
            isCollapsed ? 'justify-center' : 'justify-between items-center gap-2'
          }`}
        >
          {!isCollapsed && (
            <span className="pl-1.5 text-[11px] text-neutral-400 dark:text-neutral-500">
              Sidebar
            </span>
          )}
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
          className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
          aria-label="Close navigation"
          onClick={onMobileClose}
          tabIndex={isMobileOpen ? 0 : -1}
        />

        <aside
          role="dialog"
          aria-modal="true"
          aria-label="Workspace navigation"
          className={`absolute inset-y-0 left-0 w-[min(88vw,18rem)] bg-white border-r border-neutral-200 shadow-xl flex flex-col transform transition-transform duration-200 ease-out dark:bg-[#0c0c10] dark:border-white/[0.08] ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <CompanyHeader companyName={companyName} onClose={onMobileClose} />

          <div className="flex-1 overflow-y-auto min-h-0">
            <NavList collapsed={false} onItemClick={onMobileClose} />
          </div>

          <SidebarFooterNote />
        </aside>
      </div>
    </>
  );
}
