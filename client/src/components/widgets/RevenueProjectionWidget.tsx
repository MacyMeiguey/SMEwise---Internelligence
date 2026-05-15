/**
 * RevenueProjectionWidget — Revenue Projection Section
 *
 * Confirmed agent schema:
 * {
 *   company, industry, currentFunds, currency,
 *   assumptions: { industryGrowthRate, marketCondition, monthlyBurnEstimate, mainCostDrivers[] },
 *   financialProjection: [{
 *     period, averageMonthlyRevenue, projectedPeriodRevenue,
 *     projectedPeriodCost, netProfitLoss, status, explanation, suggestion
 *   }],
 *   breakEvenMonth, estimatedYearEndProfitMargin,
 *   milestones: [{ month, achievement }],
 *   risks[], actionSteps[]
 * }
 *
 * Renders:
 *   - Summary strip
 *   - Grouped bar chart (Revenue vs Cost, colour-coded P&L dot)
 *   - Period detail cards (financials + explanation + suggestion)
 */

import { useState, useCallback, useEffect, Component, type ReactNode } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import { TrendingUp, TrendingDown } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinancialPeriod {
  period: string;
  averageMonthlyRevenue: number;
  projectedPeriodRevenue: number;
  projectedPeriodCost: number;
  netProfitLoss: number;
  status: string;          // "Profit" | "Loss"
  explanation: string;
  suggestion: string;
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
    marketCondition: string;
    monthlyBurnEstimate: number;
    mainCostDrivers: string[];
  };
  financialProjection: FinancialPeriod[];
  breakEvenMonth: number;
  estimatedYearEndProfitMargin: number;
  milestones: RevenueProjectionMilestone[];
  risks: string[];
  actionSteps: string[];
}

// ─── API ──────────────────────────────────────────────────────────────────────

export async function fetchRevenueProjection(
  profile: BusinessProfile,
  budgetAllocation?: string,
): Promise<RevenueProjectionPlan> {
  const res = await fetch(`${API_BASE}/api/bedrock/revenue-projection`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      companyName:      profile.companyName,
      industry:         profile.industry,
      businessStage:    profile.businessStage,
      currentFunds:     profile.currentFunds,
      mainGoal:         profile.mainGoal?.trim() || "Grow the business sustainably",
      businessType:     profile.businessType,
      budgetAllocation: budgetAllocation || "Not yet allocated",
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { content: string };
  let jsonStr = data.content.trim();
  if (jsonStr.startsWith("```"))
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  const s = jsonStr.indexOf("{"), e = jsonStr.lastIndexOf("}");
  if (s !== -1 && e !== -1) jsonStr = jsonStr.slice(s, e + 1);
  return JSON.parse(jsonStr) as RevenueProjectionPlan;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function fmt(n: unknown): string {
  const num = Number(n);
  return isFinite(num) ? num.toLocaleString("en-MY") : "—";
}

function safeNum(n: unknown): number {
  const v = Number(n);
  return isFinite(v) ? v : 0;
}

// ─── Error boundary ───────────────────────────────────────────────────────────

class SafeBoundary extends Component<
  { children: ReactNode },
  { err: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { err: null };
  }
  static getDerivedStateFromError(e: unknown) {
    return { err: e instanceof Error ? e.message : String(e) };
  }
  render() {
    if (this.state.err)
      return <p className="text-sm text-red-400">Render error: {this.state.err}. Try regenerating.</p>;
    return this.props.children;
  }
}

// ─── Bar Chart ────────────────────────────────────────────────────────────────

const REV_COLOUR  = "#fb923c";  // orange-400
const COST_COLOUR = "#faceaaff";  // violet-900 (dark purple)

const PHASE_LABELS = ["Months 1–3", "Months 4–6", "Months 7–9", "Months 10–12"];

function RevenueChart({ periods }: { periods: FinancialPeriod[] }) {
  if (!periods.length)
    return <p className="text-sm text-neutral-500">No data to display.</p>;

  const allVals = periods.flatMap(p => [
    safeNum(p.projectedPeriodRevenue),
    safeNum(p.projectedPeriodCost),
  ]);
  const maxVal  = Math.max(...allVals, 1);
  const ceiling = Math.ceil(maxVal / 10000) * 10000 || 10000;

  // Slightly larger, centred in container
  const TOP_PAD = 28;
  const CH      = 200;
  const BW      = 30;
  const GAP     = 8;
  const GG      = 36;
  const LH      = 42;
  const YW      = 64;

  const gW     = BW * 2 + GAP;
  const tW     = YW + periods.length * (gW + GG) - GG + 12;
  const totalH = TOP_PAD + CH + LH + 6;

  const bH    = (v: number) => Math.min(Math.max((safeNum(v) / ceiling) * CH, 0), CH);
  const ticks = [0, 0.5, 1].map(f => Math.round(f * ceiling));

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
      <div className="flex justify-center overflow-x-auto">
        <svg
          viewBox={`0 0 ${tW} ${totalH}`}
          style={{ width: `${tW}px`, height: `${totalH}px`, maxWidth: "100%" }}
          aria-label="Revenue vs cost projection chart"
          role="img"
        >
          {/* Grid + Y labels */}
          {ticks.map(tick => {
            const y = TOP_PAD + CH - bH(tick);
            return (
              <g key={tick}>
                <line x1={YW} y1={y} x2={tW} y2={y}
                  stroke="rgba(255,255,255,0.07)" strokeWidth={1} />
                <text x={YW - 5} y={y + 3.5} textAnchor="end" fontSize={9} fill="rgba(255,255,255,0.4)">
                  {tick >= 1e6
                    ? `${(tick / 1e6).toFixed(1)}M`
                    : tick >= 1000
                    ? `${(tick / 1000).toFixed(0)}k`
                    : tick}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {periods.map((p, i) => {
            const x      = YW + i * (gW + GG);
            const rH     = bH(p.projectedPeriodRevenue);
            const cH     = bH(p.projectedPeriodCost);
            const rev    = safeNum(p.projectedPeriodRevenue);
            const cst    = safeNum(p.projectedPeriodCost);
            const profit = p.status?.toLowerCase() === "profit";
            const baseY  = TOP_PAD + CH;

            return (
              <g key={p.period}>
                <rect x={x} y={baseY - rH} width={BW} height={rH}
                  rx={3} fill={REV_COLOUR} opacity={0.9} />
                <rect x={x + BW + GAP} y={baseY - cH} width={BW} height={cH}
                  rx={3} fill={COST_COLOUR} opacity={0.9} />

                {/* P&L dot */}
                <circle cx={x + gW / 2} cy={baseY - Math.max(rH, cH) - 8} r={4}
                  fill={profit ? "#34d399" : "#f87171"} />

                {/* Period label */}
                <text x={x + gW / 2} y={baseY + 13}
                  textAnchor="middle" fontSize={7.5} fill="rgba(255,255,255,0.5)">
                  {PHASE_LABELS[i] ?? p.period}
                </text>

                {/* Value labels */}
                <text x={x + BW / 2} y={baseY - rH - 3}
                  textAnchor="middle" fontSize={7} fill={REV_COLOUR}>
                  {rev >= 1000 ? `${(rev / 1000).toFixed(0)}k` : rev}
                </text>
                <text x={x + BW + GAP + BW / 2} y={baseY - cH - 3}
                  textAnchor="middle" fontSize={7} fill={COST_COLOUR}>
                  {cst >= 1000 ? `${(cst / 1000).toFixed(0)}k` : cst}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={YW} y1={TOP_PAD} x2={YW} y2={TOP_PAD + CH}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
          <line x1={YW} y1={TOP_PAD + CH} x2={tW} y2={TOP_PAD + CH}
            stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 px-1 text-[11px] text-neutral-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: REV_COLOUR }} />
          Revenue
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: COST_COLOUR }} />
          Cost
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
          Profit
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          Loss
        </span>
      </div>
    </div>
  );
}

// ─── Period cards ─────────────────────────────────────────────────────────────

const CARD_BORDERS = [
  "border-violet-500/25",
  "border-blue-500/25",
  "border-emerald-500/25",
  "border-amber-500/25",
];

function PeriodCards({ periods }: { periods: FinancialPeriod[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3 mt-5">
      {periods.map((p, i) => {
        const profit = p.status?.toLowerCase() === "profit";
        const net    = safeNum(p.netProfitLoss);

        return (
          <div key={p.period}
            className={`rounded-xl border ${CARD_BORDERS[i % CARD_BORDERS.length]} bg-white/[0.03] p-4 space-y-3`}>

            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-neutral-200">
                {PHASE_LABELS[i] ?? p.period}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${
                profit
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-500/15 border-rose-500/30 text-rose-300"
              }`}>
                {profit
                  ? <TrendingUp className="h-3 w-3" aria-hidden />
                  : <TrendingDown className="h-3 w-3" aria-hidden />}
                {p.status}
              </span>
            </div>

            {/* Financials grid */}
            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Revenue</p>
                <p className="text-sm font-semibold text-neutral-100 tabular-nums mt-0.5">
                  RM {fmt(p.projectedPeriodRevenue)}
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Cost</p>
                <p className="text-sm font-semibold text-neutral-100 tabular-nums mt-0.5">
                  RM {fmt(p.projectedPeriodCost)}
                </p>
              </div>
              <div className="rounded-lg bg-white/[0.04] px-3 py-2">
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Avg / month</p>
                <p className="text-sm font-semibold text-neutral-100 tabular-nums mt-0.5">
                  RM {fmt(p.averageMonthlyRevenue)}
                </p>
              </div>
              <div className={`rounded-lg px-3 py-2 ${profit ? "bg-emerald-500/10" : "bg-rose-500/10"}`}>
                <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Net P&L</p>
                <p className={`text-sm font-bold tabular-nums mt-0.5 ${profit ? "text-emerald-300" : "text-rose-300"}`}>
                  {net >= 0 ? "+" : ""}RM {fmt(net)}
                </p>
              </div>
            </div>

            {/* Explanation */}
            {p.explanation && (
              <p className="text-xs text-neutral-400 leading-relaxed">{p.explanation}</p>
            )}

            {/* Suggestion */}
            {p.suggestion && (
              <div className="rounded-lg border border-primary-500/20 bg-primary-500/[0.06] px-3 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary-400 mb-1">
                  Suggestion
                </p>
                <p className="text-xs text-neutral-300 leading-relaxed">{p.suggestion}</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RevenueProjectionWidgetProps {
  profile: BusinessProfile;
  budgetAllocation?: string;
  onPlanGenerated?: (plan: RevenueProjectionPlan) => void;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function RevenueProjectionWidget({
  profile,
  budgetAllocation,
  onPlanGenerated,
  onGenerateRef,
}: RevenueProjectionWidgetProps) {
  const { state, generate }         = useWidgetState();
  const [plan, setPlan]             = useState<RevenueProjectionPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);
    await generate(async () => {
      try {
        const result = await fetchRevenueProjection(profile, budgetAllocation);
        setPlan(result);
        onPlanGenerated?.(result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("Response couldn't be parsed. Try regenerating.");
          throw new Error("JSON parse failed.");
        }
        throw err;
      }
    });
  }, [profile, budgetAllocation, generate, onPlanGenerated]);

  useEffect(() => { onGenerateRef?.(handleGenerate); }, [onGenerateRef, handleGenerate]);

  const isWaiting = !budgetAllocation;
  const periods   = plan?.financialProjection ?? [];

  return (
    <WidgetCard
      title="Revenue Projection"
      onGenerate={handleGenerate}
      state={state}
      idleHint={
        isWaiting
          ? "Generate Fund Allocation first — this projection uses your budget as its cost structure."
          : "12-month revenue vs cost chart with period-by-period P&L breakdown."
      }
      idleButtonLabel="Plot revenue"
      regenerateLabel="Redraw chart"
      generateDisabled={isWaiting}
    >
      {isWaiting && state.status === "idle" ? (
        <div className="flex items-center gap-2 text-sm text-amber-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          Complete Fund Allocation first to unlock this widget.
        </div>
      ) : parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan && periods.length > 0 ? (
        <div>
          {/* Summary strip */}
          <div className="flex flex-wrap gap-2 mb-5 text-sm">
            <span className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-neutral-300">
              <span className="font-semibold text-white">{plan.company}</span>
              <span className="mx-1.5 text-neutral-500">·</span>
              {plan.industry}
            </span>
            <span className="rounded-lg border border-primary-500/30 bg-primary-500/10 px-3 py-1.5 font-semibold text-primary-200">
              RM {fmt(plan.currentFunds)} capital
            </span>
            {plan.breakEvenMonth && (
              <span className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-emerald-200 text-xs font-semibold">
                Break-even: Month {plan.breakEvenMonth}
              </span>
            )}
          </div>

          <SafeBoundary>
            <RevenueChart periods={periods} />
          </SafeBoundary>

          <SafeBoundary>
            <PeriodCards periods={periods} />
          </SafeBoundary>
        </div>
      ) : null}
    </WidgetCard>
  );
}
