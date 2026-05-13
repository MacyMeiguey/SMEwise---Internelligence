/**
 * RevenueProjectionWidget — Revenue Projection Section
 * Calls the dedicated AWS Bedrock Agent (B2WJZPIFMU) which returns a
 * structured JSON 12-month financial projection, then renders:
 *   - Summary strip (company, industry, capital)
 *   - Grouped bar chart (min/max revenue per period)
 *
 * The supporting detail panels (assumptions, KPIs, milestones, risks,
 * action steps) live in FinancialReturnWidget.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";

// ─── Types (exported so FinancialReturnWidget can reuse them) ─────────────────

export interface RevenuePeriodEntry {
  period: string;
  minRevenue: number;
  maxRevenue: number;
}

export interface RevenueProjectionMilestone {
  month: number;
  achievement: string;
}

export interface RevenueProjectionPlan {
  company: string;
  industry: string;
  currentFunds: number;
  currency: string;
  assumptions: {
    industryGrowthRate: string;
    seasonality: string;
    requiredInvestment: number;
  };
  revenueProjection: RevenuePeriodEntry[];
  breakEvenMonth: number;
  profitMargin: number;
  milestones: RevenueProjectionMilestone[];
  risks: string[];
  actionSteps: string[];
}

// ─── API call (exported so FinancialReturnWidget can share it) ────────────────

export async function fetchRevenueProjection(
  profile: BusinessProfile,
): Promise<RevenueProjectionPlan> {
  const payload = {
    companyName:   profile.companyName,
    industry:      profile.industry,
    businessStage: profile.businessStage,
    currentFunds:  profile.currentFunds,
    mainGoal:      profile.mainGoal || undefined,
    businessType:  profile.businessType,
  };

  const res = await fetch(`${API_BASE}/api/bedrock/revenue-projection`, {
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
  const start = jsonStr.indexOf("{");
  const end   = jsonStr.lastIndexOf("}");
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

  return JSON.parse(jsonStr) as RevenueProjectionPlan;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-MY");
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const PERIOD_COLOURS = [
  { min: "#6d28d9", max: "#a78bfa" }, // violet  — Months 1-3
  { min: "#0369a1", max: "#38bdf8" }, // blue    — Months 4-6
  { min: "#065f46", max: "#34d399" }, // emerald — Months 7-9
  { min: "#92400e", max: "#fbbf24" }, // amber   — Months 10-12
];

const PERIOD_LABELS = ["Months 1–3", "Months 4–6", "Months 7–9", "Months 10–12"];

export function RevenueChart({ data }: { data: RevenuePeriodEntry[] }) {
  const allValues = data.flatMap((d) => [d.minRevenue, d.maxRevenue]);
  const maxVal    = Math.max(...allValues);
  const ceiling   = Math.ceil(maxVal / 10000) * 10000;

  const CHART_H  = 200;
  const BAR_W    = 28;
  const GAP      = 8;
  const GROUP_GAP = 24;
  const LABEL_H  = 40;
  const Y_AXIS_W = 64;

  const groupW = BAR_W * 2 + GAP;
  const totalW = Y_AXIS_W + data.length * (groupW + GROUP_GAP) - GROUP_GAP + 16;

  const barH = (v: number) => (v / ceiling) * CHART_H;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * ceiling));

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${totalW} ${CHART_H + LABEL_H + 24}`}
        className="w-full min-w-[320px]"
        aria-label="Revenue projection bar chart"
        role="img"
      >
        {/* Y-axis grid lines + labels */}
        {ticks.map((tick) => {
          const y = CHART_H - barH(tick);
          return (
            <g key={tick}>
              <line x1={Y_AXIS_W} y1={y} x2={totalW} y2={y}
                stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
              <text x={Y_AXIS_W - 6} y={y + 4} textAnchor="end"
                fontSize={9} fill="rgba(255,255,255,0.4)">
                {tick >= 1_000_000
                  ? `${(tick / 1_000_000).toFixed(1)}M`
                  : tick >= 1_000
                  ? `${(tick / 1_000).toFixed(0)}k`
                  : tick}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((entry, i) => {
          const colours = PERIOD_COLOURS[i % PERIOD_COLOURS.length];
          const x    = Y_AXIS_W + i * (groupW + GROUP_GAP);
          const minH = barH(entry.minRevenue);
          const maxH = barH(entry.maxRevenue);
          return (
            <g key={entry.period}>
              <rect x={x} y={CHART_H - minH} width={BAR_W} height={minH}
                rx={4} fill={colours.min} opacity={0.85} />
              <rect x={x + BAR_W + GAP} y={CHART_H - maxH} width={BAR_W} height={maxH}
                rx={4} fill={colours.max} opacity={0.85} />
              <text x={x + groupW / 2} y={CHART_H + 16}
                textAnchor="middle" fontSize={9} fill="rgba(255,255,255,0.55)">
                {PERIOD_LABELS[i] ?? entry.period}
              </text>
              <text x={x + BAR_W / 2} y={CHART_H - minH - 4}
                textAnchor="middle" fontSize={8} fill={colours.min}>
                {entry.minRevenue >= 1000
                  ? `${(entry.minRevenue / 1000).toFixed(0)}k`
                  : entry.minRevenue}
              </text>
              <text x={x + BAR_W + GAP + BAR_W / 2} y={CHART_H - maxH - 4}
                textAnchor="middle" fontSize={8} fill={colours.max}>
                {entry.maxRevenue >= 1000
                  ? `${(entry.maxRevenue / 1000).toFixed(0)}k`
                  : entry.maxRevenue}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={Y_AXIS_W} y1={0} x2={Y_AXIS_W} y2={CHART_H}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        <line x1={Y_AXIS_W} y1={CHART_H} x2={totalW} y2={CHART_H}
          stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      </svg>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2 px-1">
        {data.map((entry, i) => {
          const colours = PERIOD_COLOURS[i % PERIOD_COLOURS.length];
          return (
            <div key={entry.period} className="flex items-center gap-2 text-xs text-neutral-400">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: colours.min }} />
                Min
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ background: colours.max }} />
                Max
              </span>
              <span className="text-neutral-500">{PERIOD_LABELS[i] ?? entry.period}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RevenueProjectionWidgetProps {
  profile: BusinessProfile;
  /** Fires after a successful generate so FinancialReturnWidget can reuse the data */
  onPlanGenerated?: (plan: RevenueProjectionPlan) => void;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function RevenueProjectionWidget({
  profile,
  onPlanGenerated,
  onGenerateRef,
}: RevenueProjectionWidgetProps) {
  const { state, generate } = useWidgetState();
  const [plan, setPlan]         = useState<RevenueProjectionPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchRevenueProjection(profile);
        setPlan(result);
        onPlanGenerated?.(result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("The agent returned a response that couldn't be parsed. Try regenerating.");
          throw new Error("Failed to parse revenue projection JSON.");
        }
        throw err;
      }
    });
  }, [profile, generate, onPlanGenerated]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Revenue Projection"
      onGenerate={handleGenerate}
      state={state}
      idleHint="12-month revenue range chart across four phases — tuned to your industry and capital."
      idleButtonLabel="Plot revenue"
      regenerateLabel="Redraw chart"
    >
      {parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <div>
          {/* Summary strip */}
          <div className="flex flex-wrap gap-2 mb-4 text-sm">
            <span className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-neutral-300">
              <span className="font-semibold text-white">{plan.company}</span>
              <span className="mx-1.5 text-neutral-500">·</span>
              {plan.industry}
            </span>
            <span className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 font-semibold text-primary-200">
              RM {fmt(plan.currentFunds)} capital
            </span>
          </div>

          {/* Chart only */}
          <RevenueChart data={plan.revenueProjection} />
        </div>
      ) : null}
    </WidgetCard>
  );
}
