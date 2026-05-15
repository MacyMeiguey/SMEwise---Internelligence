/**
 * FinancialReturnWidget — Financial Planning Section
 *
 * Confirmed agent schema (same call as RevenueProjectionWidget):
 * assumptions: { industryGrowthRate, marketCondition, monthlyBurnEstimate, mainCostDrivers[] }
 * breakEvenMonth, estimatedYearEndProfitMargin
 * milestones[], risks[], actionSteps[]
 *
 * Renders: Key Assumptions, Financial KPIs, Milestones, Risks, Action Steps
 */

import { useState, useCallback, useEffect, Component, type ReactNode } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import {
  fetchRevenueProjection,
  fmt,
  type RevenueProjectionPlan,
} from "./RevenueProjectionWidget";
import { TrendingUp, AlertTriangle, CheckCircle2, Zap, Target, Flame } from "lucide-react";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalisePct(raw: unknown): number {
  const n = Number(raw);
  if (!isFinite(n)) return 0;
  return n > 0 && n <= 1 ? Math.round(n * 100) : Math.round(n);
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-primary-300">{icon}</span>
      <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">{label}</h3>
    </div>
  );
}

// ─── Detail panels ────────────────────────────────────────────────────────────

function ProjectionDetails({ plan }: { plan: RevenueProjectionPlan }) {
  const a          = plan.assumptions ?? {} as RevenueProjectionPlan["assumptions"];
  const milestones = plan.milestones  ?? [];
  const risks      = plan.risks       ?? [];
  const actions    = plan.actionSteps ?? [];
  const profitPct  = normalisePct(plan.estimatedYearEndProfitMargin);
  const drivers    = Array.isArray(a.mainCostDrivers) ? a.mainCostDrivers : [];

  return (
    <div className="space-y-5">

      {/* ── Assumptions + KPIs ── */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Key Assumptions */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <SectionHeading icon={<TrendingUp className="h-4 w-4" />} label="Key Assumptions" />
          <dl className="space-y-3 text-sm">
            {a.industryGrowthRate && (
              <div>
                <dt className="text-[11px] text-neutral-500 uppercase tracking-wider">Industry growth</dt>
                <dd className="text-neutral-200 mt-0.5">{a.industryGrowthRate}</dd>
              </div>
            )}
            {a.marketCondition && (
              <div>
                <dt className="text-[11px] text-neutral-500 uppercase tracking-wider">Market condition</dt>
                <dd className="text-neutral-200 mt-0.5">{a.marketCondition}</dd>
              </div>
            )}
            {a.monthlyBurnEstimate != null && (
              <div>
                <dt className="text-[11px] text-neutral-500 uppercase tracking-wider">Monthly burn</dt>
                <dd className="text-primary-200 font-semibold mt-0.5 tabular-nums">
                  RM {fmt(a.monthlyBurnEstimate)}
                </dd>
              </div>
            )}
            {drivers.length > 0 && (
              <div>
                <dt className="text-[11px] text-neutral-500 uppercase tracking-wider mb-1.5">Cost drivers</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {drivers.map((d: string) => (
                    <span key={d}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-2.5 py-0.5 text-[11px] text-neutral-300">
                      {d}
                    </span>
                  ))}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Financial KPIs */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2.5">
          <SectionHeading icon={<Target className="h-4 w-4" />} label="Financial KPIs" />

          {plan.breakEvenMonth != null && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
              <span className="text-xs text-neutral-400">Break-even month</span>
              <span className="text-lg font-bold text-primary-200 tabular-nums">
                Month {plan.breakEvenMonth}
              </span>
            </div>
          )}

          {plan.estimatedYearEndProfitMargin != null && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
              <span className="text-xs text-neutral-400">Year-end profit margin</span>
              <span className="text-lg font-bold text-emerald-300 tabular-nums">
                {profitPct}%
              </span>
            </div>
          )}

          {a.monthlyBurnEstimate != null && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
              <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
                Monthly burn
              </span>
              <span className="text-sm font-semibold text-orange-300 tabular-nums">
                RM {fmt(a.monthlyBurnEstimate)}
              </span>
            </div>
          )}

          {plan.currentFunds != null && (
            <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
              <span className="text-xs text-neutral-400">Starting capital</span>
              <span className="text-sm font-semibold text-neutral-200 tabular-nums">
                RM {fmt(plan.currentFunds)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Milestones ── */}
      {milestones.length > 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <SectionHeading icon={<CheckCircle2 className="h-4 w-4" />} label="Milestones" />
          <ol className="space-y-3">
            {milestones.map((m, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-primary-500/20 border border-primary-500/30 text-[11px] font-bold text-primary-300">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <span className="text-[11px] font-semibold text-primary-400 uppercase tracking-wider">
                    Month {m.month}
                  </span>
                  <p className="text-sm text-neutral-200 mt-0.5">{m.achievement}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* ── Risks + Action Steps ── */}
      {(risks.length > 0 || actions.length > 0) && (
        <div className="grid sm:grid-cols-2 gap-4">
          {risks.length > 0 && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
              <SectionHeading
                icon={<AlertTriangle className="h-4 w-4 text-rose-400" />}
                label="Risks"
              />
              <ul className="space-y-2">
                {risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {actions.length > 0 && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
              <SectionHeading
                icon={<Zap className="h-4 w-4 text-emerald-400" />}
                label="Action Steps"
              />
              <ol className="space-y-2">
                {actions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                    <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                      {i + 1}
                    </span>
                    {s}
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

// ─── Component ────────────────────────────────────────────────────────────────

interface FinancialReturnWidgetProps {
  profile: BusinessProfile;
  budgetAllocation?: string;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function FinancialReturnWidget({
  profile,
  budgetAllocation,
  onGenerateRef,
}: FinancialReturnWidgetProps) {
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
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("Response couldn't be parsed. Try regenerating.");
          throw new Error("JSON parse failed.");
        }
        throw err;
      }
    });
  }, [profile, budgetAllocation, generate]);

  useEffect(() => { onGenerateRef?.(handleGenerate); }, [onGenerateRef, handleGenerate]);

  const isWaiting = !budgetAllocation;

  return (
    <WidgetCard
      title="Financial Return Projection"
      onGenerate={handleGenerate}
      state={state}
      idleHint={
        isWaiting
          ? "Generate Fund Allocation first — this projection uses your budget as its cost structure."
          : "Break-even, burn rate, profit margin, milestones, risks and action steps."
      }
      idleButtonLabel="Model returns"
      regenerateLabel="Re-model"
      generateDisabled={isWaiting}
    >
      {isWaiting && state.status === "idle" ? (
        <div className="flex items-center gap-2 text-sm text-amber-400/80">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
          Complete Fund Allocation first to unlock this widget.
        </div>
      ) : parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <SafeBoundary>
          <ProjectionDetails plan={plan} />
        </SafeBoundary>
      ) : null}
    </WidgetCard>
  );
}
