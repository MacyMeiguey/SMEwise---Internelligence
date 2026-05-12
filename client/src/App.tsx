/**
 * App — Multi-view SPA with proper workspace navigation
 *
 * Views:
 *   landing    → public landing page (always reachable via logo click)
 *   onboarding → profile wizard
 *   workspace  → tabbed workspace (overview + 5 section tabs)
 */

import { useState, useEffect } from 'react';
import type { BusinessProfile } from './types';
import type { AppView, WorkspaceTab } from './types/navigation';
import { loadProfile, saveProfile } from './utils/storage';

import HeroSection from './components/hero/HeroSection';
import ProfileWizard from './components/profile/ProfileWizard';
import InsightsDashboard from './components/dashboard/InsightsDashboard';
import Dashboard from './components/Dashboard';
import AIAssistantPanel from './components/assistant/AIAssistantPanel';
import WorkspaceNav, { WORKSPACE_TABS } from './components/workspace/WorkspaceNav';
import { LoadingProvider } from './context/LoadingContext';

// Map workspace tab id → Dashboard section title
const TAB_TO_SECTION: Record<WorkspaceTab, string> = {
  overview:   'Overview',
  operations: 'Operations',
  financial:  'Financial Planning',
  pricing:    'Pricing Strategy',
  marketing:  'Marketing',
  owner:      'Owner Tools',
};

// ── Header height CSS variable so WorkspaceNav can offset correctly ───────────
function setHeaderHeight(el: HTMLElement | null) {
  if (!el) return;
  document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
}

// ─────────────────────────────────────────────────────────────────────────────

function AppContent() {
  const [view, setView]               = useState<AppView>('landing');
  const [activeTab, setActiveTab]     = useState<WorkspaceTab>('overview');
  const [profile, setProfile]         = useState<BusinessProfile | null>(null);
  const [headerEl, setHeaderEl]       = useState<HTMLElement | null>(null);

  // Restore profile on mount
  useEffect(() => {
    const saved = loadProfile();
    if (saved) {
      setProfile(saved);
      setView('workspace');
    }
  }, []);

  // Keep --header-h in sync with actual header height
  useEffect(() => {
    if (!headerEl) return;
    const ro = new ResizeObserver(() => setHeaderHeight(headerEl));
    ro.observe(headerEl);
    setHeaderHeight(headerEl);
    return () => ro.disconnect();
  }, [headerEl]);

  // Scroll to top on view/tab change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view, activeTab]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const goLanding    = () => setView('landing');
  const goOnboarding = () => setView('onboarding');
  const goWorkspace  = (tab: WorkspaceTab = 'overview') => {
    setActiveTab(tab);
    setView('workspace');
  };

  const handleProfileSubmit = (submitted: BusinessProfile) => {
    saveProfile(submitted);
    setProfile(submitted);
    goWorkspace('overview');
  };

  const handleTabChange = (tab: WorkspaceTab) => {
    setActiveTab(tab);
  };

  // When user clicks a bento card, jump to that section tab
  const handleViewDetails = (sectionTitle: string) => {
    const entry = Object.entries(TAB_TO_SECTION).find(([, v]) => v === sectionTitle);
    if (entry) goWorkspace(entry[0] as WorkspaceTab);
  };

  // Section label for the AI advisor
  const advisorSection = TAB_TO_SECTION[activeTab];

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* ══════════════════════════════════════════════
          HEADER — always visible
      ══════════════════════════════════════════════ */}
      <header
        ref={setHeaderEl}
        className="sticky top-0 z-30 bg-white border-b-2 border-neutral-950"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-4">

            {/* Logo — always goes to landing */}
            <button
              type="button"
              onClick={goLanding}
              className="flex items-center gap-3 min-w-0 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-lg"
              aria-label="Go to home"
            >
              <img
                src="/smewise-logo.png"
                alt="SMEwise"
                className="h-10 sm:h-12 w-auto max-w-[min(220px,55vw)] object-contain object-left"
                loading="eager"
                decoding="async"
              />
            </button>

            {/* Right side actions */}
            <div className="flex items-center gap-3 shrink-0">
              {view === 'workspace' && profile && (
                <>
                  {/* Company name — visible on larger screens */}
                  <span className="hidden sm:inline text-sm text-neutral-500 font-medium border-r-2 border-neutral-200 pr-3 max-w-[160px] truncate">
                    {profile.companyName}
                  </span>
                  <button
                    type="button"
                    onClick={goOnboarding}
                    className="btn-ghost text-sm py-1.5 px-3.5 rounded-lg"
                  >
                    Edit profile
                  </button>
                </>
              )}

              {view === 'onboarding' && (
                <button
                  type="button"
                  onClick={profile ? () => goWorkspace() : goLanding}
                  className="text-sm font-semibold text-neutral-600 hover:text-neutral-950 underline underline-offset-2"
                >
                  ← {profile ? 'Back to workspace' : 'Back to home'}
                </button>
              )}

              {view === 'landing' && !profile && (
                <button
                  type="button"
                  onClick={goOnboarding}
                  className="btn-primary text-sm py-2 px-4 rounded-xl"
                >
                  Get started
                </button>
              )}

              {view === 'landing' && profile && (
                <button
                  type="button"
                  onClick={() => goWorkspace()}
                  className="btn-primary text-sm py-2 px-4 rounded-xl"
                >
                  My workspace
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Workspace tab bar — rendered inside sticky header so it scrolls with it */}
        {view === 'workspace' && profile && (
          <WorkspaceNav activeTab={activeTab} onTabChange={handleTabChange} />
        )}
      </header>


      {/* ══════════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════════ */}

      {/* ── Landing ── */}
      {view === 'landing' && (
        <main className="flex-1">
          <HeroSection
            profile={profile}
            onGetStarted={goOnboarding}
            onGoToWorkspace={() => goWorkspace()}
          />
          <LandingFooter />
        </main>
      )}

      {/* ── Onboarding ── */}
      {view === 'onboarding' && (
        <main className="flex-1">
          <ProfileWizard
            onSubmit={handleProfileSubmit}
            initialProfile={profile}
          />
        </main>
      )}

      {/* ── Workspace ── */}
      {view === 'workspace' && profile && (
        <main className={`flex-1 ${activeTab !== 'overview' ? 'lg:pr-[26rem] xl:pr-[28rem]' : 'lg:pr-[26rem] xl:pr-[28rem]'}`}>

          {/* Overview tab → InsightsDashboard */}
          {activeTab === 'overview' && (
            <InsightsDashboard
              profile={profile}
              onViewDetails={handleViewDetails}
            />
          )}

          {/* Tool tabs → Dashboard (all sections mounted, only active one visible) */}
          {activeTab !== 'overview' && (
            <div className="bg-neutral-50 py-8 sm:py-10 min-h-[60vh]">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
                <p className="eyebrow mb-2">
                  {WORKSPACE_TABS.find(t => t.id === activeTab)?.label}
                </p>
                <h1 className="text-2xl sm:text-3xl font-bold text-neutral-950">
                  {TAB_TO_SECTION[activeTab]}
                </h1>
                <p className="mt-2 text-sm text-neutral-600 max-w-2xl">
                  Press <strong className="text-neutral-950">Generate all</strong> to run every card, or generate
                  individual ones. Results stay until you regenerate.
                </p>
              </div>
              <Dashboard
                profile={profile}
                isUnlocked={true}
                activeSection={TAB_TO_SECTION[activeTab]}
                onSectionNavigate={() => {}}
              />
            </div>
          )}

          {/* AI advisor — always visible in workspace */}
          <AIAssistantPanel profile={profile} currentSection={advisorSection} />
        </main>
      )}

    </div>
  );
}

// ── Landing footer ────────────────────────────────────────────────────────────

function LandingFooter() {
  return (
    <footer className="border-t-2 border-neutral-950 bg-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/smewise-logo.png" alt="SMEwise" className="h-7 w-auto opacity-80" />
            <span className="text-xs text-neutral-500">© 2026 · For Malaysian SMEs</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-500">
            {['Privacy', 'Terms', 'Support'].map((l) => (
              <a key={l} href="#" className="hover:text-neutral-950 transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}
