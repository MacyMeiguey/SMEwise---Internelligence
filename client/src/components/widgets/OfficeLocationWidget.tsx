/**
 * OfficeLocationWidget — scannable at a glance.
 * Key info surfaces immediately; details expand on demand.
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import { checkCache, writeCache, hashInputs } from "../../utils/widgetCache";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorAnalysis {
  businessModelAssumption: string;
  businessActivity: string;
  customerAccessNeed: string;
  storageNeed: string;
  locationDependency: string;
  primarySpaceType: string;
  secondarySpaceType: string;
  requiredFacilities: string[];
  stageCommitment: string;
  budgetVerdict: string;
  keyConstraint: string;
}

interface BestFit {
  spaceType: string;
  reason: string;
  idealAreaCharacteristics: string[] | string;
}

interface SpaceOption {
  rank: number;
  label: string;
  name: string;
  type: string;
  area: string;
  locationMatch: string;
  rentalEvidence: string;
  whyItFits: string;
  estimatedCost: string;
  url: string;
  urlVerified: boolean;
  availability: string;
  headsUp: string;
  spaceNeeded?: string;
  namedOptions?: string[];
  namedSpaces?: string[];
  whereToSearch?: string;
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
  bestFit: BestFit;
  options: SpaceOption[];
  costBreakdown: CostBreakdown;
  leaseNegotiationPoints: string[];
  permitsAndZoning: PermitsAndZoning;
  verdict: string;
  disclaimer: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ok(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v).trim();
  return !!s && s !== "null" && s !== "undefined" && s !== "N/A";
}
function str(v: unknown) { return ok(v) ? String(v).trim() : ""; }
function arr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x).trim()).filter(Boolean);
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchOfficeLocation(profile: BusinessProfile): Promise<OfficeLocationPlan> {
  const res = await fetch(`${API_BASE}/api/bedrock/office-location`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: profile.companyName,
      industry: profile.industry,
      businessStage: profile.businessStage,
      city: profile.city,
      businessType: profile.businessType,
      currentFunds: profile.currentFunds,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { content: OfficeLocationPlan | string };
  if (typeof data.content === "string") {
    let s = (data.content as string).trim();
    if (s.startsWith("```")) s = s.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
    s = s.replace(/^<answer>\s*/i, "").replace(/\s*<\/answer>$/i, "").trim();
    const a = s.indexOf("{"), b = s.lastIndexOf("}");
    if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
    return JSON.parse(s) as OfficeLocationPlan;
  }
  return data.content;
}

// ─── Accordion row ────────────────────────────────────────────────────────────

function AccordionRow({
  icon, title, badge, children,
}: {
  icon: string; title: string; badge?: React.ReactNode; children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-neutral-200 bg-white dark:border-white/[0.08] dark:bg-white/[0.02] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 dark:hover:bg-white/[0.03] transition-colors"
        aria-expanded={open}
      >
        <span className="text-base shrink-0">{icon}</span>
        <span className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-200">{title}</span>
        {badge && <span className="shrink-0">{badge}</span>}
        <svg
          className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-100 dark:border-white/[0.05]">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color = "neutral" }: {
  label: string; value: string;
  color?: "neutral" | "emerald" | "amber" | "primary" | "rose";
}) {
  const text = {
    neutral: "text-neutral-800 dark:text-neutral-100",
    emerald: "text-emerald-700 dark:text-emerald-300",
    amber:   "text-amber-700 dark:text-amber-300",
    primary: "text-primary-700 dark:text-primary-300",
    rose:    "text-rose-700 dark:text-rose-300",
  }[color];
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-white/[0.03] px-3 py-2.5 min-w-0">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">{label}</span>
      <span className={`text-sm font-bold leading-snug break-words ${text}`}>{value}</span>
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

function Badge({ children, variant = "neutral" }: {
  children: React.ReactNode;
  variant?: "neutral" | "emerald" | "amber" | "rose" | "blue";
}) {
  const cls = {
    neutral: "border-neutral-300 dark:border-white/[0.12] bg-neutral-50 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300",
    emerald: "border-emerald-300 dark:border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
    amber:   "border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
    rose:    "border-rose-300 dark:border-rose-600/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
    blue:    "border-blue-300 dark:border-blue-600/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
  }[variant];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

// ─── Key stats strip (always visible) ────────────────────────────────────────

function StatsStrip({ plan }: { plan: OfficeLocationPlan }) {
  const a = plan.advisorAnalysis;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
      {ok(plan.bestFit?.spaceType)    && <StatPill label="Best Fit"   value={plan.bestFit.spaceType}    color="primary" />}
      {ok(plan.costBreakdown?.totalMonthly) && <StatPill label="Total/Month" value={plan.costBreakdown.totalMonthly} color="emerald" />}
      {ok(a?.primarySpaceType)        && <StatPill label="Space Type" value={a.primarySpaceType}          color="neutral" />}
      {ok(a?.stageCommitment)         && <StatPill label="Commitment" value={a.stageCommitment}            color="neutral" />}
      {ok(a?.budgetVerdict)           && <StatPill label="Budget"     value={a.budgetVerdict}              color="neutral" />}
      {ok(a?.keyConstraint)           && <StatPill label="Constraint" value={a.keyConstraint}              color="amber"   />}
    </div>
  );
}

// ─── Workspace options cards ──────────────────────────────────────────────────

const OPT_PALETTE = [
  { border: "border-amber-300 dark:border-amber-600/50",  bg: "bg-amber-50 dark:bg-amber-950/30",  badge: "bg-amber-100 dark:bg-amber-800/60 text-amber-800 dark:text-amber-200",   cost: "text-amber-700 dark:text-amber-300"   },
  { border: "border-blue-300 dark:border-blue-600/50",    bg: "bg-blue-50 dark:bg-blue-950/30",    badge: "bg-blue-100 dark:bg-blue-800/60 text-blue-800 dark:text-blue-200",         cost: "text-blue-700 dark:text-blue-300"     },
  { border: "border-violet-300 dark:border-violet-600/50",bg: "bg-violet-50 dark:bg-violet-950/30",badge: "bg-violet-100 dark:bg-violet-800/60 text-violet-800 dark:text-violet-200",cost: "text-violet-700 dark:text-violet-300" },
];

function OptionCard({ option, index }: { option: SpaceOption; index: number }) {
  const s = OPT_PALETTE[index % OPT_PALETTE.length];
  const [open, setOpen] = useState(false);
  const venues = arr(option.namedOptions ?? option.namedSpaces);
  const isValidUrl =
    typeof option.url === "string" && option.url !== "N/A" && option.url.startsWith("https://");

  return (
    <div className={`rounded-xl border ${s.border} overflow-hidden bg-white dark:bg-[#101018]`}>
      {/* Always-visible header */}
      <div className={`flex items-center gap-3 px-4 py-3 ${s.bg}`}>
        <div className={`w-7 h-7 rounded-full ${s.badge} flex items-center justify-center text-xs font-bold shrink-0`}>
          {option.rank ?? index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-neutral-900 dark:text-white truncate">
            {str(option.name) || str(option.type) || `Option ${index + 1}`}
          </p>
          {ok(option.area) && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{option.area}</p>
          )}
        </div>
        {ok(option.estimatedCost) && (
          <span className={`text-sm font-extrabold shrink-0 ${s.cost}`}>{option.estimatedCost}</span>
        )}
      </div>

      {/* Quick chips row */}
      <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-t border-neutral-100 dark:border-white/[0.05]">
        {ok(option.label)        && <Badge variant="neutral">{option.label}</Badge>}
        {ok(option.availability) && <Badge variant="blue">{option.availability}</Badge>}
        {option.urlVerified === true && <Badge variant="emerald">✓ Verified</Badge>}
      </div>

      {/* Expand toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs text-neutral-500 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors border-t border-neutral-100 dark:border-white/[0.05]"
        aria-expanded={open}
      >
        <span>{open ? "Show less" : "Show details"}</span>
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-2 border-t border-neutral-100 dark:border-white/[0.05] space-y-3">
          {ok(option.whyItFits) && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{option.whyItFits}</p>
          )}
          {ok(option.locationMatch) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Location Match</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{option.locationMatch}</p>
            </div>
          )}
          {ok(option.rentalEvidence) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Rental Evidence</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{option.rentalEvidence}</p>
            </div>
          )}
          {venues.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Suggested Spaces</p>
              <div className="flex flex-wrap gap-1.5">
                {venues.map((v, i) => (
                  <span key={i} className="rounded-full border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.05] px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
                    {v}
                  </span>
                ))}
              </div>
            </div>
          )}
          {ok(option.whereToSearch) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Where to Search</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{option.whereToSearch}</p>
            </div>
          )}
          {isValidUrl && (
            <a href={option.url} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-300 underline underline-offset-2 hover:opacity-80 transition-opacity">
              View listing ↗
            </a>
          )}
          {ok(option.headsUp) && (
            <div className="rounded-lg border-l-4 border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/20 pl-3 pr-3 py-2">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-0.5">Heads Up</p>
              <p className="text-sm text-amber-700 dark:text-amber-200 leading-relaxed">{option.headsUp}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Cost table ───────────────────────────────────────────────────────────────

function CostTable({ c }: { c: CostBreakdown }) {
  const rows = [
    { label: "Rental",    value: c.rental },
    { label: "Deposit",   value: c.deposit },
    { label: "Utilities", value: c.utilities },
    { label: "Fit-Out",   value: c.fitOut },
  ].filter((r) => ok(r.value));

  const isAffordable =
    typeof c.affordabilityCheck === "string" &&
    c.affordabilityCheck.toLowerCase().startsWith("yes");

  return (
    <div className="space-y-3 pt-2">
      {rows.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/[0.08] overflow-hidden">
          {rows.map(({ label, value }, i) => (
            <div key={label}
              className={`flex items-center justify-between px-3 py-2.5 text-sm ${i < rows.length - 1 ? "border-b border-neutral-100 dark:border-white/[0.05]" : ""}`}>
              <span className="text-neutral-500 dark:text-neutral-400">{label}</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200 tabular-nums">{value}</span>
            </div>
          ))}
          {ok(c.totalMonthly) && (
            <div className="flex items-center justify-between px-3 py-3 bg-neutral-50 dark:bg-white/[0.04] border-t border-neutral-200 dark:border-white/[0.08]">
              <span className="text-sm font-bold text-neutral-900 dark:text-white">Total / Month</span>
              <span className="text-base font-extrabold text-primary-600 dark:text-primary-300 tabular-nums">{c.totalMonthly}</span>
            </div>
          )}
        </div>
      )}
      {ok(c.affordabilityCheck) && (
        <div className={`rounded-xl border-l-4 pl-3 py-2 pr-3 ${isAffordable ? "border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20" : "border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/20"}`}>
          <p className={`text-sm leading-relaxed font-medium ${isAffordable ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>
            {isAffordable ? "✅" : "⚠️"} {c.affordabilityCheck}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Permits grid ─────────────────────────────────────────────────────────────

function PermitsGrid({ p }: { p: PermitsAndZoning }) {
  const licenseRequired =
    p.businessPremiseLicenseRequired === true ||
    String(p.businessPremiseLicenseRequired).toLowerCase() === "yes";
  const zoningRequired =
    p.zoningApprovalNeeded === true ||
    String(p.zoningApprovalNeeded).toLowerCase() === "yes";

  return (
    <div className="space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-neutral-100 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Premise License</p>
          <Badge variant={licenseRequired ? "amber" : "emerald"}>
            {licenseRequired ? "⚠ Required" : "✓ Not Required"}
          </Badge>
        </div>
        <div className="rounded-xl border border-neutral-100 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Zoning Approval</p>
          <Badge variant={zoningRequired ? "amber" : "emerald"}>
            {zoningRequired ? "⚠ Required" : "✓ Not Required"}
          </Badge>
        </div>
        {ok(p.localCouncil) && (
          <div className="rounded-xl border border-neutral-100 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Local Council</p>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{p.localCouncil}</p>
          </div>
        )}
        {ok(p.industrySpecificPermit) && (
          <div className="rounded-xl border border-neutral-100 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Industry Permit</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{p.industrySpecificPermit}</p>
          </div>
        )}
      </div>
      {ok(p.licensePortal) && (
        <a href={str(p.licensePortal)} target="_blank" rel="noopener noreferrer"
          className="inline-flex text-sm text-primary-600 dark:text-primary-300 underline underline-offset-2 hover:opacity-80 transition-opacity">
          Apply / check status ↗
        </a>
      )}
    </div>
  );
}

// ─── Full result ──────────────────────────────────────────────────────────────

function OfficeLocationResult({ plan }: { plan: OfficeLocationPlan }) {
  const a    = plan.advisorAnalysis;
  const chars = arr(
    typeof plan.bestFit?.idealAreaCharacteristics === "string"
      ? [plan.bestFit.idealAreaCharacteristics]
      : plan.bestFit?.idealAreaCharacteristics
  );
  const tips = arr(plan.leaseNegotiationPoints);

  return (
    <div className="space-y-3 font-sans max-w-none">

      {/* ① At-a-glance stats */}
      <StatsStrip plan={plan} />

      {/* ② Best Fit — always visible, compact */}
      {ok(plan.bestFit?.spaceType) && (
        <div className="rounded-xl border border-primary-200 dark:border-primary-500/20 bg-primary-50 dark:bg-primary-500/[0.06] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-0.5">
                🏆 Best Fit
              </p>
              <p className="text-base font-bold text-primary-700 dark:text-primary-300 leading-snug">
                {plan.bestFit.spaceType}
              </p>
            </div>
            {ok(plan.bestFit.reason) && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-[55%] text-right leading-relaxed hidden sm:block">
                {plan.bestFit.reason}
              </p>
            )}
          </div>
          {ok(plan.bestFit.reason) && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed sm:hidden">
              {plan.bestFit.reason}
            </p>
          )}
          {chars.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {chars.map((c, i) => <Badge key={i} variant="neutral">{c}</Badge>)}
            </div>
          )}
        </div>
      )}

      {/* ③ Workspace Options — always visible */}
      {plan.options?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 px-0.5">
            Workspace Options
          </p>
          {plan.options.map((opt, i) => (
            <OptionCard key={opt.rank ?? i} option={opt} index={i} />
          ))}
        </div>
      )}

      {/* ④ Cost Breakdown — accordion */}
      {plan.costBreakdown && ok(plan.costBreakdown.totalMonthly) && (
        <AccordionRow
          icon="💰"
          title="Cost Breakdown"
          badge={
            <span className="text-sm font-extrabold text-primary-600 dark:text-primary-300 tabular-nums">
              {plan.costBreakdown.totalMonthly}
            </span>
          }
        >
          <CostTable c={plan.costBreakdown} />
        </AccordionRow>
      )}

      {/* ⑤ Analysis details — accordion */}
      {a && (
        <AccordionRow icon="🔍" title="Space Analysis"
          badge={ok(a.primarySpaceType) ? <Badge variant="neutral">{a.primarySpaceType}</Badge> : undefined}
        >
          <div className="pt-2 space-y-2">
            {[
              { label: "Commitment",         value: a.stageCommitment    },
              { label: "Location Dependency", value: a.locationDependency },
              { label: "Customer Access",     value: a.customerAccessNeed },
              { label: "Storage Need",        value: a.storageNeed        },
              { label: "Key Constraint",      value: a.keyConstraint      },
              { label: "Budget Verdict",      value: a.budgetVerdict      },
            ].filter(r => ok(r.value)).map(({ label, value }) => (
              <div key={label} className="flex items-start gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 w-28 shrink-0 pt-0.5">{label}</span>
                <span className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">{value}</span>
              </div>
            ))}
            {arr(a.requiredFacilities).length > 0 && (
              <div className="flex items-start gap-2 pt-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 w-28 shrink-0 pt-0.5">Facilities</span>
                <div className="flex flex-wrap gap-1">
                  {arr(a.requiredFacilities).map((f, i) => <Badge key={i} variant="neutral">{f}</Badge>)}
                </div>
              </div>
            )}
          </div>
        </AccordionRow>
      )}

      {/* ⑥ Permits — accordion */}
      {plan.permitsAndZoning && (
        <AccordionRow icon="📋" title="Permits & Zoning">
          <PermitsGrid p={plan.permitsAndZoning} />
        </AccordionRow>
      )}

      {/* ⑦ Negotiation Tips — accordion */}
      {tips.length > 0 && (
        <AccordionRow icon="🤝" title={`${tips.length} Lease Negotiation Tips`}>
          <ol className="pt-2 space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-600 dark:text-neutral-300">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-600 dark:text-primary-300 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {i + 1}
                </span>
                {tip}
              </li>
            ))}
          </ol>
        </AccordionRow>
      )}

      {/* ⑧ Verdict */}
      {ok(plan.verdict) && (
        <div className="rounded-xl border-l-4 border-primary-400 dark:border-primary-500 bg-primary-50 dark:bg-primary-500/[0.05] pl-4 pr-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary-500 dark:text-primary-400 mb-1">Advisor Verdict</p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">{plan.verdict}</p>
        </div>
      )}

      {ok(plan.disclaimer) && (
        <p className="text-[10px] text-neutral-400 italic border-t border-neutral-100 dark:border-white/[0.05] pt-3">
          {plan.disclaimer}
        </p>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

const CACHE_KEY = "office-location";

interface OfficeLocationWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function OfficeLocationWidget({
  profile, onGenerateRef, hideGenerateButton = false,
}: OfficeLocationWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [plan, setPlan]           = useState<OfficeLocationPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const cacheInputs = {
    companyName:   profile.companyName,
    industry:      profile.industry,
    businessStage: profile.businessStage,
    city:          profile.city,
    businessType:  profile.businessType,
    currentFunds:  profile.currentFunds,
  };

  useEffect(() => {
    const cached = checkCache<OfficeLocationPlan>(CACHE_KEY, cacheInputs);
    if (cached) { setPlan(cached.result); restoreSuccess(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<OfficeLocationPlan>(CACHE_KEY, cacheInputs);
    if (cached) { setPlan(cached.result); setParseError(null); restoreSuccess(); return; }
    setPlan(null); setParseError(null);
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
  }, [profile, generate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onGenerateRef?.(handleGenerate); }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Office & Location Finder"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Weighs your city, industry, and budget into a ranked workspace shortlist — with real RM costs, permit notes, and negotiation tips."
      idleButtonLabel="Find spaces"
      regenerateLabel="Search again"
      hideGenerateButton={hideGenerateButton}
    >
      {parseError ? (
        <div className="rounded-lg border border-rose-200 dark:border-red-500/30 bg-rose-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-sm text-rose-800 dark:text-red-200">{parseError}</p>
        </div>
      ) : plan ? <OfficeLocationResult plan={plan} /> : null}
    </WidgetCard>
  );
}
