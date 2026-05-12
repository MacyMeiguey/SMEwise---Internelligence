/**
 * Dashboard — renders the five guidance sections
 * Requirements: 3.1, 3.2, 3.3
 *
 * Props:
 *   profile    — the submitted BusinessProfile (used for widget context)
 *   isUnlocked — when false, all sections are locked/greyed out
 */

import { useRef, useState } from "react";
import type { BusinessProfile, PricingOptionalInputs } from "../types";
import SectionPanel from "./SectionPanel";

// ── Operations widgets ──
import StartupRegistrationWidget from "./widgets/StartupRegistrationWidget";
import OfficeLocationWidget from "./widgets/OfficeLocationWidget";
import RiskAnalyzerWidget from "./widgets/RiskAnalyzerWidget";

// ── Financial Planning widgets ──
import FundAllocationWidget from "./widgets/FundAllocationWidget";
import RevenueProjectionWidget from "./widgets/RevenueProjectionWidget";
import FinancialReturnWidget from "./widgets/FinancialReturnWidget";
import LoansFundingWidget from "./widgets/LoansFundingWidget";

// ── Pricing Strategy widgets ──
import PricingOptionalInputsComponent from "./PricingOptionalInputs";
import CompetitorPricingWidget from "./widgets/CompetitorPricingWidget";
import SmartPricingWidget from "./widgets/SmartPricingWidget";
import ProductVisualWidget from "./widgets/ProductVisualWidget";

// ── Marketing widgets ──
import MarketingStrategyWidget from "./widgets/MarketingStrategyWidget";
import MarketingPosterWidget from "./widgets/MarketingPosterWidget";

// ── Owner Tools widgets ──
import AnalyticsDashboardWidget from "./widgets/AnalyticsDashboardWidget";
import { DocumentGeneratorWidgetWithControls as DocumentGeneratorWidget } from "./widgets/DocumentGeneratorWidget";
import BusinessChatbot from "./BusinessChatbot";

interface DashboardProps {
  profile: BusinessProfile | null;
  isUnlocked: boolean;
  /** When set, only this section's panel is visible (state is always preserved). */
  activeSection?: string;
  /** Fires when the user picks a section so the advisor can follow focus */
  onSectionNavigate?: (sectionTitle: string) => void;
}

const SECTIONS = [
  "Operations",
  "Financial Planning",
  "Pricing Strategy",
  "Marketing",
  "Owner Tools",
] as const;

const DEFAULT_PRICING_INPUTS: PricingOptionalInputs = {
  monthlyRevenueRange: null,
  productServiceNames: null,
  costPerProduct: null,
};

export default function Dashboard({ profile, isUnlocked, activeSection }: DashboardProps) {
  // ── Pricing Strategy state ──
  const [pricingInputs, setPricingInputs] = useState<PricingOptionalInputs>(
    DEFAULT_PRICING_INPUTS
  );

  // ── Marketing state ──
  const [marketingStrategy, setMarketingStrategy] = useState<string>("");

  // ── Refs to each widget's generate handler so Generate All can call them ──
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
    if (section === "Operations") {
      await Promise.all([
        startupRegRef.current?.(),
        officeLocRef.current?.(),
        riskRef.current?.(),
      ]);
    } else if (section === "Financial Planning") {
      await Promise.all([
        fundAllocRef.current?.(),
        revenueRef.current?.(),
        financialReturnRef.current?.(),
        loansRef.current?.(),
      ]);
    } else if (section === "Pricing Strategy") {
      await Promise.all([
        competitorPricingRef.current?.(),
        smartPricingRef.current?.(),
        productVisualRef.current?.(),
      ]);
    } else if (section === "Marketing") {
      // Run strategy first so the poster can use the generated strategy text
      await marketingStrategyRef.current?.();
      await marketingPosterRef.current?.();
    } else if (section === "Owner Tools") {
      await Promise.all([
        analyticsRef.current?.(),
        documentRef.current?.(),
      ]);
    } else {
      console.log(`Generate All triggered for: ${section}`);
    }
  }

  return (
    <section
      aria-label="Dashboard"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-10"
    >
      {/* ── Locked notice ── */}
      {!isUnlocked && (
        <div role="status" className="mb-6 rounded-xl border-2 border-primary-400 bg-primary-50 px-4 py-3 text-sm text-neutral-950 font-medium">
          Submit your business profile above to unlock all sections.
        </div>
      )}

      {/* ── Section panels — all stay mounted so generated content is preserved ── */}
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section, index) => (
          <div key={section} className={activeSection && activeSection !== section ? 'hidden' : ''}>
          <SectionPanel
            key={section}
            title={section}
            isLocked={!isUnlocked}
            onGenerateAll={() => handleGenerateAll(section)}
            index={index}
          >
            {/* Operations widgets */}
            {section === "Operations" && profile && (
              <div className="flex flex-col gap-4">
                <StartupRegistrationWidget
                  profile={profile}
                  onGenerateRef={(fn) => { startupRegRef.current = fn; }}
                />
                <OfficeLocationWidget
                  profile={profile}
                  onGenerateRef={(fn) => { officeLocRef.current = fn; }}
                />
                <RiskAnalyzerWidget
                  profile={profile}
                  onGenerateRef={(fn) => { riskRef.current = fn; }}
                />
              </div>
            )}

            {/* Financial Planning widgets */}
            {section === "Financial Planning" && profile && (
              <div className="flex flex-col gap-4">
                <FundAllocationWidget
                  profile={profile}
                  onGenerateRef={(fn) => { fundAllocRef.current = fn; }}
                />
                <RevenueProjectionWidget
                  profile={profile}
                  onGenerateRef={(fn) => { revenueRef.current = fn; }}
                />
                <FinancialReturnWidget
                  profile={profile}
                  onGenerateRef={(fn) => { financialReturnRef.current = fn; }}
                />
                <LoansFundingWidget
                  profile={profile}
                  onGenerateRef={(fn) => { loansRef.current = fn; }}
                />
              </div>
            )}

            {/* Pricing Strategy widgets */}
            {section === "Pricing Strategy" && profile && (
              <div className="flex flex-col gap-4">
                <PricingOptionalInputsComponent
                  value={pricingInputs}
                  onChange={setPricingInputs}
                />
                <CompetitorPricingWidget
                  profile={profile}
                  pricingInputs={pricingInputs}
                  onGenerateRef={(fn) => { competitorPricingRef.current = fn; }}
                />
                <SmartPricingWidget
                  profile={profile}
                  pricingInputs={pricingInputs}
                  onGenerateRef={(fn) => { smartPricingRef.current = fn; }}
                />
                <ProductVisualWidget
                  profile={profile}
                  pricingInputs={pricingInputs}
                  onGenerateRef={(fn) => { productVisualRef.current = fn; }}
                />
              </div>
            )}

            {/* Marketing widgets */}
            {section === "Marketing" && profile && (
              <div className="flex flex-col gap-4">
                <MarketingStrategyWidget
                  profile={profile}
                  onStrategyGenerated={setMarketingStrategy}
                  onGenerateRef={(fn) => { marketingStrategyRef.current = fn; }}
                />
                <MarketingPosterWidget
                  profile={profile}
                  marketingStrategy={marketingStrategy}
                  onGenerateRef={(fn) => { marketingPosterRef.current = fn; }}
                />
              </div>
            )}

            {/* Owner Tools widgets */}
            {section === "Owner Tools" && profile && (
              <div className="flex flex-col gap-4">
                <AnalyticsDashboardWidget
                  profile={profile}
                  onGenerateRef={(fn) => { analyticsRef.current = fn; }}
                />
                <DocumentGeneratorWidget
                  profile={profile}
                  onGenerateRef={(fn) => { documentRef.current = fn; }}
                />
                <BusinessChatbot profile={profile} />
              </div>
            )}
          </SectionPanel>
          </div>
        ))}
      </div>
    </section>
  );
}
