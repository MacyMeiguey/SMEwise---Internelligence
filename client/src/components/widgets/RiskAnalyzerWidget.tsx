/**
 * RiskAnalyzerWidget — scannable at a glance.
 * Key info surfaces immediately; details expand on demand.
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

const LEVEL: Record<RiskLevel, {
  badge: string; bar: string; barW: string; dot: string; accent: string; rowBg: string;
}> = {
  Critical: { badge: "border-rose-300 dark:border-rose-600/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",           bar: "bg-rose-500",   barW: "w-full", dot: "bg-rose-500",   accent: "border-l-rose-500",   rowBg: "bg-rose-50 dark:bg-rose-950/20"     },
  High:     { badge: "border-orange-300 dark:border-orange-600/50 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-300", bar: "bg-orange-500", barW: "w-3/4",  dot: "bg-orange-500", accent: "border-l-orange-500", rowBg: "bg-orange-50 dark:bg-orange-950/20" },
  Medium:   { badge: "border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",       bar: "bg-amber-500",  barW: "w-1/2",  dot: "bg-amber-500",  accent: "border-l-amber-500",  rowBg: "bg-amber-50 dark:bg-amber-950/20"   },
  Low:      { badge: "border-emerald-300 dark:border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300", bar: "bg-emerald-500", barW: "w-1/4", dot: "bg-emerald-500", accent: "border-l-emerald-500", rowBg: "bg-emerald-50 dark:bg-emerald-950/20" },
};

const OVERALL: Record<string, { border: string; bg: string; text: string }> = {
  Critical: { border: "border-rose-300 dark:border-rose-600/50",    bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-700 dark:text-rose-300"       },
  High:     { border: "border-orange-300 dark:border-orange-600/50",bg: "bg-orange-50 dark:bg-orange-950/30",   text: "text-orange-700 dark:text-orange-300"   },
  Medium:   { border: "border-amber-300 dark:border-amber-600/50",  bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-300"     },
  Low:      { border: "border-emerald-300 dark:border-emerald-600/50",bg:"bg-emerald-50 dark:bg-emerald-950/30",text:"text-emerald-700 dark:text-emerald-300"  },
};

const CAPITAL: Record<string, string> = {
  "Comfortable": "border-emerald-300 dark:border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
  "Manageable":  "border-blue-300 dark:border-blue-600/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
  "Tight":       "border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  "High Risk":   "border-rose-300 dark:border-rose-600/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
};

const APPLICABILITY: Record<string, string> = {
  "Mandatory":             "border-rose-300 dark:border-rose-600/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
  "Conditional":           "border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
  "Optional":              "border-blue-300 dark:border-blue-600/50 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
  "Confirm applicability": "border-neutral-300 dark:border-white/[0.12] bg-neutral-50 dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-400",
};

// ─── Shared primitives ────────────────────────────────────────────────────────

function Badge({ children, cls }: { children: React.ReactNode; cls: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

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

// ─── Header summary (always visible) ─────────────────────────────────────────

function SummaryHeader({ summary, company, health }: {
  summary: RiskSummary; company: string; health?: FinancialHealth;
}) {
  const level = toLevel(summary.overallRating);
  const s     = OVERALL[level] ?? OVERALL.Medium;
  const capCls = health ? (CAPITAL[health.capitalPosition] ?? CAPITAL.Manageable) : "";

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 mb-3`}>
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Overall Risk</p>
          <p className="text-lg font-bold text-neutral-900 dark:text-white">{str(company)}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-base font-extrabold px-3 py-1 rounded-xl border ${s.border} ${s.bg} ${s.text}`}>
            {str(summary.overallRating)}
          </span>
          {health && ok(health.capitalPosition) && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${capCls}`}>
              💰 {health.capitalPosition}
            </span>
          )}
        </div>
      </div>

      {/* Threat + Quick Win */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-neutral-200/60 dark:border-white/[0.06]">
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">🔥 Biggest Threat</p>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">{str(summary.biggestThreatNow) || "—"}</p>
        </div>
        <div className="rounded-lg border border-neutral-200 dark:border-white/[0.06] bg-white/70 dark:bg-white/[0.02] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">⚡ Quick Win</p>
          <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200 leading-snug">{str(summary.quickWin) || "—"}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Risk accordion row ───────────────────────────────────────────────────────

function RiskRow({ risk, isOpen, onToggle }: { risk: Risk; isOpen: boolean; onToggle: () => void }) {
  const level = toLevel(risk.level);
  const s     = LEVEL[level];
  const fixIt = arr(risk.fixIt);

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left cursor-pointer transition-colors ${isOpen ? s.rowBg : "hover:bg-neutral-50 dark:hover:bg-white/[0.02]"}`}
        aria-expanded={isOpen}
      >
        <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{str(risk.riskName)}</p>
          {ok(risk.category) && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{risk.category}</p>
          )}
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <div className="w-14 h-1.5 rounded-full bg-neutral-100 dark:bg-white/[0.08] overflow-hidden">
            <div className={`h-full rounded-full ${s.bar} ${s.barW}`} />
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badge}`}>{level}</span>
        <svg
          className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className={`px-4 pb-4 pt-3 border-t border-neutral-100 dark:border-white/[0.06] border-l-4 ${s.accent} space-y-3`}>
          {ok(risk.whatItIs) && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{risk.whatItIs}</p>
          )}
          {ok(risk.whyItApplies) && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Why It Applies</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{risk.whyItApplies}</p>
            </div>
          )}
          {ok(risk.ifIgnored) && (
            <div className={`rounded-lg border-l-4 ${s.accent} pl-3 pr-3 py-2 bg-neutral-50 dark:bg-white/[0.02]`}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">If Ignored</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{risk.ifIgnored}</p>
            </div>
          )}
          {fixIt.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">✓ Fix It</p>
              <ol className="space-y-1.5">
                {fixIt.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-300">
                    <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[9px] font-bold mt-0.5">
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

// ─── Risk overview chips ──────────────────────────────────────────────────────

function RiskChips({ risks }: { risks: Risk[] }) {
  const counts: Partial<Record<RiskLevel, number>> = {};
  risks.forEach((r) => { const l = toLevel(r.level); counts[l] = (counts[l] ?? 0) + 1; });
  return (
    <div className="flex flex-wrap gap-1.5">
      {(["Critical", "High", "Medium", "Low"] as RiskLevel[]).filter((l) => counts[l]).map((l) => (
        <Badge key={l} cls={LEVEL[l].badge}>
          <span className={`h-1.5 w-1.5 rounded-full ${LEVEL[l].dot}`} />
          {counts[l]} {l}
        </Badge>
      ))}
    </div>
  );
}

// ─── Full result ──────────────────────────────────────────────────────────────

function RiskResult({ plan }: { plan: RiskPlan }) {
  const [openRisk, setOpenRisk] = useState<number | null>(0);

  const focus  = arr(plan.advisorAnalysis?.researchFocus);
  const nextA  = plan.nextActions ?? [];
  const regC   = plan.regulatoryChecklist ?? [];

  return (
    <div className="space-y-3 font-sans max-w-none">

      {/* ① Header — always visible */}
      <SummaryHeader
        summary={plan.riskSummary}
        company={plan.company}
        health={plan.financialHealth}
      />

      {/* ② Risk list — always visible */}
      {plan.risks?.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {plan.risks.length} Risks Identified
            </p>
            <RiskChips risks={plan.risks} />
          </div>
          {plan.risks.map((risk, i) => (
            <RiskRow
              key={risk.riskNumber ?? i}
              risk={risk}
              isOpen={openRisk === i}
              onToggle={() => setOpenRisk(openRisk === i ? null : i)}
            />
          ))}
        </div>
      )}

      {/* ③ Next Actions — accordion */}
      {nextA.length > 0 && (
        <AccordionRow icon="🚀" title={`${nextA.length} Next Actions`}>
          <ol className="pt-2 space-y-2">
            {nextA.map((action, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg border border-neutral-100 dark:border-white/[0.06] bg-neutral-50 dark:bg-white/[0.02] px-3 py-2.5">
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary-500/20 border border-primary-500/30 text-primary-600 dark:text-primary-300 flex items-center justify-center text-[10px] font-bold mt-0.5">
                  {action.priority ?? i + 1}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">{str(action.action)}</p>
                  {ok(action.reason) && (
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">{action.reason}</p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </AccordionRow>
      )}

      {/* ④ Regulatory Checklist — accordion */}
      {regC.length > 0 && (
        <AccordionRow icon="📋" title={`${regC.length} Regulatory Items`}>
          <div className="pt-2 space-y-2">
            {regC.map((item, i) => {
              const appCls = APPLICABILITY[item.applicability] ?? APPLICABILITY["Confirm applicability"];
              return (
                <div key={i} className="rounded-xl border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-[#101018] overflow-hidden">
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 leading-snug">{str(item.item)}</p>
                      {ok(item.authority) && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{item.authority}</p>
                      )}
                    </div>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${appCls}`}>
                      {str(item.applicability)}
                    </span>
                  </div>
                  {(ok(item.action) || ok(item.portal)) && (
                    <div className="px-4 pb-3 border-t border-neutral-100 dark:border-white/[0.05] pt-2 space-y-1.5">
                      {ok(item.action) && (
                        <div className="flex items-start gap-1.5">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm shrink-0">→</span>
                          <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">{item.action}</p>
                        </div>
                      )}
                      {ok(item.portal) && (
                        <a href={str(item.portal)} target="_blank" rel="noopener noreferrer"
                          className="inline-flex text-xs text-primary-600 dark:text-primary-300 underline underline-offset-2 hover:opacity-80 transition-opacity">
                          Apply here ↗
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </AccordionRow>
      )}

      {/* ⑤ Advisor Context — accordion */}
      {plan.advisorAnalysis && (
        <AccordionRow icon="🔍" title="Advisor Context"
          badge={
            ok(plan.advisorAnalysis.regulatoryComplexity)
              ? <Badge cls={{ Low: "border-emerald-300 dark:border-emerald-600/50 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300", Medium: "border-amber-300 dark:border-amber-600/50 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300", High: "border-rose-300 dark:border-rose-600/50 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300" }[plan.advisorAnalysis.regulatoryComplexity] ?? "border-neutral-200 dark:border-white/[0.08] text-neutral-500"}>
                  {plan.advisorAnalysis.regulatoryComplexity} Complexity
                </Badge>
              : undefined
          }
        >
          <div className="pt-2 space-y-3">
            {ok(plan.advisorAnalysis.businessActivityAssumption) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Activity Assumption</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{plan.advisorAnalysis.businessActivityAssumption}</p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ok(plan.advisorAnalysis.stageExposure) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Stage Exposure</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-snug">{plan.advisorAnalysis.stageExposure}</p>
                </div>
              )}
              {ok(plan.advisorAnalysis.capitalExposure) && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Capital Exposure</p>
                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-snug">{plan.advisorAnalysis.capitalExposure}</p>
                </div>
              )}
            </div>
            {focus.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">Research Focus</p>
                <div className="flex flex-wrap gap-1.5">
                  {focus.map((f, i) => (
                    <span key={i} className="rounded-full border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-white/[0.05] px-2.5 py-0.5 text-xs text-neutral-600 dark:text-neutral-300">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {ok(plan.financialHealth?.mainConcern) && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 mb-0.5">Main Concern</p>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">{plan.financialHealth.mainConcern}</p>
              </div>
            )}
          </div>
        </AccordionRow>
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
        <div className="rounded-lg border border-rose-200 dark:border-red-500/30 bg-rose-50 dark:bg-red-950/40 px-4 py-3">
          <p className="text-sm text-rose-800 dark:text-red-200">{parseError}</p>
        </div>
      ) : plan ? <RiskResult plan={plan} /> : null}
    </WidgetCard>
  );
}
