/**
 * Dashboard — renders the five guidance sections with bento-style layouts.
 */

import { useEffect, useRef, useState } from 'react';
import type { BusinessProfile, PricingOptionalInputs } from '../types';
import SectionPanel from './SectionPanel';

import StartupRegistrationWidget from './widgets/StartupRegistrationWidget';
import OfficeLocationWidget from './widgets/OfficeLocationWidget';
import RiskAnalyzerWidget from './widgets/RiskAnalyzerWidget';

import FundAllocationWidget, { type FundAllocationPlan } from './widgets/FundAllocationWidget';
import RevenueProjectionWidget from './widgets/RevenueProjectionWidget';
import LoansFundingWidget from './widgets/LoansFundingWidget';
import InvestorFundingWidget from './widgets/InvestorFundingWidget';

import PricingOptionalInputsComponent from './PricingOptionalInputs';
import CompetitorPricingWidget, { type CompetitorAnalysisResult } from './widgets/CompetitorPricingWidget';
import SmartPricingWidget from './widgets/SmartPricingWidget';
import PricingHistoryWidget from './widgets/PricingHistoryWidget';

import MarketingStrategyWidget from './widgets/MarketingStrategyWidget';
import MarketingGuidelinesWidget from './widgets/MarketingGuidelinesWidget';
import MarketingForecastWidget from './widgets/MarketingForecastWidget';

import AnalyticsDashboardWidget from './widgets/AnalyticsDashboardWidget';
import { DocumentGeneratorWidgetWithControls as DocumentGeneratorWidget } from './widgets/DocumentGeneratorWidget';
import OwnerToolsWorkspace from './workspace/OwnerToolsWorkspace';

interface DashboardProps {
  profile: BusinessProfile | null;
  isUnlocked: boolean;
  activeSection?: string;
  onSectionNavigate?: (sectionTitle: string) => void;
  /**
   * When true, the Operations / Financial Planning / Marketing sections render
   * in compact mode (no description band, no manual generate buttons) and
   * every widget in those sections is auto-generated on mount, respecting the
   * prerequisite chain (Fund Allocation → Revenue, Marketing Strategy …).
   */
  autoGenerate?: boolean;
  /**
   * Called once Fund Allocation succeeds with the human-readable summary,
   * so the host (App) can persist it into the BusinessProfile and reuse it
   * for future Marketing Strategy calls.
   */
  onFundAllocationSummary?: (summary: string) => void;
}

const SECTIONS = [
  'Operations',
  'Financial Planning',
  'Pricing Strategy',
  'Marketing',
  'Owner Tools',
] as const;

const DEFAULT_PRICING_INPUTS: PricingOptionalInputs = {
  monthlyRevenueRange: null,
  productServiceNames: null,
  costPerProduct: null,
};

export default function Dashboard({
  profile,
  isUnlocked,
  activeSection,
  autoGenerate = false,
  onFundAllocationSummary,
}: DashboardProps) {
  const [pricingInputs, setPricingInputs] = useState<PricingOptionalInputs>(DEFAULT_PRICING_INPUTS);
  const [competitorResult, setCompetitorResult] = useState<CompetitorAnalysisResult | null>(null);
  const [smartPricingResult, setSmartPricingResult] = useState<Record<string, unknown> | null>(null);
  const [marketingPlanJson, setMarketingPlanJson] = useState<string | null>(null);
  const [budgetAllocation, setBudgetAllocation] = useState<string | undefined>(undefined);
  const marketingPlanJsonRef = useRef<string | null>(null);
  const budgetAllocationRef = useRef<string | undefined>(undefined);

  const startupRegRef = useRef<(() => Promise<void>) | null>(null);
  const officeLocRef = useRef<(() => Promise<void>) | null>(null);
  const riskRef = useRef<(() => Promise<void>) | null>(null);

  const fundAllocRef = useRef<(() => Promise<void>) | null>(null);
  const revenueRef = useRef<((budgetAllocationOverride?: string) => Promise<void>) | null>(null);
  const loansRef = useRef<(() => Promise<void>) | null>(null);
  const investorFundingRef = useRef<(() => Promise<void>) | null>(null);

  const competitorPricingRef = useRef<(() => Promise<void>) | null>(null);
  const smartPricingRef = useRef<(() => Promise<void>) | null>(null);
  const productVisualRef = useRef<(() => Promise<void>) | null>(null);

  const marketingStrategyRef = useRef<((fundAllocationOverride?: string) => Promise<void>) | null>(null);
  const marketingGuidelinesRef = useRef<((planJson?: string) => Promise<void>) | null>(null);
  const marketingForecastRef = useRef<((planJson?: string) => Promise<void>) | null>(null);

  const analyticsRef = useRef<(() => Promise<void>) | null>(null);
  const documentRef = useRef<(() => Promise<void>) | null>(null);

  // ── Auto-generate pipeline ─────────────────────────────────────────────────
  // When autoGenerate is true, kick off every Operations / Financial / Marketing
  // widget on first profile mount. Pricing & Owner Tools are left manual.
  // Dependency rules:
  //   • Operations: 3 widgets in parallel (no deps)
  //   • Financial: Fund Allocation → (Revenue + Loans + Investor) in parallel
  //   • Marketing: needs Fund Allocation result → Strategy → (Guidelines + Forecast)
  //
  // Notes:
  //   - We guard with a ref so React StrictMode's dev-only double-mount doesn't
  //     fire the pipeline twice. The first mount flips the ref to true; the
  //     second mount is short-circuited.
  //   - We deliberately do NOT cancel in-flight work on cleanup. Cancelling
  //     would defeat StrictMode (cleanup fires between the two dev mounts and
  //     would abort the only kickoff). The widgets themselves just call into
  //     fetch and update local state on resolve, so a stray result is harmless.
  const autoGenStartedRef = useRef(false);

  useEffect(() => {
    if (!autoGenerate || !profile || !isUnlocked) return;
    if (autoGenStartedRef.current) return;
    autoGenStartedRef.current = true;

    const start = async () => {
      // Yield once to the macrotask queue so every child widget's onGenerateRef
      // useEffect has had a chance to register its handler before we read it.
      // setTimeout(0) is more reliable than rAF here because rAF can be paused
      // when the tab is backgrounded or the section is initially `display:none`.
      await new Promise((r) => setTimeout(r, 0));

      // ── Operations ── three independent widgets, run in parallel.
      const opsPromise = Promise.allSettled([
        startupRegRef.current?.(),
        officeLocRef.current?.(),
        riskRef.current?.(),
      ]);

      // ── Financial Planning ── Fund Allocation must finish first.
      const finPromise = (async () => {
        await fundAllocRef.current?.();
        // Snapshot the fresh allocation; React state may not have flushed yet.
        const allocSummary = budgetAllocationRef.current;
        await Promise.allSettled([
          revenueRef.current?.(allocSummary),
          loansRef.current?.(),
          investorFundingRef.current?.(),
          // Marketing Strategy depends on Fund Allocation too (uses the
          // breakdown as one of its inputs). We only kick off Strategy
          // here — Guidelines and Forecast are fanned out from the
          // `onStrategyGenerated` callback below, so they also fire after
          // a manual retry of Strategy if the first attempt failed.
          marketingStrategyRef.current?.(allocSummary),
        ]);
      })();

      await Promise.allSettled([opsPromise, finPromise]);
    };

    void start();
  }, [autoGenerate, profile, isUnlocked]);
  /** Owner Tools: auto-run generators once per visit to this tab (avoids repeat API storms). */
  const ownerToolsAutoRanRef = useRef(false);

  async function handleGenerateAll(section: string) {
    if (section === 'Operations') {
      await Promise.all([
        startupRegRef.current?.(),
        officeLocRef.current?.(),
        riskRef.current?.(),
      ]);
    } else if (section === 'Financial Planning') {
      // Fund allocation must complete first — it provides the budget string
      // that Revenue Projection and Financial Return depend on.
      await fundAllocRef.current?.();
      await Promise.all([
        revenueRef.current?.(),
        loansRef.current?.(),
        investorFundingRef.current?.(),
      ]);
    } else if (section === 'Pricing Strategy') {
      await Promise.all([
        competitorPricingRef.current?.(),
        smartPricingRef.current?.(),
        productVisualRef.current?.(),
      ]);
    } else if (section === 'Marketing') {
      // Sequential: strategy first, then guidelines and forecast in parallel.
      // Pass the plan JSON directly to downstream widgets so they don't depend
      // on React state (which would still be stale at this point).
      await marketingStrategyRef.current?.();
      const planJson = marketingPlanJsonRef.current;
      if (planJson) {
        await Promise.all([
          marketingGuidelinesRef.current?.(planJson),
          marketingForecastRef.current?.(planJson),
        ]);
      }
    } else if (section === 'Owner Tools') {
      await Promise.all([analyticsRef.current?.(), documentRef.current?.()]);
    }
  }

  useEffect(() => {
    if (!profile || !isUnlocked) return;

    if (activeSection !== 'Owner Tools') {
      ownerToolsAutoRanRef.current = false;
      return;
    }

    if (ownerToolsAutoRanRef.current) return;

    const timer = window.setTimeout(() => {
      ownerToolsAutoRanRef.current = true;
      void Promise.all([
        analyticsRef.current?.() ?? Promise.resolve(),
        documentRef.current?.() ?? Promise.resolve(),
      ]);
    }, 400);

    return () => window.clearTimeout(timer);
  }, [activeSection, profile, isUnlocked]);

  return (
    <section aria-label="Dashboard" className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
      {!isUnlocked && (
        <div
          role="status"
          className="mb-6 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-900 font-medium dark:border-primary-500/30 dark:bg-primary-950/40 dark:text-primary-100"
        >
          Submit your business profile to unlock all sections.
        </div>
      )}

      <div className="flex flex-col gap-10 lg:gap-12">
        {SECTIONS.map((section, index) => {
          // The three sections we auto-generate render in compact mode (no
          // hero band, no manual run-all button, no per-widget generate).
          const isAutoSection =
            autoGenerate &&
            (section === 'Operations' ||
              section === 'Financial Planning' ||
              section === 'Marketing');

          return (
            <div key={section} className={activeSection && activeSection !== section ? 'hidden' : ''}>
              <SectionPanel
                title={section}
                isLocked={!isUnlocked}
                onGenerateAll={() => handleGenerateAll(section)}
                index={index}
                compact={isAutoSection}
              >
                {section === 'Operations' && profile && (
                  <div className="grid grid-cols-1 gap-4 lg:gap-5">
                    <StartupRegistrationWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        startupRegRef.current = fn;
                      }}
                      hideGenerateButton={isAutoSection}
                    />
                    <OfficeLocationWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        officeLocRef.current = fn;
                      }}
                      hideGenerateButton={isAutoSection}
                    />
                    <RiskAnalyzerWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        riskRef.current = fn;
                      }}
                      hideGenerateButton={isAutoSection}
                    />
                  </div>
                )}

                {section === 'Financial Planning' && profile && (
                  <div className="flex flex-col gap-4 lg:gap-5">
                    {/* Row 1 — Fund Allocation full width */}
                    <FundAllocationWidget
                      profile={profile}
                      onAllocationGenerated={(plan: FundAllocationPlan) => {
                        const summary = plan.allocations
                          .map((a) => `${a.category}: ${a.percentage}% (RM ${a.amount.toLocaleString('en-MY')})`)
                          .join(', ');
                        budgetAllocationRef.current = summary;
                        setBudgetAllocation(summary);
                        // Bubble up so the host can persist it onto the profile.
                        onFundAllocationSummary?.(summary);
                      }}
                      onGenerateRef={(fn) => { fundAllocRef.current = fn; }}
                      hideGenerateButton={isAutoSection}
                    />

                    {/* Row 2 — Revenue Projection full width */}
                    <RevenueProjectionWidget
                      profile={profile}
                      budgetAllocation={budgetAllocation}
                      onGenerateRef={(fn) => { revenueRef.current = fn; }}
                      hideGenerateButton={isAutoSection}
                    />

                    {/* Row 3 — Loans & Funding + Investor & Funding side by side */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                      <LoansFundingWidget
                        profile={profile}
                        onGenerateRef={(fn) => { loansRef.current = fn; }}
                        hideGenerateButton={isAutoSection}
                      />
                      <InvestorFundingWidget
                        profile={profile}
                        onGenerateRef={(fn) => { investorFundingRef.current = fn; }}
                        hideGenerateButton={isAutoSection}
                      />
                    </div>
                  </div>
                )}

                {section === 'Pricing Strategy' && profile && (
                  <div className="flex flex-col gap-4 lg:gap-5">
                    <PricingOptionalInputsComponent value={pricingInputs} onChange={setPricingInputs} />
                    <div
                      className="grid grid-cols-2 gap-4 lg:gap-5 min-w-0"
                    >
                      <div className="min-w-0">
                      <CompetitorPricingWidget
                        profile={profile}
                        pricingInputs={pricingInputs}
                        onGenerateRef={(fn) => {
                          competitorPricingRef.current = fn;
                        }}
                        onAnalysisComplete={(result) => setCompetitorResult(result)}
                      />
                      </div>
                      <div className="min-w-0">
                      <SmartPricingWidget
                        profile={profile}
                        pricingInputs={pricingInputs}
                        onGenerateRef={(fn) => {
                          smartPricingRef.current = fn;
                        }}
                        competitorResult={competitorResult}
                        onPricingComplete={(result) => setSmartPricingResult(result as Record<string, unknown>)}
                      />
                      </div>
                    </div>
                    <PricingHistoryWidget
                      pricingInputs={pricingInputs}
                      competitorResult={competitorResult}
                      smartPricingResult={smartPricingResult as Parameters<typeof PricingHistoryWidget>[0]['smartPricingResult']}
                    />
                  </div>
                )}

                {section === 'Marketing' && profile && (
                  <div className="flex flex-col gap-4 lg:gap-5">
                    {/* Row 1: Strategy + Guidelines */}
                    <div className="grid grid-cols-1 xl:grid-cols-10 items-stretch gap-4 lg:gap-5">
                      <div className="xl:col-span-5 min-w-0 flex flex-col">
                        <MarketingStrategyWidget
                          profile={profile}
                          onStrategyGenerated={(raw) => {
                            marketingPlanJsonRef.current = raw;
                            setMarketingPlanJson(raw);
                            // In auto-gen mode, fan out Guidelines + Forecast
                            // every time Strategy produces a plan. Putting the
                            // fan-out here (rather than inline in the auto-gen
                            // pipeline) means a manual retry of Strategy after
                            // a first-attempt failure also re-triggers the two
                            // downstream widgets — they'd otherwise stay idle
                            // because the original pipeline already bailed.
                            if (isAutoSection) {
                              void marketingGuidelinesRef.current?.(raw);
                              void marketingForecastRef.current?.(raw);
                            }
                          }}
                          onGenerateRef={(fn) => {
                            marketingStrategyRef.current = fn;
                          }}
                          hideGenerateButton={isAutoSection}
                        />
                      </div>
                      <div className="xl:col-span-5 min-w-0">
                        <MarketingGuidelinesWidget
                          marketingPlanJson={marketingPlanJson}
                          onGenerateRef={(fn) => {
                            marketingGuidelinesRef.current = fn;
                          }}
                          hideGenerateButton={isAutoSection}
                        />
                      </div>
                    </div>
                    {/* Row 2: Forecast (full width) */}
                    <MarketingForecastWidget
                      marketingPlanJson={marketingPlanJson}
                      onGenerateRef={(fn) => {
                        marketingForecastRef.current = fn;
                      }}
                      hideGenerateButton={isAutoSection}
                    />
                  </div>
                )}

                {section === 'Owner Tools' && profile && (
                  <div className="flex flex-col gap-4 lg:gap-5">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                      <div className="lg:col-span-2 min-w-0">
                        <AnalyticsDashboardWidget
                          profile={profile}
                          onGenerateRef={(fn) => {
                            analyticsRef.current = fn;
                          }}
                        />
                      </div>
                    </div>
                    <DocumentGeneratorWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        documentRef.current = fn;
                      }}
                    />
                  </div>
                )}
              </SectionPanel>
            </div>
          );
        })}
      </div>
    </section>
  );
}
