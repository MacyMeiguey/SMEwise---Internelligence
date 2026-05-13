/**
 * FinancialReturnWidget — Financial Planning Section
 * Shares the same Bedrock Agent call as RevenueProjectionWidget and renders
 * the supporting detail panels:
 *   - Key Assumptions
 *   - Financial KPIs (break-even, profit margin, starting capital)
 *   - Milestones
 *   - Risks
 *   - Action Steps
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import {
  fetchRevenueProjection,
  type RevenueProjectionPlan,
} from "./RevenueProjectionWidget";
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Zap,
  Target,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-MY");
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
  return (
    <div className="space-y-5">

      {/* Assumptions + KPIs */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Key Assumptions */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <SectionHeading icon={<TrendingUp className="h-4 w-4" />} label="Key Assumptions" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[11px] text-neutral-500 uppercase tracking-wider">
                Industry growth
              </dt>
              <dd className="text-neutral-200 mt-0.5">
                {plan.assumptions.industryGrowthRate}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-neutral-500 uppercase tracking-wider">
                Seasonality
              </dt>
              <dd className="text-neutral-200 mt-0.5">
                {plan.assumptions.seasonality}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-neutral-500 uppercase tracking-wider">
                Required investment
              </dt>
              <dd className="text-primary-200 font-semibold mt-0.5 tabular-nums">
                RM {fmt(plan.assumptions.requiredInvestment)}
              </dd>
            </div>
          </dl>
        </div>

        {/* Financial KPIs */}
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-3">
          <SectionHeading icon={<Target className="h-4 w-4" />} label="Financial KPIs" />
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
            <span className="text-xs text-neutral-400">Break-even month</span>
            <span className="text-lg font-bold text-primary-200 tabular-nums">
              Month {plan.breakEvenMonth}
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
            <span className="text-xs text-neutral-400">Profit margin</span>
            <span className="text-lg font-bold text-emerald-300 tabular-nums">
              {plan.profitMargin}%
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-2.5">
            <span className="text-xs text-neutral-400">Starting capital</span>
            <span className="text-sm font-semibold text-neutral-200 tabular-nums">
              RM {fmt(plan.currentFunds)}
            </span>
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <SectionHeading icon={<CheckCircle2 className="h-4 w-4" />} label="Milestones" />
        <ol className="space-y-3">
          {plan.milestones.map((m, i) => (
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

      {/* Risks + Action Steps */}
      <div className="grid sm:grid-cols-2 gap-4">

        {/* Risks */}
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-4">
          <SectionHeading
            icon={<AlertTriangle className="h-4 w-4 text-rose-400" />}
            label="Risks"
          />
          <ul className="space-y-2">
            {plan.risks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-rose-400 shrink-0" />
                {risk}
              </li>
            ))}
          </ul>
        </div>

        {/* Action Steps */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
          <SectionHeading
            icon={<Zap className="h-4 w-4 text-emerald-400" />}
            label="Action Steps"
          />
          <ol className="space-y-2">
            {plan.actionSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface FinancialReturnWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

export default function FinancialReturnWidget({
  profile,
  onGenerateRef,
}: FinancialReturnWidgetProps) {
  const { state, generate } = useWidgetState();
  const [plan, setPlan]             = useState<RevenueProjectionPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchRevenueProjection(profile);
        setPlan(result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError(
            "The agent returned a response that couldn't be parsed. Try regenerating.",
          );
          throw new Error("Failed to parse financial return projection JSON.");
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
      title="Financial Return Projection"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Break-even month, profit margin, milestones, risks and action steps — all in RM."
      idleButtonLabel="Model returns"
      regenerateLabel="Re-model"
    >
      {parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <ProjectionDetails plan={plan} />
      ) : null}
    </WidgetCard>
  );
}
