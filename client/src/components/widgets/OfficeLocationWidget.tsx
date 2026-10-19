/**
 * OfficeLocationWidget — Operations Section
 * Calls the dedicated Bedrock agent which returns a structured JSON workspace
 * recommendation guide, then renders it as a rich multi-section UI.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorAnalysis {
  industrySpaceType: string;
  stageCommitment: string;
  budgetVerdict: string;
  locationAvailability: string;
  keyConstraint: string;
}

interface SpaceOption {
  rank: number;
  label: string;
  type: string;
  whyItFits: string;
  estimatedCost: string;
  spaceNeeded: string;
  namedOptions: string[];
  whereToSearch: string;
  url: string;
  headsUp: string;
}

interface CostBreakdown {
  rental: string;
  deposit: string;
  utilities: string;
  fitOut: string;
  totalMonthly: string;
  affordabilityCheck: string;
}

interface PermitsAndZoning {
  businessPremiseLicenseRequired: string | boolean;
  licensePortal: string;
  zoningApprovalNeeded: string | boolean;
  localCouncil: string;
  industrySpecificPermit: string;
}

interface OfficeLocationPlan {
  company: string;
  industry: string;
  businessStage: string;
  location: string;
  businessType: string;
  currentFunds: string;
  advisorAnalysis: AdvisorAnalysis;
  bestFit: string;
  options: SpaceOption[];
  costBreakdown: CostBreakdown;
  leaseNegotiationPoints: string[];
  permitsAndZoning: PermitsAndZoning;
  verdict: string;
  disclaimer: string;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchOfficeLocation(profile: BusinessProfile): Promise<OfficeLocationPlan> {
  const payload = {
    companyName:   profile.companyName,
    industry:      profile.industry,
    businessStage: profile.businessStage,
    city:          profile.city,
    businessType:  profile.businessType,
    currentFunds:  profile.currentFunds,
  };

  const res = await fetch(`${API_BASE}/api/bedrock/office-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { content: string };

  let jsonStr = data.content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  jsonStr = jsonStr.replace(/^<answer>\s*/i, "").replace(/\s*<\/answer>$/i, "").trim();
  const start = jsonStr.indexOf("{");
  const end   = jsonStr.lastIndexOf("}");
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

  return JSON.parse(jsonStr) as OfficeLocationPlan;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconBuilding() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 17V7a1 1 0 0 1 .553-.894l6-3a1 1 0 0 1 .894 0l6 3A1 1 0 0 1 17 7v10M3 17h14M3 17H1m16 0h2M8 17v-4h4v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconCash() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="1" y="5" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <circle cx="10" cy="11" r="2.5" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 11h.01M15 11h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

function IconShield() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 2L3 5v5c0 4.418 3.134 8.223 7 9 3.866-.777 7-4.582 7-9V5l-7-3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconNegotiate() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M2 10h16M2 10l4-4M2 10l4 4M18 10l-4-4M18 10l-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconLink() {
  return (
    <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M6 3H3a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-3M9 2h5m0 0v5m0-5L7 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IconWarning() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M10 3L2 17h16L10 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M10 9v4M10 15h.01" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-primary-400">{icon}</span>
        <h4 className="text-sm font-semibold text-white">{title}</h4>
      </div>
      {children}
    </div>
  );
}

// ─── Advisor Analysis ─────────────────────────────────────────────────────────

function AnalysisGrid({ analysis }: { analysis: AdvisorAnalysis }) {
  const items = [
    { label: "Space Type",     value: analysis.industrySpaceType },
    { label: "Commitment",     value: analysis.stageCommitment },
    { label: "Budget",         value: analysis.budgetVerdict },
    { label: "Availability",   value: analysis.locationAvailability },
    { label: "Key Constraint", value: analysis.keyConstraint },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map(({ label, value }) => (
        <div
          key={label}
          className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-1.5"
        >
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">{label}</p>
          </div>
          <p className="text-sm text-neutral-200 leading-relaxed">{value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Option tabs ──────────────────────────────────────────────────────────────

const OPTION_STYLES = [
  {
    tab:    "border-amber-400/60 text-amber-300 bg-amber-400/10",
    active: "border-amber-400/40 bg-amber-400/[0.06]",
    badge:  "bg-amber-400/15 text-amber-300 border-amber-400/30",
    cost:   "bg-amber-400/10 text-amber-200 border-amber-400/25",
    dot:    "bg-amber-400",
  },
  {
    tab:    "border-primary-400/60 text-primary-300 bg-primary-400/10",
    active: "border-primary-400/40 bg-primary-400/[0.06]",
    badge:  "bg-primary-400/15 text-primary-300 border-primary-400/30",
    cost:   "bg-primary-400/10 text-primary-200 border-primary-400/25",
    dot:    "bg-primary-400",
  },
  {
    tab:    "border-neutral-400/60 text-neutral-300 bg-neutral-400/10",
    active: "border-neutral-400/40 bg-neutral-400/[0.06]",
    badge:  "bg-neutral-400/15 text-neutral-300 border-neutral-400/30",
    cost:   "bg-neutral-400/10 text-neutral-200 border-neutral-400/25",
    dot:    "bg-neutral-400",
  },
];

function OptionPanel({ option, style }: { option: SpaceOption; style: typeof OPTION_STYLES[0] }) {
  return (
    <div className={`rounded-xl border p-5 space-y-4 ${style.active}`}>
      {/* Type + label */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-base font-bold text-white">{option.type}</p>
          <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full border ${style.badge}`}>
            {option.label}
          </span>
        </div>
        <span className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${style.cost}`}>
          {option.estimatedCost}
        </span>
      </div>

      {/* Why it fits */}
      <p className="text-sm text-neutral-300 leading-relaxed">{option.whyItFits}</p>

      {/* Named options */}
      {option.namedOptions?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Suggested Spaces</p>
          <div className="flex flex-wrap gap-2">
            {option.namedOptions.map((name) => (
              <span
                key={name}
                className="rounded-lg border border-white/[0.10] bg-white/[0.05] px-3 py-1 text-sm text-neutral-200"
              >
                {name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Where to search */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Where to Search</p>
        <p className="text-sm text-neutral-400 leading-relaxed">{option.whereToSearch}</p>
      </div>

      {/* URL */}
      {option.url && option.url !== "N/A" && (
        <a
          href={option.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-primary-300 hover:text-primary-200 underline underline-offset-2 transition-colors break-all"
          aria-label={`Visit ${option.type} listing`}
        >
          <IconLink />
          {option.url}
        </a>
      )}

      {/* Heads up */}
      {option.headsUp && (
        <div className="flex gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-4 py-3">
          <span className="text-amber-400 mt-0.5"><IconWarning /></span>
          <p className="text-sm text-amber-200/90 leading-relaxed">{option.headsUp}</p>
        </div>
      )}

      {/* Space needed */}
      {option.spaceNeeded && option.spaceNeeded !== "N/A" && (
        <p className="text-xs text-neutral-500">Space needed: {option.spaceNeeded}</p>
      )}
    </div>
  );
}

function OptionsSection({ options }: { options: SpaceOption[] }) {
  const [active, setActive] = useState(0);

  return (
    <div className="space-y-3">
      {/* Tab row */}
      <div className="flex gap-2 flex-wrap">
        {options.map((opt, i) => {
          const style = OPTION_STYLES[i] ?? OPTION_STYLES[2];
          return (
            <button
              key={opt.rank}
              type="button"
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                active === i
                  ? style.tab
                  : "border-white/[0.08] text-neutral-500 bg-transparent hover:text-neutral-300 hover:border-white/20"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${active === i ? style.dot : "bg-neutral-600"}`} />
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Active panel */}
      {options[active] && (
        <OptionPanel
          option={options[active]}
          style={OPTION_STYLES[active] ?? OPTION_STYLES[2]}
        />
      )}
    </div>
  );
}

// ─── Cost Breakdown ───────────────────────────────────────────────────────────

function CostTable({ breakdown }: { breakdown: CostBreakdown }) {
  const rows = [
    { label: "Monthly Rental", value: breakdown.rental    },
    { label: "Deposit",        value: breakdown.deposit   },
    { label: "Utilities",      value: breakdown.utilities },
    { label: "Fit-Out",        value: breakdown.fitOut    },
  ];

  const isAffordable =
    typeof breakdown.affordabilityCheck === "string" &&
    breakdown.affordabilityCheck.toLowerCase().startsWith("yes");

  return (
    <div className="space-y-3">
      {/* Cost rows */}
      <div className="rounded-xl border border-white/[0.08] overflow-hidden">
        {rows.map(({ label, value }, i) => (
          <div
            key={label}
            className={`flex items-center justify-between px-4 py-3 ${
              i < rows.length - 1 ? "border-b border-white/[0.05]" : ""
            }`}
          >
            <span className="text-sm text-neutral-400">{label}</span>
            <span className="text-sm font-medium text-neutral-200 tabular-nums">{value}</span>
          </div>
        ))}
        {/* Total row */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-white/[0.04] border-t border-white/[0.08]">
          <span className="text-sm font-bold text-white">Total Monthly</span>
          <span className="text-base font-bold text-primary-300 tabular-nums">{breakdown.totalMonthly}</span>
        </div>
      </div>

      {/* Affordability */}
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 ${
          isAffordable
            ? "border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-300"
            : "border-amber-500/25 bg-amber-500/[0.07] text-amber-300"
        }`}
      >
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${isAffordable ? "bg-emerald-400" : "bg-amber-400"}`}
          aria-hidden
        />
        <p className="text-sm leading-relaxed">{breakdown.affordabilityCheck}</p>
      </div>
    </div>
  );
}

// ─── Negotiation Tips ─────────────────────────────────────────────────────────

function NegotiationList({ points }: { points: string[] }) {
  return (
    <div className="space-y-2.5">
      {points.map((point, i) => (
        <div
          key={i}
          className="flex gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
        >
          <span className="shrink-0 h-6 w-6 rounded-full bg-primary-500/20 text-primary-300 flex items-center justify-center text-xs font-bold">
            {i + 1}
          </span>
          <p className="text-sm text-neutral-300 leading-relaxed">{point}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Permits & Zoning ─────────────────────────────────────────────────────────

function PermitsBlock({ permits }: { permits: PermitsAndZoning }) {
  const licenseRequired =
    permits.businessPremiseLicenseRequired === true ||
    String(permits.businessPremiseLicenseRequired).toLowerCase() === "yes";
  const zoningRequired =
    permits.zoningApprovalNeeded === true ||
    String(permits.zoningApprovalNeeded).toLowerCase() === "yes";

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {/* License required */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Business Premise License</p>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg border ${
            licenseRequired
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}>
            {licenseRequired ? "⚠ Required" : "✓ Not Required"}
          </span>
        </div>

        {/* Zoning */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Zoning Approval</p>
          <span className={`inline-flex items-center gap-1.5 text-sm font-semibold px-2.5 py-1 rounded-lg border ${
            zoningRequired
              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
              : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          }`}>
            {zoningRequired ? "⚠ Required" : "✓ Not Required"}
          </span>
        </div>

        {/* Local council */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Local Council</p>
          <p className="text-sm text-neutral-200 font-medium">{permits.localCouncil}</p>
        </div>

        {/* Industry permit */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-3 space-y-1.5">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Industry Permit</p>
          <p className="text-sm text-neutral-200">{permits.industrySpecificPermit}</p>
        </div>
      </div>

      {/* Portal link */}
      {permits.licensePortal && permits.licensePortal !== "N/A" && (
        <a
          href={permits.licensePortal}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-primary-500/25 bg-primary-500/[0.07] px-4 py-2.5 text-sm text-primary-300 hover:text-primary-200 hover:bg-primary-500/[0.12] transition-colors"
          aria-label="Open license portal"
        >
          <IconLink />
          Apply / check status at {permits.licensePortal}
        </a>
      )}
    </div>
  );
}

// ─── Full result ──────────────────────────────────────────────────────────────

function OfficeLocationResult({ plan }: { plan: OfficeLocationPlan }) {
  return (
    <div className="space-y-7">

      {/* Hero summary bar */}
      <div className="rounded-xl border border-primary-500/20 bg-gradient-to-r from-primary-500/[0.08] to-transparent px-5 py-4 space-y-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
          <span className="font-semibold text-white text-base">{plan.company}</span>
          <span>·</span>
          <span>{plan.industry}</span>
          <span>·</span>
          <span>{plan.location}</span>
          <span>·</span>
          <span>{plan.currentFunds}</span>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <span className="text-xs text-neutral-500">Best fit:</span>
          <span className="text-sm font-bold text-primary-300">{plan.bestFit}</span>
        </div>
      </div>

      {/* Advisor Analysis */}
      <Section icon={<IconBuilding />} title="Advisor Analysis">
        <AnalysisGrid analysis={plan.advisorAnalysis} />
      </Section>

      {/* Workspace Options */}
      <Section icon={<IconBuilding />} title="Workspace Options">
        <OptionsSection options={plan.options} />
      </Section>

      {/* Cost Breakdown */}
      <Section icon={<IconCash />} title="Cost Breakdown">
        <CostTable breakdown={plan.costBreakdown} />
      </Section>

      {/* Negotiation Tips */}
      {plan.leaseNegotiationPoints?.length > 0 && (
        <Section icon={<IconNegotiate />} title="Lease Negotiation Tips">
          <NegotiationList points={plan.leaseNegotiationPoints} />
        </Section>
      )}

      {/* Permits & Zoning */}
      <Section icon={<IconShield />} title="Permits & Zoning">
        <PermitsBlock permits={plan.permitsAndZoning} />
      </Section>

      {/* Verdict */}
      {plan.verdict && (
        <div className="rounded-xl border border-primary-500/25 bg-primary-500/[0.07] px-5 py-4 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-primary-400">Advisor Verdict</p>
          <p className="text-sm text-neutral-200 leading-relaxed">{plan.verdict}</p>
        </div>
      )}

      {/* Disclaimer */}
      {plan.disclaimer && (
        <p className="text-xs text-neutral-600 italic border-t border-white/[0.05] pt-4">{plan.disclaimer}</p>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

import { checkCache, writeCache, hashInputs } from '../../utils/widgetCache';

const CACHE_KEY = 'office-location';

interface OfficeLocationWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function OfficeLocationWidget({ profile, onGenerateRef, hideGenerateButton = false }: OfficeLocationWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [plan, setPlan] = useState<OfficeLocationPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const cacheInputs = {
    companyName: profile.companyName,
    industry: profile.industry,
    businessStage: profile.businessStage,
    city: profile.city,
    businessType: profile.businessType,
    currentFunds: profile.currentFunds,
  };

  useEffect(() => {
    const cached = checkCache<OfficeLocationPlan>(CACHE_KEY, cacheInputs);
    if (cached) {
      setPlan(cached.result);
      restoreSuccess();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<OfficeLocationPlan>(CACHE_KEY, cacheInputs);
    if (cached) {
      setPlan(cached.result);
      setParseError(null);
      restoreSuccess();
      return;
    }
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchOfficeLocation(profile);
        setPlan(result);
        writeCache(CACHE_KEY, hashInputs(cacheInputs), result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("The agent returned a response that couldn't be parsed. Try regenerating.");
          throw new Error("Failed to parse office location JSON.");
        }
        throw err;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Office & Location Finder"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Weighs your city, industry, and budget into a ranked workspace shortlist — with real RM costs, permit notes, and negotiation tips."
      idleButtonLabel="Suggest sites"
      regenerateLabel="Rerun search"
      hideGenerateButton={hideGenerateButton}
    >
      {parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <OfficeLocationResult plan={plan} />
      ) : null}
    </WidgetCard>
  );
}