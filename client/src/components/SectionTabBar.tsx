/**
 * SectionTabBar — mobile-only bottom navigation for generator sections
 */

interface SectionTabBarProps {
  activeSection: string;
  onTabClick: (sectionTitle: string) => void;
}

const TABS = [
  { sectionTitle: "Operations",       label: "Setup",   id: "section-operations" },
  { sectionTitle: "Financial Planning", label: "Money",  id: "section-financial-planning" },
  { sectionTitle: "Pricing Strategy", label: "Price",   id: "section-pricing-strategy" },
  { sectionTitle: "Marketing",        label: "Grow",    id: "section-marketing" },
  { sectionTitle: "Owner Tools",      label: "Reports", id: "section-owner-tools" },
] as const;

export default function SectionTabBar({ activeSection, onTabClick }: SectionTabBarProps) {
  function navigate(tab: (typeof TABS)[number]) {
    onTabClick(tab.sectionTitle);
    document.getElementById(tab.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-neutral-950 pb-[env(safe-area-inset-bottom)]"
      aria-label="Generator sections"
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {TABS.map((tab) => {
          const isActive = activeSection === tab.sectionTitle;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => navigate(tab)}
              title={tab.sectionTitle}
              className={`flex flex-col items-center justify-center flex-1 min-w-0 py-2.5 px-0.5 text-[10px] sm:text-[11px] font-bold tracking-tight border-t-2 transition-colors
                ${isActive
                  ? "border-neutral-950 bg-primary-100 text-primary-800"
                  : "border-transparent text-neutral-500 hover:text-neutral-900"
                }`}
              aria-label={tab.sectionTitle}
              aria-current={isActive ? "page" : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
