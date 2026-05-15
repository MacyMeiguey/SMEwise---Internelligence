/**
 * App — SPA with URL-backed navigation (React Router)
 *
 * Routes:
 *   /                     → Landing
 *   /onboarding           → Profile wizard
 *   /workspace/:tab       → Workspace (overview, operations, …)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation, matchPath, Navigate, Link } from 'react-router-dom';
import { Menu, Moon, Sun, Monitor } from 'lucide-react';
import type { BusinessProfile } from './types';
import type { WorkspaceTab } from './types/navigation';
import { loadProfile, saveProfile } from './utils/storage';

import HeroSection from './components/hero/HeroSection';
import ProfileWizard from './components/profile/ProfileWizard';
import InsightsDashboard from './components/dashboard/InsightsDashboard';
import Dashboard from './components/Dashboard';
import AIAssistantPanel from './components/assistant/AIAssistantPanel';
import WorkspaceSidebar from './components/workspace/WorkspaceSidebar';
import LandingStage3D from './components/three/LandingStage3D';
import SplashScreen, { hasShownSplash } from './components/SplashScreen';
import ScrollProgressBar from './components/hero/ScrollProgressBar';
import SectionDotNav from './components/hero/SectionDotNav';
import BackToTop from './components/hero/BackToTop';
import LogoWordmark from './components/shared/LogoWordmark';
import { LoadingProvider } from './context/LoadingContext';
import { useTheme, useWorkspaceHtmlTheme } from './context/ThemeContext';

// Map workspace tab id → Dashboard section title
const TAB_TO_SECTION: Record<WorkspaceTab, string> = {
  overview:   'Overview',
  operations: 'Operations',
  financial:  'Financial Planning',
  pricing:    'Pricing Strategy',
  marketing:  'Marketing',
  owner:      'Owner Tools',
};

function isWorkspaceTabId(id: string): id is WorkspaceTab {
  return Object.prototype.hasOwnProperty.call(TAB_TO_SECTION, id);
}

function setHeaderHeight(el: HTMLElement | null) {
  if (!el) return;
  document.documentElement.style.setProperty('--header-h', `${el.offsetHeight}px`);
}

function AppContent() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { preference, effective, cyclePreference } = useTheme();
  useWorkspaceHtmlTheme(pathname);

  const [profile, setProfile]  = useState<BusinessProfile | null>(null);
  const [headerEl, setHeaderEl] = useState<HTMLElement | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [splashDone, setSplashDone] = useState<boolean>(() => hasShownSplash());
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    try { return window.localStorage.getItem('smewise:sidebar-collapsed') === '1'; }
    catch { return false; }
  });

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try { window.localStorage.setItem('smewise:sidebar-collapsed', next ? '1' : '0'); }
      catch { /* ignore */ }
      return next;
    });
  };
  const [assistantCollapsed, setAssistantCollapsed] = useState<boolean>(() => {
    try {
      return window.localStorage.getItem('smewise:assistant-collapsed') === '1';
    } catch {
      return false;
    }
  });

  const toggleAssistant = () => {
    setAssistantCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem('smewise:assistant-collapsed', next ? '1' : '0');
      } catch {
        // ignore quota/private-mode storage errors
      }
      return next;
    });
  };

  const workspaceMatch = matchPath({ path: '/workspace/:tab', end: true }, pathname);
  const rawTab           = workspaceMatch?.params.tab;
  const workspaceTabOk   = rawTab && isWorkspaceTabId(rawTab) ? rawTab : null;

  useEffect(() => {
    const saved = loadProfile();
    if (saved) setProfile(saved);
    const booted = sessionStorage.getItem('smewiseBoot');
    if (!booted) {
      sessionStorage.setItem('smewiseBoot', '1');
      if (saved && window.location.pathname === '/') {
        navigate('/workspace/overview', { replace: true });
      }
    }
  }, [navigate]);

  useEffect(() => {
    if (!headerEl) return;
    const ro = new ResizeObserver(() => setHeaderHeight(headerEl));
    ro.observe(headerEl);
    setHeaderHeight(headerEl);
    return () => ro.disconnect();
  }, [headerEl]);

  const showWorkspaceChrome = Boolean(profile && workspaceTabOk);

  const view =
    pathname === '/' ? 'landing' :
      pathname === '/onboarding' ? 'onboarding' :
        showWorkspaceChrome ? 'workspace' :
          pathname.startsWith('/workspace') ? 'workspace' :
            'landing';

  const activeTab: WorkspaceTab =
    showWorkspaceChrome && workspaceTabOk ? workspaceTabOk : 'overview';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [view]);

  // Dark scrollbar on <html> for landing + workspace so it matches the UI chrome.
  useEffect(() => {
    const root = document.documentElement;
    if (view === 'landing' || showWorkspaceChrome || view === 'onboarding') root.classList.add('app-deep-scrollbar');
    else root.classList.remove('app-deep-scrollbar');
    return () => root.classList.remove('app-deep-scrollbar');
  }, [view, showWorkspaceChrome]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setSidebarOpen(false);
  }, [activeTab]);

  const goLanding    = () => navigate('/');
  const goOnboarding = () => navigate('/onboarding');
  const goWorkspace  = (tab: WorkspaceTab = 'overview') => navigate(`/workspace/${tab}`);

  const handleProfileSubmit = (submitted: BusinessProfile) => {
    saveProfile(submitted);
    setProfile(submitted);
    goWorkspace('overview');
  };

  /**
   * Persists the human-readable fund allocation summary onto the active profile
   * (and into localStorage). Marketing Strategy and Revenue Projection both use
   * this value as input, so keeping it on the profile lets future runs pick up
   * the allocation without re-running Fund Allocation first.
   */
  const handleFundAllocationSummary = (summary: string) => {
    setProfile((prev) => {
      if (!prev) return prev;
      if (prev.fundAllocation === summary) return prev;
      const next = { ...prev, fundAllocation: summary };
      saveProfile(next);
      return next;
    });
  };

  const handleViewDetails = (sectionTitle: string) => {
    const entry = Object.entries(TAB_TO_SECTION).find(([, v]) => v === sectionTitle);
    if (entry) goWorkspace(entry[0] as WorkspaceTab);
  };

  const advisorSection = TAB_TO_SECTION[activeTab];

  if (!profile && pathname.startsWith('/workspace')) {
    return <Navigate to="/" replace />;
  }

  if (profile && (pathname === '/workspace' || pathname === '/workspace/')) {
    return <Navigate to="/workspace/overview" replace />;
  }

  if (profile && pathname.startsWith('/workspace/') && workspaceMatch && rawTab && !workspaceTabOk) {
    return <Navigate to="/workspace/overview" replace />;
  }

  if (pathname !== '/' && pathname !== '/onboarding' && !pathname.startsWith('/workspace')) {
    return <Navigate to="/" replace />;
  }

  const isLanding = view === 'landing';
  const isOnboarding = view === 'onboarding';
  // Dark header on landing + onboarding; workspace follows theme (light = paper chrome).
  const darkChrome =
    isLanding || isOnboarding || (showWorkspaceChrome && effective === 'dark');

  return (
    <div className={`min-h-screen flex flex-col relative ${
      isLanding
        ? 'bg-transparent text-white'
        : showWorkspaceChrome
          ? 'bg-neutral-100 text-neutral-950 dark:bg-[#07070b] dark:text-white'
          : isOnboarding
            ? 'bg-[#07070b] text-white'
            : 'bg-white'
    }`}>
      {!splashDone && <SplashScreen onDone={() => setSplashDone(true)} />}

      {isLanding && <ScrollProgressBar />}
      {isLanding && <LandingStage3D />}
      {isLanding && <SectionDotNav />}
      {isLanding && <BackToTop />}

      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header
        ref={setHeaderEl}
        className={`sticky top-0 z-30 border-b ${
          darkChrome
            ? 'bg-[#07070b]/85 backdrop-blur-xl border-white/[0.08] text-white'
            : 'bg-white/95 backdrop-blur-xl border-neutral-200 text-neutral-900'
        }`}
      >
        <div className="px-4 sm:px-6 lg:px-8 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-4">

            <div className="flex items-center gap-2 min-w-0">
              {showWorkspaceChrome && profile && (
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className={`lg:hidden p-2 -ml-1.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 transition-colors ${
                    darkChrome
                      ? 'text-neutral-200 hover:bg-white/10'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                  aria-label="Open workspace navigation"
                  aria-controls="workspace-sidebar"
                  aria-expanded={sidebarOpen}
                >
                  <Menu className="h-6 w-6" />
                </button>
              )}

              <Link
                to="/"
                className="flex items-center gap-3 min-w-0 flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-lg px-1 py-1"
                aria-label="Go to home"
              >
                <LogoWordmark size="lg" variant={darkChrome ? 'light' : 'dark'} />
              </Link>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {showWorkspaceChrome && profile && (
                <button
                  type="button"
                  onClick={cyclePreference}
                  title={`Theme: ${
                    preference === 'dark' ? 'Dark' : preference === 'light' ? 'Light' : 'System'
                  } — click to switch`}
                  aria-label={`Color theme: ${
                    preference === 'dark' ? 'Dark' : preference === 'light' ? 'Light' : 'System'
                  }. Click to cycle.`}
                  className={`p-2 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                    darkChrome
                      ? 'text-neutral-200 hover:bg-white/10 border border-white/12 bg-white/5'
                      : 'text-neutral-800 hover:bg-neutral-100 border border-neutral-200 bg-white'
                  }`}
                >
                  {preference === 'dark' ? (
                    <Moon className="h-5 w-5" aria-hidden />
                  ) : preference === 'light' ? (
                    <Sun className="h-5 w-5" aria-hidden />
                  ) : (
                    <Monitor className="h-5 w-5" aria-hidden />
                  )}
                </button>
              )}

              {showWorkspaceChrome && profile && (
                <button
                  type="button"
                  onClick={goOnboarding}
                  className={`text-sm font-semibold py-1.5 px-3.5 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 ${
                    darkChrome
                      ? 'border border-white/15 bg-white/5 hover:bg-white/10 text-white'
                      : 'border border-neutral-300 bg-white hover:bg-neutral-50 text-neutral-800'
                  }`}
                >
                  Edit profile
                </button>
              )}

              {view === 'onboarding' && (
                <button
                  type="button"
                  onClick={profile ? () => goWorkspace('overview') : goLanding}
                  className={`text-sm font-semibold underline underline-offset-2 ${
                    darkChrome
                      ? 'text-neutral-400 hover:text-white'
                      : 'text-neutral-600 hover:text-neutral-950'
                  }`}
                >
                  ← {profile ? 'Back to workspace' : 'Back to home'}
                </button>
              )}

              {view === 'landing' && !profile && (
                <button type="button" onClick={goOnboarding} className="btn-primary text-sm py-2 px-4 rounded-xl">
                  Get started
                </button>
              )}

              {view === 'landing' && profile && (
                <button type="button" onClick={() => goWorkspace('overview')} className="btn-primary text-sm py-2 px-4 rounded-xl">
                  My workspace
                </button>
              )}
            </div>
          </div>
        </div>

      </header>

      {showWorkspaceChrome && profile && (
        <WorkspaceSidebar
          isMobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          companyName={profile.companyName}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
      )}

      {view === 'landing' && (
        <main id="main-content" className="flex-1 relative z-10">
          <HeroSection
            profile={profile}
            onGetStarted={goOnboarding}
            onGoToWorkspace={() => goWorkspace('overview')}
          />
          <LandingFooter />
        </main>
      )}

      {view === 'onboarding' && (
        <main id="main-content" className="flex-1 bg-[#07070b] text-white">
          <ProfileWizard onSubmit={handleProfileSubmit} initialProfile={profile} />
        </main>
      )}

      {showWorkspaceChrome && profile && (
        <main
          id="main-content"
          className={`flex-1 bg-neutral-100 text-neutral-950 transition-[padding] duration-200 dark:bg-[#07070b] dark:text-white ${
            sidebarCollapsed ? 'lg:pl-16' : 'lg:pl-60 xl:pl-64'
          } ${
            assistantCollapsed ? 'lg:pr-24' : 'lg:pr-[26rem] xl:pr-[28rem]'
          }`}
        >

          {activeTab === 'overview' && (
            <InsightsDashboard
              profile={profile}
              onViewDetails={handleViewDetails}
              onEditProfile={goOnboarding}
              onOpenAdvisor={() => setAssistantCollapsed(false)}
            />
          )}

          {/*
            Dashboard stays mounted for every workspace tab so the
            auto-generate pipeline (Operations / Financial / Marketing) keeps
            running in the background while the user explores the overview.
            We hide it visually on the overview tab; the Insights view above
            takes the foreground there.
          */}
          <div
            className={activeTab === 'overview' ? 'hidden' : 'py-6 sm:py-8 min-h-[60vh]'}
            aria-hidden={activeTab === 'overview'}
          >
            <Dashboard
              profile={profile}
              isUnlocked={true}
              activeSection={
                activeTab === 'overview' ? undefined : TAB_TO_SECTION[activeTab]
              }
              onSectionNavigate={() => {}}
              autoGenerate={true}
              onFundAllocationSummary={handleFundAllocationSummary}
            />
          </div>

          <AIAssistantPanel
            profile={profile}
            currentSection={advisorSection}
            isCollapsed={assistantCollapsed}
            onToggleCollapse={toggleAssistant}
          />
        </main>
      )}
    </div>
  );
}

function LandingFooter() {
  return (
    <footer className="relative border-t border-white/[0.08] bg-[#07070b]/45 backdrop-blur-xl py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <LogoWordmark size="sm" variant="light" />
            <span className="text-xs text-neutral-400">© 2026 · For Malaysian SMEs</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-neutral-400">
            {['Privacy', 'Terms', 'Support'].map((l) => (
              <a key={l} href="#" className="hover:text-white transition-colors">
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  return (
    <LoadingProvider>
      <AppContent />
    </LoadingProvider>
  );
}
