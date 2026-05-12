/**
 * WorkspaceNav — sticky section tab bar for the workspace.
 * Sits below the main header. All tabs visible on desktop;
 * horizontally scrollable on mobile.
 */

import { LayoutDashboard, Settings, TrendingUp, Tag, Megaphone, FileText } from 'lucide-react';
import type { WorkspaceTab } from '../../types/navigation';

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string; icon: React.FC<{ className?: string }> }[] = [
  { id: 'overview',    label: 'Overview',    icon: LayoutDashboard },
  { id: 'operations',  label: 'Operations',  icon: Settings },
  { id: 'financial',   label: 'Finance',     icon: TrendingUp },
  { id: 'pricing',     label: 'Pricing',     icon: Tag },
  { id: 'marketing',   label: 'Marketing',   icon: Megaphone },
  { id: 'owner',       label: 'Reports',     icon: FileText },
];

interface WorkspaceNavProps {
  activeTab: WorkspaceTab;
  onTabChange: (tab: WorkspaceTab) => void;
}

export default function WorkspaceNav({ activeTab, onTabChange }: WorkspaceNavProps) {
  return (
    <nav
      className="bg-white border-t border-neutral-200"
      aria-label="Workspace sections"
    >
      {/* Scrollable on mobile, full-width on desktop */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div
          className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-1.5"
          role="tablist"
        >
          {WORKSPACE_TABS.map(({ id, label, icon: Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(id)}
                className={`
                  flex items-center gap-2 whitespace-nowrap px-3.5 py-2 rounded-xl text-sm font-semibold
                  transition-all duration-150 shrink-0
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1
                  ${isActive
                    ? 'bg-neutral-950 text-white'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-neutral-100'
                  }
                `}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
