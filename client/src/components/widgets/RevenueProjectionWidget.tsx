/**
 * RevenueProjectionWidget — Revenue Projection Section
 *
 * Schema:
 * {
 *   company, industry, currentFunds, currency,
 *   assumptions: { industryGrowthRate, marketCondition, mainCostDrivers[] },
 *   financialProjection: [{
 *     period, estimatedCustomers, estimatedPricePerCustomer,
 *     averageMonthlyRevenue, projectedPeriodRevenue, projectedPeriodCost,
 *     estimatedPeriodCostBreakdown: { operations, marketing, inventory, staffing, technology, contingency },
 *     costExplanation, netProfitLoss, status, explanation, suggestion
 *   }],
 *   breakEvenMonth, estimatedYearEndProfitMargin,
 *   milestones: [{ month, achievement }]
 * }
 */

import { useState, useCallback, useEffect, useRef, Component, type ReactNode } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import { TrendingUp, TrendingDown, Target, Lightbulb, Users, Tag, Info } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CostBreakdown {
  operations: number;
  marketing: number;
  inventory: number;
  staffing: number;
  technology: number;
  contingency: number;
}

export interface FinancialPeriod {
  period: string;
  estimatedCustomers: number;
  estimatedPricePerCustomer: number;
  averageMonthlyRevenue: number;
  projectedPeriodRevenue: number;
  projectedPeriodCost: number;
  estimatedPeriodCostBreakdown?: CostBreakdown;
  costExplanation?: string;
  netProfitLoss: number;
  status: string;
  explanation?: string;
  suggestion?: string;
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
    mainCostDrivers: string[];
  };
  financialProjection: FinancialPeriod[];
  breakEvenMonth: number;
  estimatedYearEndProfitMargin: number;
  milestones: RevenueProjectionMilestone[];
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

// ─── Bar Chart (Recharts) ─────────────────────────────────────────────────────

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from "recharts";

const REV_COLOUR  = "#fb923c";
const COST_COLOUR = "#c4a882";
const PHASE_LABELS = ["Months 1–3", "Months 4–6", "Months 7–9", "Months 10–12"];

function fmtAxis(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(0)}k`;
  return String(v);
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/10 bg-neutral-900 px-3 py-2.5 text-xs shadow-2xl space-y-1.5 min-w-[160px]">
      <p className="font-bold text-neutral-200 mb-1">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="tabular-nums font-semibold text-neutral-100">
            RM {entry.value.toLocaleString("en-MY")}
          </span>
        </div>
      ))}
    </div>
  );
}

function RevenueChart({ periods }: { periods: FinancialPeriod[] }) {
  if (!periods.length)
    return <p className="text-sm text-neutral-500">No data to display.</p>;

  const data = periods.map((p, i) => ({
    name:    PHASE_LABELS[i] ?? p.period,
    Revenue: safeNum(p.projectedPeriodRevenue),
    Cost:    safeNum(p.projectedPeriodCost),
    profit:  p.status?.toLowerCase() === "profit",
  }));

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-4 px-1">
        12-Month Revenue vs Cost
      </p>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} barCategoryGap="30%" barGap={4}
          margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <XAxis
            dataKey="name"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tickFormatter={fmtAxis}
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Legend
            wrapperStyle={{ fontSize: 11, color: "rgba(255,255,255,0.5)", paddingTop: 8 }}
            iconType="square"
            iconSize={8}
          />
          <Bar dataKey="Revenue" fill={REV_COLOUR} radius={[4, 4, 0, 0]}>
            {data.map((_d, i) => (
              <Cell key={i} fill={REV_COLOUR} opacity={0.9} />
            ))}
          </Bar>
          <Bar dataKey="Cost" fill={COST_COLOUR} radius={[4, 4, 0, 0]}>
            {data.map((_d, i) => (
              <Cell key={i} fill={COST_COLOUR} opacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Cost breakdown helpers ───────────────────────────────────────────────────

const COST_CATEGORIES: { key: keyof CostBreakdown; label: string; colour: string }[] = [
  { key: "operations",  label: "Operations",  colour: "bg-blue-400" },
  { key: "marketing",   label: "Marketing",   colour: "bg-orange-400" },
  { key: "inventory",   label: "Inventory",   colour: "bg-emerald-400" },
  { key: "staffing",    label: "Staffing",    colour: "bg-violet-400" },
  { key: "technology",  label: "Technology",  colour: "bg-cyan-400" },
  { key: "contingency", label: "Contingency", colour: "bg-rose-400" },
];

// ─── Period cards ─────────────────────────────────────────────────────────────

const CARD_BORDERS = [
  "border-violet-500/25",
  "border-blue-500/25",
  "border-emerald-500/25",
  "border-amber-500/25",
];
const CARD_ACCENTS = [
  "text-violet-300",
  "text-blue-300",
  "text-emerald-300",
  "text-amber-300",
];

function PeriodCard({ p, i }: { p: FinancialPeriod; i: number }) {
  const [showCostTip, setShowCostTip] = useState(false);

  const profit    = p.status?.toLowerCase() === "profit";
  const even      = p.status?.toLowerCase() === "break-even";
  const net       = safeNum(p.netProfitLoss);
  const rev       = safeNum(p.projectedPeriodRevenue);
  const cost      = safeNum(p.projectedPeriodCost);
  const avg       = safeNum(p.averageMonthlyRevenue);
  const customers = safeNum(p.estimatedCustomers);
  const price     = safeNum(p.estimatedPricePerCustomer);
  const netSign   = net >= 0 ? "+" : "−";
  const netAbs    = Math.abs(net);
  const bd        = p.estimatedPeriodCostBreakdown;

  const statusColour = profit
    ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
    : even
    ? "bg-amber-500/15 border-amber-500/30 text-amber-300"
    : "bg-rose-500/15 border-rose-500/30 text-rose-300";

  const netBg   = profit ? "bg-emerald-500/10 border-emerald-500/20" : even ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20";
  const netText = profit ? "text-emerald-300" : even ? "text-amber-300" : "text-rose-300";
  const accent  = CARD_ACCENTS[i % CARD_ACCENTS.length];

  // Sum breakdown for total row inside popover
  const bdTotal = bd
    ? COST_CATEGORIES.reduce((s, { key }) => s + safeNum(bd[key]), 0)
    : 0;

  const hasCostDetail = bd || p.costExplanation;

  return (
    <div className={`rounded-2xl border ${CARD_BORDERS[i % CARD_BORDERS.length]} bg-white/[0.03] overflow-visible`}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.06]">
        <p className="text-base font-bold text-white">{PHASE_LABELS[i] ?? p.period}</p>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold border ${statusColour}`}>
          {profit ? <TrendingUp className="h-3 w-3" aria-hidden /> : <TrendingDown className="h-3 w-3" aria-hidden />}
          {p.status}
        </span>
      </div>

      <div className="p-4 space-y-4">

        {/* ── Revenue formula ── */}
        <div className="rounded-xl border border-white/[0.07] bg-black/20 px-4 py-3 space-y-2.5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Revenue Breakdown</p>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5">
              <Users className="h-3 w-3 text-neutral-400" aria-hidden />
              <span className="text-xs text-neutral-400">Est. Customers</span>
              <span className={`text-sm font-bold tabular-nums ${accent}`}>{fmt(customers)}</span>
            </div>
            <span className="text-neutral-500 font-bold">×</span>
            <div className="flex items-center gap-1.5 rounded-lg bg-white/[0.06] px-2.5 py-1.5">
              <Tag className="h-3 w-3 text-neutral-400" aria-hidden />
              <span className="text-xs text-neutral-400">Est. Price</span>
              <span className={`text-sm font-bold tabular-nums ${accent}`}>RM {fmt(price)}</span>
            </div>
          </div>

          {/* Avg monthly — sits right below the customers × price formula */}
          <div className="flex items-center justify-between gap-2">
            <span className="text-neutral-500 text-[11px]">Est. avg monthly revenue</span>
            <span className={`text-xs font-semibold tabular-nums ${accent}`}>RM {fmt(avg)} / mo</span>
          </div>

          <div className="border-t border-white/[0.07]" />

          {/* P&L calculation */}
          <div className="space-y-1.5 font-mono text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400 text-xs">Est. Revenue for [{PHASE_LABELS[i] ?? p.period}]</span>
              <span className="text-neutral-100 tabular-nums font-semibold">RM {fmt(rev)}</span>
            </div>

            {/* − Est. Cost row — Info icon opens cost breakdown popover */}
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-neutral-400 text-xs">
                − Est. Cost
                {hasCostDetail && (
                  <span className="relative">
                    <button
                      type="button"
                      className="flex items-center text-neutral-500 hover:text-neutral-200 transition-colors"
                      onMouseEnter={() => setShowCostTip(true)}
                      onMouseLeave={() => setShowCostTip(false)}
                      onFocus={() => setShowCostTip(true)}
                      onBlur={() => setShowCostTip(false)}
                      aria-label="Show cost breakdown"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>

                    {showCostTip && (
                      <div className="absolute left-0 bottom-full mb-2 z-50 w-64 rounded-xl border border-white/10 bg-neutral-900 p-3 shadow-2xl space-y-3">
                          {/* cost explanation text */}
                          {p.costExplanation && (
                            <p className="text-xs text-neutral-300 leading-relaxed border-b border-white/[0.08] pb-2">
                              {p.costExplanation}
                            </p>
                          )}

                          {/* breakdown bars */}
                          {bd && (
                            <div className="space-y-1.5">
                              {COST_CATEGORIES.map(({ key, label, colour }) => {
                                const val = safeNum(bd[key]);
                                if (val === 0) return null;
                                const pct = cost > 0 ? Math.round((val / cost) * 100) : 0;
                                return (
                                  <div key={key} className="flex items-center gap-2">
                                    <span className="w-16 text-[10px] text-neutral-500 shrink-0">{label}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                                      <div className={`h-full rounded-full ${colour} opacity-80`} style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="w-16 text-right text-[10px] tabular-nums text-neutral-400 shrink-0">
                                      RM {fmt(val)}
                                    </span>
                                  </div>
                                );
                              })}
                              {/* total */}
                              <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] pt-1.5 mt-1">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Total</span>
                                <span className="text-xs font-bold tabular-nums text-rose-300">RM {fmt(bdTotal)}</span>
                              </div>
                            </div>
                          )}

                          {/* caret */}
                          <span className="absolute left-3 top-full h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-neutral-900" />
                        </div>
                    )}
                  </span>
                )}
              </span>
              <span className="text-rose-300 tabular-nums font-semibold">RM {fmt(cost)}</span>
            </div>

            <div className="border-t border-white/10" />
            <div className={`flex items-center justify-between gap-2 rounded-lg border px-3 py-2 ${netBg}`}>
              <span className={`text-xs font-bold uppercase tracking-wider ${netText}`}>= Net P&L</span>
              <span className={`text-base font-bold tabular-nums ${netText}`}>{netSign} RM {fmt(netAbs)}</span>
            </div>
          </div>

        </div>

        {/* ── Analysis ── */}
        {p.explanation && (
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">Analysis</p>
            <p className="text-xs text-neutral-300 leading-relaxed">{p.explanation}</p>
          </div>
        )}

        {/* ── Suggestion ── */}
        {p.suggestion && (
          <div className="rounded-xl border border-primary-500/20 bg-primary-500/[0.06] px-3 py-2.5 space-y-1">
            <div className="flex items-center gap-1.5">
              <Lightbulb className="h-3 w-3 text-primary-400" aria-hidden />
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary-400">Suggestion</p>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">{p.suggestion}</p>
          </div>
        )}

      </div>
    </div>
  );
}

function PeriodCards({ periods }: { periods: FinancialPeriod[] }) {
  return (
    <div className="grid sm:grid-cols-2 gap-4 mt-5">
      {periods.map((p, i) => (
        <PeriodCard key={p.period} p={p} i={i} />
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

import { checkCache, writeCache, hashInputs } from '../../utils/widgetCache';

const CACHE_KEY = 'revenue-projection';

interface RevenueProjectionWidgetProps {
  profile: BusinessProfile;
  budgetAllocation?: string;
  onPlanGenerated?: (plan: RevenueProjectionPlan) => void;
  onGenerateRef?: (fn: (budgetAllocationOverride?: string) => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function RevenueProjectionWidget({
  profile,
  budgetAllocation,
  onPlanGenerated,
  onGenerateRef,
  hideGenerateButton = false,
}: RevenueProjectionWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [plan, setPlan]             = useState<RevenueProjectionPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const makeCacheInputs = (alloc: string | undefined) => ({
    companyName:     profile.companyName,
    industry:        profile.industry,
    businessStage:   profile.businessStage,
    currentFunds:    profile.currentFunds,
    mainGoal:        profile.mainGoal,
    businessType:    profile.businessType,
    budgetAllocation: alloc ?? '',
  });

  useEffect(() => {
    const cached = checkCache<RevenueProjectionPlan>(CACHE_KEY, makeCacheInputs(budgetAllocation));
    if (cached) {
      setPlan(cached.result);
      restoreSuccess();
      onPlanGenerated?.(cached.result);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async (budgetAllocationOverride?: string) => {
    const allocationToUse = budgetAllocationOverride ?? budgetAllocation;
    const cached = checkCache<RevenueProjectionPlan>(CACHE_KEY, makeCacheInputs(allocationToUse));
    if (cached) {
      setPlan(cached.result);
      setParseError(null);
      restoreSuccess();
      onPlanGenerated?.(cached.result);
      return;
    }
    setPlan(null);
    setParseError(null);
    await generate(async () => {
      try {
        const result = await fetchRevenueProjection(profile, allocationToUse);
        setPlan(result);
        onPlanGenerated?.(result);
        writeCache(CACHE_KEY, hashInputs(makeCacheInputs(allocationToUse)), result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("Response couldn't be parsed. Try regenerating.");
          throw new Error("JSON parse failed.");
        }
        throw err;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, budgetAllocation, generate, onPlanGenerated]);

  const handleGenerateRef = useRef<(budgetAllocationOverride?: string) => Promise<void>>();
  handleGenerateRef.current = handleGenerate;

  useEffect(() => {
    onGenerateRef?.((budgetAllocationOverride?: string) =>
      handleGenerateRef.current!(budgetAllocationOverride)
    );
  }, [onGenerateRef]);

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
      hideGenerateButton={hideGenerateButton}
    >
      {isWaiting && state.status === "idle" ? (
        <div className="flex items-center gap-2 text-sm text-amber-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          Complete Fund Allocation first to unlock this widget.
        </div>
      ) : parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan && periods.length > 0 ? (
        <div className="space-y-6">

          {/* ── Chart ── */}
          <SafeBoundary>
            <RevenueChart periods={periods} />
          </SafeBoundary>

          {/* ── Period cards ── */}
          <SafeBoundary>
            <PeriodCards periods={periods} />
          </SafeBoundary>

          {/* ── Milestones ── */}
          {plan.milestones?.length > 0 && (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-emerald-400" aria-hidden />
                <span className="text-xs font-bold uppercase tracking-widest text-neutral-300">Milestones</span>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                {plan.milestones.map((m, i) => (
                  <div
                    key={i}
                    className="relative rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4 flex flex-col gap-3 overflow-hidden"
                  >
                    {/* large faded number watermark */}
                    <span
                      className="absolute -right-2 -bottom-3 text-7xl font-black text-emerald-500/[0.07] select-none leading-none"
                      aria-hidden
                    >
                      {i + 1}
                    </span>

                    {/* month badge */}
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
                      Month {m.month}
                    </span>

                    {/* achievement */}
                    <p className="text-sm text-neutral-200 leading-snug relative z-10">
                      {m.achievement}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      ) : null}
    </WidgetCard>
  );
}
