/**
 * RiskAnalyzerWidget — Operations Section
 * Calls the dedicated Bedrock agent which returns structured JSON,
 * then renders it as a rich risk dashboard.
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RiskSummary {
  overallRating: string;
  biggestThreatNow: string;
  quickWin: string;
}

interface Risk {
  riskNumber: number;
  riskName: string;
  level: string;
  whatItIs: string;
  ifIgnored: string;
  fixIt: string[];
}

interface RiskPlan {
  company: string;
  industry: string;
  businessStage: string;
  location: string;
  businessType: string;
  riskSummary: RiskSummary;
  risks: Risk[];
  disclaimer: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

async function fetchRiskAnalysis(profile: BusinessProfile): Promise<RiskPlan> {
  const res = await fetch(`${API_BASE}/api/bedrock/risk-analyzer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName:   profile.companyName,
      industry:      profile.industry,
      businessStage: profile.businessStage,
      city:          profile.city,
      businessType:  profile.businessType,
      currentFunds:  profile.currentFunds,
    }),
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

  return JSON.parse(jsonStr) as RiskPlan;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RiskLevel = "critical" | "high" | "medium" | "low";

function normaliseLevel(level: string): RiskLevel {
  const l = level.toLowerCase();
  if (l === "critical") return "critical";
  if (l === "high")     return "high";
  if (l === "medium")   return "medium";
  return "low";
}

const LEVEL_CONFIG: Record<RiskLevel, {
  badge: string;
  bar: string;
  card: string;
  dot: string;
  label: string;
}> = {
  critical: {
    badge: "bg-red-500/20 text-red-300 border-red-500/30",
    bar:   "bg-red-500",
    card:  "border-red-500/20 bg-red-500/[0.04]",
    dot:   "bg-red-400",
    label: "Critical",
  },
  high: {
    badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",
    bar:   "bg-orange-500",
    card:  "border-orange-500/20 bg-orange-500/[0.04]",
    dot:   "bg-orange-400",
    label: "High",
  },
  medium: {
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    bar:   "bg-amber-500",
    card:  "border-amber-500/20 bg-amber-500/[0.04]",
    dot:   "bg-amber-400",
    label: "Medium",
  },
  low: {
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    bar:   "bg-emerald-500",
    card:  "border-emerald-500/20 bg-emerald-500/[0.04]",
    dot:   "bg-emerald-400",
    label: "Low",
  },
};

const LEVEL_BAR_WIDTH: Record<RiskLevel, string> = {
  critical: "w-full",
  high:     "w-3/4",
  medium:   "w-1/2",
  low:      "w-1/4",
};

const OVERALL_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-500/10",    text: "text-red-300",    border: "border-red-500/25"    },
  high:     { bg: "bg-orange-500/10", text: "text-orange-300", border: "border-orange-500/25" },
  medium:   { bg: "bg-amber-500/10",  text: "text-amber-300",  border: "border-amber-500/25"  },
  low:      { bg: "bg-emerald-500/10",text: "text-emerald-300",border: "border-emerald-500/25"},
};

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ summary, company }: { summary: RiskSummary; company: string }) {
  const level = normaliseLevel(summary.overallRating);
  const cfg   = OVERALL_CONFIG[level] ?? OVERALL_CONFIG.medium;

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} px-5 py-4 space-y-3`}>
      {/* Overall rating */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold mb-1">Overall Risk Rating</p>
          <p className="text-2xl font-bold text-white">{company}</p>
        </div>
        <span className={`text-lg font-bold px-4 py-1.5 rounded-xl border ${cfg.border} ${cfg.bg} ${cfg.text}`}>
          {summary.overallRating}
        </span>
      </div>

      <div className="h-px bg-white/[0.06]" />

      {/* Biggest threat + quick win */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
            <span>🔥</span> Biggest Threat Now
          </p>
          <p className="text-sm text-neutral-200 leading-relaxed">{summary.biggestThreatNow}</p>
        </div>
        <div className="space-y-1">
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
            <span>⚡</span> Quick Win
          </p>
          <p className="text-sm text-neutral-200 leading-relaxed">{summary.quickWin}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Risk overview strip ──────────────────────────────────────────────────────

function RiskStrip({ risks, active, onSelect }: {
  risks: Risk[];
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      {risks.map((risk, i) => {
        const level = normaliseLevel(risk.level);
        const cfg   = LEVEL_CONFIG[level];
        const isActive = active === i;
        return (
          <button
            key={risk.riskNumber}
            type="button"
            onClick={() => onSelect(i)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
              isActive
                ? `${cfg.card} ${cfg.badge.split(" ")[2]}`
                : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]"
            }`}
          >
            {/* Severity dot */}
            <span className={`shrink-0 h-2.5 w-2.5 rounded-full ${cfg.dot}`} />

            {/* Name */}
            <span className={`flex-1 text-sm font-medium ${isActive ? "text-white" : "text-neutral-300"}`}>
              {risk.riskName}
            </span>

            {/* Level badge */}
            <span className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.label}
            </span>

            {/* Chevron */}
            <svg
              className={`shrink-0 h-4 w-4 transition-transform ${isActive ? "rotate-90 text-white" : "text-neutral-600"}`}
              viewBox="0 0 16 16" fill="none" aria-hidden="true"
            >
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        );
      })}
    </div>
  );
}

// ─── Risk detail panel ────────────────────────────────────────────────────────

function RiskDetail({ risk }: { risk: Risk }) {
  const level = normaliseLevel(risk.level);
  const cfg   = LEVEL_CONFIG[level];

  return (
    <div className={`rounded-xl border ${cfg.card} p-5 space-y-5`}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Risk #{risk.riskNumber}</p>
          <h4 className="text-base font-bold text-white">{risk.riskName}</h4>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <span className={`text-sm font-bold px-3 py-1 rounded-lg border ${cfg.badge}`}>
            {cfg.label}
          </span>
          {/* Severity bar */}
          <div className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full ${cfg.bar} ${LEVEL_BAR_WIDTH[level]}`} />
          </div>
        </div>
      </div>

      {/* What it is */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">What It Is</p>
        <p className="text-sm text-neutral-300 leading-relaxed">{risk.whatItIs}</p>
      </div>

      {/* If ignored */}
      <div className="flex gap-3 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
        <span className="text-red-400 text-base shrink-0">⚠</span>
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wide">If Ignored</p>
          <p className="text-sm text-red-200/80 leading-relaxed">{risk.ifIgnored}</p>
        </div>
      </div>

      {/* Fix it steps */}
      <div className="space-y-2.5">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1.5">
          <span className="text-emerald-400">✓</span> How to Fix It
        </p>
        <div className="space-y-2">
          {risk.fixIt.map((step, i) => (
            <div key={i} className="flex gap-3 rounded-lg border border-white/[0.07] bg-white/[0.03] px-4 py-2.5">
              <span className="shrink-0 h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center text-xs font-bold">
                {i + 1}
              </span>
              <p className="text-sm text-neutral-300 leading-relaxed">{step}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Full result ──────────────────────────────────────────────────────────────

function RiskResult({ plan }: { plan: RiskPlan }) {
  const [activeRisk, setActiveRisk] = useState(0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <SummaryBar summary={plan.riskSummary} company={plan.company} />

      {/* Risk list + detail */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
          {plan.risks.length} Risks Identified — click to expand
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: list */}
          <RiskStrip risks={plan.risks} active={activeRisk} onSelect={setActiveRisk} />
          {/* Right: detail */}
          {plan.risks[activeRisk] && <RiskDetail risk={plan.risks[activeRisk]} />}
        </div>
      </div>

      {/* Disclaimer */}
      {plan.disclaimer && (
        <p className="text-xs text-neutral-600 italic border-t border-white/[0.05] pt-4">
          {plan.disclaimer}
        </p>
      )}
    </div>
  );
}

// ─── Widget ───────────────────────────────────────────────────────────────────

interface RiskAnalyzerWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function RiskAnalyzerWidget({ profile, onGenerateRef }: RiskAnalyzerWidgetProps) {
  const { state, generate } = useWidgetState();
  const [plan, setPlan] = useState<RiskPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchRiskAnalysis(profile);
        setPlan(result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("The agent returned a response that couldn't be parsed. Try regenerating.");
          throw new Error("Failed to parse risk analysis JSON.");
        }
        throw err;
      }
    });
  }, [profile, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Risk & Regulations Analyzer"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Flags your top regulatory and operational risks — with severity ratings, consequences, and step-by-step fixes."
      idleButtonLabel="Scan risks"
      regenerateLabel="Scan again"
    >
      {parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <RiskResult plan={plan} />
      ) : null}
    </WidgetCard>
  );
}
