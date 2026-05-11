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
import SectionTabBar from "./SectionTabBar";

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

export default function Dashboard({ profile, isUnlocked }: DashboardProps) {
  // ── Pricing Strategy state ──
  const [pricingInputs, setPricingInputs] = useState<PricingOptionalInputs>(
    DEFAULT_PRICING_INPUTS
  );

  // ── Marketing state ──
  const [marketingStrategy, setMarketingStrategy] = useState<string>("");

  // ── Active section for mobile tab bar ──
  const [activeSection, setActiveSection] = useState<string>("Operations");

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
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 md:pb-8"
    >
      {/* ── Dashboard heading ── */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#7c3aed] to-[#a78bfa] flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Your Dashboard</h2>
          {profile && (
            <p className="text-sm text-[#6b6890]">
              Personalised guidance for{" "}
              <span className="text-[#a78bfa] font-medium">
                {profile.companyName}
              </span>
            </p>
          )}
        </div>
      </div>

      {/* ── Locked notice (shown when profile not yet submitted) ── */}
      {!isUnlocked && (
        <div
          role="status"
          className="mb-6 flex items-center gap-3 rounded-xl border border-yellow-800/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          Submit your business profile above to unlock all sections.
        </div>
      )}

      {/* ── Five section panels ── */}
      <div className="flex flex-col gap-8">
        {SECTIONS.map((section, index) => (
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
        ))}
      </div>

      {/* ── Mobile sticky tab bar ── */}
      <SectionTabBar
        activeSection={activeSection}
        onTabClick={setActiveSection}
      />
    </section>
  );
}
