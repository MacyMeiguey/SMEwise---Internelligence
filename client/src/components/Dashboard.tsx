/**
 * Dashboard — renders the five guidance sections with bento-style layouts.
 */

import { useRef, useState } from 'react';
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
import CompetitorPricingWidget from './widgets/CompetitorPricingWidget';
import SmartPricingWidget from './widgets/SmartPricingWidget';
import ProductVisualWidget from './widgets/ProductVisualWidget';

import MarketingStrategyWidget from './widgets/MarketingStrategyWidget';
import MarketingGuidelinesWidget from './widgets/MarketingGuidelinesWidget';
import MarketingForecastWidget from './widgets/MarketingForecastWidget';

import AnalyticsDashboardWidget from './widgets/AnalyticsDashboardWidget';
import { DocumentGeneratorWidgetWithControls as DocumentGeneratorWidget } from './widgets/DocumentGeneratorWidget';

interface DashboardProps {
  profile: BusinessProfile | null;
  isUnlocked: boolean;
  activeSection?: string;
  onSectionNavigate?: (sectionTitle: string) => void;
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

export default function Dashboard({ profile, isUnlocked, activeSection }: DashboardProps) {
  const [pricingInputs, setPricingInputs] = useState<PricingOptionalInputs>(DEFAULT_PRICING_INPUTS);
  const [marketingPlanJson, setMarketingPlanJson] = useState<string | null>(null);
  const [budgetAllocation, setBudgetAllocation] = useState<string | undefined>(undefined);
  const marketingPlanJsonRef = useRef<string | null>(null);

  const startupRegRef = useRef<(() => Promise<void>) | null>(null);
  const officeLocRef = useRef<(() => Promise<void>) | null>(null);
  const riskRef = useRef<(() => Promise<void>) | null>(null);

  const fundAllocRef = useRef<(() => Promise<void>) | null>(null);
  const revenueRef = useRef<(() => Promise<void>) | null>(null);
  const loansRef = useRef<(() => Promise<void>) | null>(null);
  const investorFundingRef = useRef<(() => Promise<void>) | null>(null);

  const competitorPricingRef = useRef<(() => Promise<void>) | null>(null);
  const smartPricingRef = useRef<(() => Promise<void>) | null>(null);
  const productVisualRef = useRef<(() => Promise<void>) | null>(null);

  const marketingStrategyRef = useRef<(() => Promise<void>) | null>(null);
  const marketingGuidelinesRef = useRef<((planJson?: string) => Promise<void>) | null>(null);
  const marketingForecastRef = useRef<((planJson?: string) => Promise<void>) | null>(null);

  const analyticsRef = useRef<(() => Promise<void>) | null>(null);
  const documentRef = useRef<(() => Promise<void>) | null>(null);

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
        {SECTIONS.map((section, index) => (
          <div key={section} className={activeSection && activeSection !== section ? 'hidden' : ''}>
            <SectionPanel
              title={section}
              isLocked={!isUnlocked}
              onGenerateAll={() => handleGenerateAll(section)}
              index={index}
            >
              {section === 'Operations' && profile && (
                <div className="grid grid-cols-1 gap-4 lg:gap-5">
                  <StartupRegistrationWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      startupRegRef.current = fn;
                    }}
                  />
                  <OfficeLocationWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      officeLocRef.current = fn;
                    }}
                  />
                  <RiskAnalyzerWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      riskRef.current = fn;
                    }}
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
                      setBudgetAllocation(summary);
                    }}
                    onGenerateRef={(fn) => { fundAllocRef.current = fn; }}
                  />

                  {/* Row 2 — Revenue Projection full width */}
                  <RevenueProjectionWidget
                    profile={profile}
                    budgetAllocation={budgetAllocation}
                    onGenerateRef={(fn) => { revenueRef.current = fn; }}
                  />

                  {/* Row 3 — Loans & Funding + Investor & Funding side by side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                    <LoansFundingWidget
                      profile={profile}
                      onGenerateRef={(fn) => { loansRef.current = fn; }}
                    />
                    <InvestorFundingWidget
                      profile={profile}
                      onGenerateRef={(fn) => { investorFundingRef.current = fn; }}
                    />
                  </div>
                </div>
              )}

              {section === 'Pricing Strategy' && profile && (
                <div className="flex flex-col gap-4 lg:gap-5">
                  <PricingOptionalInputsComponent value={pricingInputs} onChange={setPricingInputs} />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                    <CompetitorPricingWidget
                      profile={profile}
                      pricingInputs={pricingInputs}
                      onGenerateRef={(fn) => {
                        competitorPricingRef.current = fn;
                      }}
                    />
                    <SmartPricingWidget
                      profile={profile}
                      pricingInputs={pricingInputs}
                      onGenerateRef={(fn) => {
                        smartPricingRef.current = fn;
                      }}
                    />
                  </div>
                  <ProductVisualWidget
                    profile={profile}
                    pricingInputs={pricingInputs}
                    onGenerateRef={(fn) => {
                      productVisualRef.current = fn;
                    }}
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
                        }}
                        onGenerateRef={(fn) => {
                          marketingStrategyRef.current = fn;
                        }}
                      />
                    </div>
                    <div className="xl:col-span-5 min-w-0">
                      <MarketingGuidelinesWidget
                        marketingPlanJson={marketingPlanJson}
                        onGenerateRef={(fn) => {
                          marketingGuidelinesRef.current = fn;
                        }}
                      />
                    </div>
                  </div>
                  {/* Row 2: Forecast (full width) */}
                  <MarketingForecastWidget
                    marketingPlanJson={marketingPlanJson}
                    onGenerateRef={(fn) => {
                      marketingForecastRef.current = fn;
                    }}
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
        ))}
      </div>
    </section>
  );
}
