/**
 * SectionTabBar — mobile bottom nav for generator sections.
 */

interface SectionTabBarProps {
  activeSection: string;
  onTabClick: (sectionTitle: string) => void;
}

const TABS = [
  { sectionTitle: 'Operations', label: 'Setup', id: 'section-operations' },
  { sectionTitle: 'Financial Planning', label: 'Money', id: 'section-financial-planning' },
  { sectionTitle: 'Pricing Strategy', label: 'Price', id: 'section-pricing-strategy' },
  { sectionTitle: 'Marketing', label: 'Grow', id: 'section-marketing' },
  { sectionTitle: 'Owner Tools', label: 'Reports', id: 'section-owner-tools' },
] as const;

export default function SectionTabBar({ activeSection, onTabClick }: SectionTabBarProps) {
  function navigate(tab: (typeof TABS)[number]) {
    onTabClick(tab.sectionTitle);
    document.getElementById(tab.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-200/90 pb-[env(safe-area-inset-bottom)] dark:bg-[#0c0c10] dark:border-white/[0.07]"
      aria-label="Generator sections"
    >
      <div className="flex items-stretch max-w-lg mx-auto px-1.5 py-1.5 gap-0.5">
        {TABS.map((tab) => {
          const isActive = activeSection === tab.sectionTitle;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab)}
              title={tab.sectionTitle}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 rounded-lg py-2 px-0.5 text-[10px] sm:text-[11px] font-medium tracking-tight transition-colors
                ${
                  isActive
                    ? 'bg-primary-50 text-primary-800 dark:bg-primary-500/15 dark:text-primary-200'
                    : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-white/[0.05]'
                }`}
              aria-label={tab.sectionTitle}
              aria-current={isActive ? 'page' : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
