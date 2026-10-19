/**
 * RiskAnalyzerWidget — Operations Section
 * UI design language mirrors CompetitorPricingWidget / SmartPricingWidget.
 * Schema from validateRiskAnalysis.ts.
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import { checkCache, writeCache, hashInputs } from "../../utils/widgetCache";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdvisorAnalysis {
  businessActivityAssumption: string;
  stageExposure: string;
  capitalExposure: string;
  regulatoryComplexity: string;
  researchFocus: string[];
}

interface RiskSummary {
  overallRating: string;
  biggestThreatNow: string;
  quickWin: string;
}

interface FinancialHealth {
  capitalPosition: string;
  mainConcern: string;
  reason: string;
}

interface Risk {
  riskNumber: number;
  category: string;
  riskName: string;
  level: string;
  whatItIs: string;
  whyItApplies: string;
  ifIgnored: string;
  fixIt: string[];
}

interface RegulatoryItem {
  item: string;
  authority: string;
  applicability: string;
  reason: string;
  action: string;
  portal: string;
}

interface NextAction {
  priority: number;
  action: string;
  reason: string;
}

interface RiskPlan {
  company: string;
  industry: string;
  businessStage: string;
  location: string;
  businessType: string;
  currentFunds: string | number;
  advisorAnalysis: AdvisorAnalysis;
  riskSummary: RiskSummary;
  financialHealth: FinancialHealth;
  risks: Risk[];
  regulatoryChecklist: RegulatoryItem[];
  nextActions: NextAction[];
  disclaimer: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchRiskAnalysis(profile: BusinessProfile): Promise<RiskPlan> {
  const res = await fetch(`${API_BASE}/api/bedrock/risk-analyzer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName: profile.companyName, industry: profile.industry,
      businessStage: profile.businessStage, city: profile.city,
      businessType: profile.businessType, currentFunds: profile.currentFunds,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  const data = (await res.json()) as { content: string };
  let s = data.content.trim();
  if (s.startsWith("```")) s = s.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  s = s.replace(/^<answer>\s*/i, "").replace(/\s*<\/answer>$/i, "").trim();
  const a = s.indexOf("{"), b = s.lastIndexOf("}");
  if (a !== -1 && b !== -1) s = s.slice(a, b + 1);
  return JSON.parse(s) as RiskPlan;
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

type RiskLevel = "Critical" | "High" | "Medium" | "Low";

function toLevel(raw: string): RiskLevel {
  const l = (raw ?? "").toLowerCase();
  if (l === "critical") return "Critical";
  if (l === "high") return "High";
  if (l === "medium") return "Medium";
  return "Low";
}

// Badge colours — mirrors competitionBadgeClass pattern from CompetitorPricingWidget
const LEVEL_BADGE: Record<RiskLevel, string> = {
  Critical: "bg-red-500/20 text-red-300 border border-red-500/30",
  High:     "bg-orange-500/20 text-orange-300 border border-orange-500/30",
  Medium:   "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  Low:      "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
};

const LEVEL_DOT: Record<RiskLevel, string> = {
  Critical: "bg-red-400",
  High:     "bg-orange-400",
  Medium:   "bg-amber-400",
  Low:      "bg-emerald-400",
};

const LEVEL_BAR: Record<RiskLevel, { color: string; width: string }> = {
  Critical: { color: "bg-red-500",    width: "w-full" },
  High:     { color: "bg-orange-500", width: "w-3/4"  },
  Medium:   { color: "bg-amber-500",  width: "w-1/2"  },
  Low:      { color: "bg-emerald-500",width: "w-1/4"  },
};

const LEVEL_ACCENT: Record<RiskLevel, string> = {
  Critical: "border-l-red-500",
  High:     "border-l-orange-500",
  Medium:   "border-l-amber-500",
  Low:      "border-l-emerald-500",
};

const OVERALL_RATING_STYLE: Record<string, { border: string; bg: string; text: string }> = {
  Critical: { border: "border-red-500/30",    bg: "bg-red-500/10",    text: "text-red-300"    },
  High:     { border: "border-orange-500/30", bg: "bg-orange-500/10", text: "text-orange-300" },
  Medium:   { border: "border-amber-500/30",  bg: "bg-amber-500/10",  text: "text-amber-300"  },
  Low:      { border: "border-emerald-500/30",bg: "bg-emerald-500/10",text: "text-emerald-300"},
};

const CAPITAL_PILL: Record<string, string> = {
  "Comfortable": "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
  "Manageable":  "bg-primary-500/20 text-primary-300 border border-primary-500/30",
  "Tight":       "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  "High Risk":   "bg-red-500/20 text-red-300 border border-red-500/30",
};

const APPLICABILITY_PILL: Record<string, string> = {
  "Mandatory":             "bg-red-500/20 text-red-300 border border-red-500/30",
  "Conditional":           "bg-amber-500/20 text-amber-300 border border-amber-500/30",
  "Optional":              "bg-primary-500/20 text-primary-300 border border-primary-500/30",
  "Confirm applicability": "bg-neutral-500/20 text-neutral-300 border border-neutral-500/30",
};

// ─── Stat box (mirrors SmartPricingWidget stat boxes) ─────────────────────────

function StatBox({ label, value, highlight }: {
  label: string; value: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-2.5 min-w-0 dark:border-white/[0.08] dark:bg-[#101018]">
      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-widest font-medium whitespace-normal leading-snug">
        {label}
      </p>
      <p className={`text-sm font-bold leading-tight break-words ${highlight ? "text-amber-300" : "text-neutral-900 dark:text-white"}`}>
        {value}
      </p>
    </div>
  );
}

// ─── Risk card (mirrors CompetitorCard) ───────────────────────────────────────

function RiskCard({ risk, isOpen, onToggle }: {
  risk: Risk; isOpen: boolean; onToggle: () => void;
}) {
  const level = toLevel(risk.level);
  const fixIt = arr(risk.fixIt);

  return (
    <div className="rounded-xl border border-neutral-200 bg-white min-w-0 overflow-hidden hover:-translate-y-0.5 transition-transform duration-200 dark:border-white/[0.08] dark:bg-[#101018]">
      {/* Header row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left cursor-pointer hover:bg-neutral-50 dark:hover:bg-white/[0.02] transition-colors"
        aria-expanded={isOpen}
      >
        <span className={`mt-1.5 shrink-0 h-2 w-2 rounded-full ${LEVEL_DOT[level]}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <span className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug min-w-0 break-words">
              {str(risk.riskName)}
            </span>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${LEVEL_BADGE[level]}`}>
              {level}
            </span>
          </div>
          {ok(risk.category) && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 break-words">{risk.category}</p>
          )}
          {/* Severity bar */}
          <div className="mt-2 w-full h-1 rounded-full bg-neutral-100 dark:bg-white/[0.08] overflow-hidden">
            <div className={`h-full rounded-full ${LEVEL_BAR[level].color} ${LEVEL_BAR[level].width}`} />
          </div>
        </div>
        <svg
          className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform duration-200 mt-0.5 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div className={`border-t border-neutral-100 dark:border-white/[0.06] border-l-4 ${LEVEL_ACCENT[level]} px-4 pb-4 pt-3 space-y-3`}>
          {ok(risk.whatItIs) && (
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{risk.whatItIs}</p>
          )}
          {ok(risk.whyItApplies) && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 mb-1">Why It Applies</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">{risk.whyItApplies}</p>
            </div>
          )}
          {/* If Ignored — styled like the ⚠ Watch Out block in CompetitorPricing */}
          {ok(risk.ifIgnored) && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 flex gap-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden></span>
              <div>
                <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-widest mb-0.5">If Ignored</p>
                <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">{risk.ifIgnored}</p>
              </div>
            </div>
          )}
          {/* Fix it steps */}
          {fixIt.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 mb-2">How to Fix It</p>
              <ol className="space-y-1.5">
                {fixIt.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-[9px] font-bold mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Full result ──────────────────────────────────────────────────────────────

function RiskResult({ plan }: { plan: RiskPlan }) {
  const [openRisk, setOpenRisk] = useState<number | null>(0);

  const summary    = plan.riskSummary;
  const health     = plan.financialHealth;
  const level      = toLevel(summary?.overallRating ?? "");
  const ratingStyle = OVERALL_RATING_STYLE[level] ?? OVERALL_RATING_STYLE.Medium;
  const capPill    = health ? (CAPITAL_PILL[health.capitalPosition] ?? CAPITAL_PILL.Manageable) : "";

  const nextA = plan.nextActions ?? [];
  const regC  = plan.regulatoryChecklist ?? [];
  const focus = arr(plan.advisorAnalysis?.researchFocus);

  return (
    <div className="flex flex-col gap-5">

      {/* ── Stat boxes (mirrors SmartPricing overview grid) ── */}
      <div className="grid grid-cols-3 gap-2 min-w-0">
        <div className={`rounded-xl border p-2.5 min-w-0 col-span-1 ${ratingStyle.border} ${ratingStyle.bg}`}>
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-widest font-medium">Overall</p>
          <p className={`text-base font-extrabold leading-tight ${ratingStyle.text}`}>{str(summary?.overallRating)}</p>
        </div>
        {health && ok(health.capitalPosition) && (
          <div className="rounded-xl border border-neutral-200 bg-white p-2.5 min-w-0 dark:border-white/[0.08] dark:bg-[#101018]">
            <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-widest font-medium">Capital</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${capPill}`}>{health.capitalPosition}</span>
          </div>
        )}
        <div className="rounded-xl border border-neutral-200 bg-white p-2.5 min-w-0 dark:border-white/[0.08] dark:bg-[#101018]">
          <p className="text-[10px] text-neutral-400 dark:text-neutral-500 mb-1 uppercase tracking-widest font-medium">Risks Found</p>
          <p className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight">{plan.risks?.length ?? 0}</p>
        </div>
      </div>

      {/* ── Biggest threat + Quick win callouts ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {ok(summary?.biggestThreatNow) && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 flex gap-3 dark:border-amber-500/30 dark:bg-amber-500/10">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden></span>
            <div>
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-0.5">Biggest Threat Now</p>
              <p className="text-xs text-amber-800 dark:text-amber-200/80 leading-relaxed">{summary.biggestThreatNow}</p>
            </div>
          </div>
        )}
        {ok(summary?.quickWin) && (
          <div className="rounded-xl border border-primary-200 bg-primary-50 p-4 flex gap-3 dark:border-primary-500/30 dark:bg-primary-500/10">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary-400" aria-hidden></span>
            <div>
              <p className="text-xs font-semibold text-primary-700 dark:text-primary-300 mb-0.5">Quick Win</p>
              <p className="text-xs text-primary-800 dark:text-primary-300/80 leading-relaxed">{summary.quickWin}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Risk cards ── */}
      {plan.risks?.length > 0 && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-2 -mb-3">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500">
              Risks Identified
            </p>
            {/* Level count chips */}
            <div className="flex flex-wrap gap-1.5">
              {(["Critical", "High", "Medium", "Low"] as RiskLevel[]).map((l) => {
                const n = plan.risks.filter((r) => toLevel(r.level) === l).length;
                if (!n) return null;
                return (
                  <span key={l} className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LEVEL_BADGE[l]}`}>
                    {n} {l}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {plan.risks.map((risk, i) => (
              <RiskCard
                key={risk.riskNumber ?? i}
                risk={risk}
                isOpen={openRisk === i}
                onToggle={() => setOpenRisk(openRisk === i ? null : i)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Next Actions (mirrors Bottom Line block style) ── */}
      {nextA.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 -mb-3">
            Next Actions
          </p>
          <div className="flex flex-col gap-2">
            {nextA.map((action, i) => (
              <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3 flex items-start gap-3 dark:border-white/[0.08] dark:bg-[#101018]">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-300 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {action.priority ?? i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug break-words">{str(action.action)}</p>
                  {ok(action.reason) && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5 leading-relaxed">{action.reason}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Regulatory Checklist ── */}
      {regC.length > 0 && (
        <>
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 -mb-3">
            Regulatory Checklist
          </p>
          <div className="flex flex-col gap-2">
            {regC.map((item, i) => {
              const appPill = APPLICABILITY_PILL[item.applicability] ?? APPLICABILITY_PILL["Confirm applicability"];
              return (
                <div key={i} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/[0.08] dark:bg-[#101018]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="font-semibold text-neutral-900 dark:text-white text-sm leading-snug min-w-0 break-words">{str(item.item)}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${appPill}`}>{str(item.applicability)}</span>
                  </div>
                  {ok(item.authority) && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-1.5">{item.authority}</p>
                  )}
                  {ok(item.action) && (
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-relaxed">
                      <span className="font-bold">→</span> {item.action}
                    </p>
                  )}
                  {ok(item.portal) && (
                    <a href={str(item.portal)} target="_blank" rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs text-primary-600 dark:text-primary-300 underline underline-offset-2 break-words">
                      Apply here ↗
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── Advisor Context (collapsed in a bottom-line style box) ── */}
      {plan.advisorAnalysis && (ok(plan.advisorAnalysis.businessActivityAssumption) || focus.length > 0) && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-white/[0.08] dark:bg-[#101018]">
          <p className="text-[10px] uppercase tracking-widest font-semibold text-neutral-400 dark:text-neutral-500 mb-2">Advisor Context</p>
          {ok(plan.advisorAnalysis.businessActivityAssumption) && (
            <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed mb-2">{plan.advisorAnalysis.businessActivityAssumption}</p>
          )}
          <div className="flex flex-wrap gap-2">
            {ok(plan.advisorAnalysis.regulatoryComplexity) && (
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${{ Low: "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30", Medium: "bg-amber-500/20 text-amber-300 border border-amber-500/30", High: "bg-red-500/20 text-red-300 border border-red-500/30" }[plan.advisorAnalysis.regulatoryComplexity] ?? "bg-neutral-500/20 text-neutral-300 border border-neutral-500/30"}`}>
                {plan.advisorAnalysis.regulatoryComplexity} Regulatory Complexity
              </span>
            )}
            {focus.map((f, i) => (
              <span key={i} className="rounded-full border border-neutral-200 dark:border-white/10 bg-white dark:bg-white/[0.05] px-2.5 py-0.5 text-[10px] text-neutral-600 dark:text-neutral-300">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {ok(plan.disclaimer) && (
        <div className="border-t border-neutral-200 dark:border-white/[0.08] pt-3">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 leading-relaxed italic">{plan.disclaimer}</p>
        </div>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

const CACHE_KEY = "risk-analyzer";

interface RiskAnalyzerWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function RiskAnalyzerWidget({
  profile, onGenerateRef, hideGenerateButton = false,
}: RiskAnalyzerWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [plan, setPlan]             = useState<RiskPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const cacheInputs = {
    companyName: profile.companyName, industry: profile.industry,
    businessStage: profile.businessStage, city: profile.city,
    businessType: profile.businessType, currentFunds: profile.currentFunds,
  };

  useEffect(() => {
    const cached = checkCache<RiskPlan>(CACHE_KEY, cacheInputs);
    if (cached) { setPlan(cached.result); restoreSuccess(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<RiskPlan>(CACHE_KEY, cacheInputs);
    if (cached) { setPlan(cached.result); setParseError(null); restoreSuccess(); return; }
    setPlan(null); setParseError(null);
    await generate(async () => {
      try {
        const result = await fetchRiskAnalysis(profile);
        setPlan(result);
        writeCache(CACHE_KEY, hashInputs(cacheInputs), result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("The agent returned a response that couldn't be parsed. Try regenerating.");
          throw new Error("Failed to parse risk analysis JSON.");
        }
        throw err;
      }
    });
  }, [profile, generate]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { onGenerateRef?.(handleGenerate); }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Risk & Regulations Analyzer"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Flags your top regulatory and operational risks — with severity ratings, consequences, and step-by-step fixes."
      idleButtonLabel="Scan risks"
      regenerateLabel="Scan again"
      hideGenerateButton={hideGenerateButton}
    >
      {parseError ? (
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-xs text-red-800 dark:text-red-200">{parseError}</p>
        </div>
      ) : plan ? <RiskResult plan={plan} /> : null}
    </WidgetCard>
  );
}
