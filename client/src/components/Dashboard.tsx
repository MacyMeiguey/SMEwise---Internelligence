/**
 * Dashboard — renders the five guidance sections with bento-style layouts.
 */

import { useRef, useState } from 'react';
import type { BusinessProfile, PricingOptionalInputs } from '../types';
import SectionPanel from './SectionPanel';

import StartupRegistrationWidget from './widgets/StartupRegistrationWidget';
import OfficeLocationWidget from './widgets/OfficeLocationWidget';
import RiskAnalyzerWidget from './widgets/RiskAnalyzerWidget';

import FundAllocationWidget from './widgets/FundAllocationWidget';
import RevenueProjectionWidget from './widgets/RevenueProjectionWidget';
import FinancialReturnWidget from './widgets/FinancialReturnWidget';
import LoansFundingWidget from './widgets/LoansFundingWidget';

import PricingOptionalInputsComponent from './PricingOptionalInputs';
import CompetitorPricingWidget from './widgets/CompetitorPricingWidget';
import SmartPricingWidget from './widgets/SmartPricingWidget';
import ProductVisualWidget from './widgets/ProductVisualWidget';

import MarketingStrategyWidget from './widgets/MarketingStrategyWidget';
import MarketingPosterWidget from './widgets/MarketingPosterWidget';

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
  const [marketingStrategy, setMarketingStrategy] = useState<string>('');

  const startupRegRef = useRef<(() => Promise<void>) | null>(null);
  const officeLocRef = useRef<(() => Promise<void>) | null>(null);
  const riskRef = useRef<(() => Promise<void>) | null>(null);

  const fundAllocRef = useRef<(() => Promise<void>) | null>(null);
  const revenueRef = useRef<(() => Promise<void>) | null>(null);
  const financialReturnRef = useRef<(() => Promise<void>) | null>(null);
  const loansRef = useRef<(() => Promise<void>) | null>(null);

  const competitorPricingRef = useRef<(() => Promise<void>) | null>(null);
  const smartPricingRef = useRef<(() => Promise<void>) | null>(null);
  const productVisualRef = useRef<(() => Promise<void>) | null>(null);

  const marketingStrategyRef = useRef<(() => Promise<void>) | null>(null);
  const marketingPosterRef = useRef<(() => Promise<void>) | null>(null);

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
      await Promise.all([
        fundAllocRef.current?.(),
        revenueRef.current?.(),
        financialReturnRef.current?.(),
        loansRef.current?.(),
      ]);
    } else if (section === 'Pricing Strategy') {
      await Promise.all([
        competitorPricingRef.current?.(),
        smartPricingRef.current?.(),
        productVisualRef.current?.(),
      ]);
    } else if (section === 'Marketing') {
      await marketingStrategyRef.current?.();
      await marketingPosterRef.current?.();
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
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 lg:gap-5">
                  <div className="xl:col-span-7 min-w-0">
                    <StartupRegistrationWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        startupRegRef.current = fn;
                      }}
                    />
                  </div>
                  <div className="xl:col-span-5 min-w-0">
                    <OfficeLocationWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        officeLocRef.current = fn;
                      }}
                    />
                  </div>
                  <div className="xl:col-span-12 min-w-0">
                    <RiskAnalyzerWidget
                      profile={profile}
                      onGenerateRef={(fn) => {
                        riskRef.current = fn;
                      }}
                    />
                  </div>
                </div>
              )}

              {section === 'Financial Planning' && profile && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-5">
                  <FundAllocationWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      fundAllocRef.current = fn;
                    }}
                  />
                  <RevenueProjectionWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      revenueRef.current = fn;
                    }}
                  />
                  <FinancialReturnWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      financialReturnRef.current = fn;
                    }}
                  />
                  <LoansFundingWidget
                    profile={profile}
                    onGenerateRef={(fn) => {
                      loansRef.current = fn;
                    }}
                  />
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
                <div className="grid grid-cols-1 xl:grid-cols-10 gap-4 lg:gap-5">
                  <div className="xl:col-span-5 min-w-0">
                    <MarketingStrategyWidget
                      profile={profile}
                      onStrategyGenerated={setMarketingStrategy}
                      onGenerateRef={(fn) => {
                        marketingStrategyRef.current = fn;
                      }}
                    />
                  </div>
                  <div className="xl:col-span-5 min-w-0">
                    <MarketingPosterWidget
                      profile={profile}
                      marketingStrategy={marketingStrategy}
                      onGenerateRef={(fn) => {
                        marketingPosterRef.current = fn;
                      }}
                    />
                  </div>
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
