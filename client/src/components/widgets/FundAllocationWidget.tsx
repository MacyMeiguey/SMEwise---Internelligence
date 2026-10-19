/**
 * FundAllocationWidget — Financial Planning Section
 * Calls the dedicated AWS Bedrock Agent (RMJF0EXRHR) which returns a
 * structured JSON budget allocation plan, then renders it as a rich table.
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { useState, useCallback, useEffect } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import FinancialDonut3D from "../three/FinancialDonut3D";
import type { Segment as DonutSegment } from "../three/FinancialDonut3D";

// ─── Types (exported so Dashboard can pass allocation to Revenue widget) ──────

export interface AllocationCategory {
  category: string;
  percentage: number;
  amount: number;
  expenses: string[];
  rationale: string;
}

export interface FundAllocationPlan {
  company: string;
  industry: string;
  location: string;
  currentFunds: number;
  currency: string;
  allocations: AllocationCategory[];
  totalPercentage: number;
  totalAmount: number;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchFundAllocation(profile: BusinessProfile): Promise<FundAllocationPlan> {
  const payload = {
    companyName:   profile.companyName,
    industry:      profile.industry,
    businessStage: profile.businessStage,
    city:          profile.city,
    currentFunds:  profile.currentFunds,
    businessType:  profile.businessType,
  };

  const res = await fetch(`${API_BASE}/api/bedrock/fund-allocation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { content: string };

  // Strip markdown fences if the agent wrapped the JSON
  let jsonStr = data.content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

  return JSON.parse(jsonStr) as FundAllocationPlan;
}

// ─── Table renderer ───────────────────────────────────────────────────────────

// Colour band per category (index-based, cycles if more than 6)
const CATEGORY_COLOURS = [
  "bg-primary-500/20 text-primary-200 border-primary-500/30",
  "bg-teal-500/20 text-teal-200 border-teal-500/30",
  "bg-emerald-500/20 text-emerald-200 border-emerald-500/30",
  "bg-amber-500/20 text-amber-200 border-amber-500/30",
  "bg-rose-500/20 text-rose-200 border-rose-500/30",
  "bg-orange-500/20 text-orange-200 border-orange-500/30",
];

const BAR_COLOURS = [
  "bg-primary-500",
  "bg-teal-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-orange-500",
];

function fmt(n: number) {
  return n.toLocaleString("en-MY");
}

function AllocationTable({ plan }: { plan: FundAllocationPlan }) {
  return (
    <div className="space-y-4">
      {/* Summary header */}

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-sm text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] bg-white/[0.04]">
              <th className="px-4 py-3 font-semibold text-neutral-300 whitespace-nowrap">Category</th>
              <th className="px-4 py-3 font-semibold text-neutral-300 text-right whitespace-nowrap">%</th>
              <th className="px-4 py-3 font-semibold text-neutral-300 text-right whitespace-nowrap">Amount (RM)</th>
              <th className="px-4 py-3 font-semibold text-neutral-300 whitespace-nowrap">Key Expenses</th>
              <th className="px-4 py-3 font-semibold text-neutral-300 whitespace-nowrap">Rationale</th>
            </tr>
          </thead>
          <tbody>
            {plan.allocations.map((row, i) => (
              <tr
                key={row.category}
                className="border-b border-white/[0.05] hover:bg-white/[0.03] transition-colors"
              >
                {/* Category */}
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${BAR_COLOURS[i % BAR_COLOURS.length]}`}
                    />
                    <span className="font-medium text-white whitespace-nowrap">{row.category}</span>
                  </div>
                </td>
                {/* Percentage + bar */}
                <td className="px-4 py-3 align-top text-right">
                  <div className="flex flex-col items-end gap-1">
                    <span className="font-semibold text-white tabular-nums">{row.percentage}%</span>
                    <div className="w-16 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${BAR_COLOURS[i % BAR_COLOURS.length]}`}
                        style={{ width: `${row.percentage}%` }}
                      />
                    </div>
                  </div>
                </td>
                {/* Amount */}
                <td className="px-4 py-3 align-top text-right">
                  <span className="font-semibold text-primary-200 tabular-nums">
                    RM {fmt(row.amount)}
                  </span>
                </td>
                {/* Expenses */}
                <td className="px-4 py-3 align-top">
                  <ul className="space-y-0.5">
                    {row.expenses.map((exp) => (
                      <li key={exp} className="text-neutral-400 text-xs leading-relaxed">
                        {exp}
                      </li>
                    ))}
                  </ul>
                </td>
                {/* Rationale */}
                <td className="px-4 py-3 align-top">
                  <p className="text-neutral-400 text-xs leading-relaxed max-w-[200px]">
                    {row.rationale}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-white/[0.10] bg-white/[0.04]">
              <td className="px-4 py-3 font-bold text-white">Total</td>
              <td className="px-4 py-3 font-bold text-white text-right tabular-nums">
                {plan.totalPercentage}%
              </td>
              <td className="px-4 py-3 font-bold text-primary-200 text-right tabular-nums">
                RM {fmt(plan.totalAmount)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {plan.allocations.map((row, i) => (
          <div
            key={row.category}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-block h-2.5 w-2.5 rounded-full shrink-0 ${BAR_COLOURS[i % BAR_COLOURS.length]}`}
                />
                <span className="font-semibold text-white text-sm">{row.category}</span>
              </div>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLOURS[i % CATEGORY_COLOURS.length]}`}
              >
                {row.percentage}%
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full ${BAR_COLOURS[i % BAR_COLOURS.length]}`}
                style={{ width: `${row.percentage}%` }}
              />
            </div>
            <p className="text-primary-200 font-semibold text-sm tabular-nums">
              RM {fmt(row.amount)}
            </p>
            <ul className="space-y-0.5">
              {row.expenses.map((exp) => (
                <li key={exp} className="text-neutral-400 text-xs">· {exp}</li>
              ))}
            </ul>
            <p className="text-neutral-500 text-xs italic">{row.rationale}</p>
          </div>
        ))}
        {/* Mobile total */}
        <div className="rounded-xl border border-primary-500/30 bg-primary-500/10 px-4 py-3 flex justify-between items-center">
          <span className="font-bold text-white text-sm">Total</span>
          <span className="font-bold text-primary-200 tabular-nums text-sm">
            RM {fmt(plan.totalAmount)} · {plan.totalPercentage}%
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 3D Chart colour mapping ──────────────────────────────────────────────────

const DONUT_COLOURS = [
  '#7c3aed', // primary
  '#14b8a6', // teal
  '#10b981', // emerald
  '#f59e0b', // amber
  '#f43f5e', // rose
  '#f97316', // orange
];

function planToDonutSegments(plan: FundAllocationPlan): DonutSegment[] {
  return plan.allocations.map((a, i) => ({
    category: a.category,
    percentage: a.percentage,
    amount: a.amount,
    color: DONUT_COLOURS[i % DONUT_COLOURS.length],
  }));
}

// ─── Component ────────────────────────────────────────────────────────────────

// ─── Component ────────────────────────────────────────────────────────────────

import { checkCache, writeCache, hashInputs } from '../../utils/widgetCache';

const CACHE_KEY = 'fund-allocation';

interface FundAllocationWidgetProps {
  profile: BusinessProfile;
  onAllocationGenerated?: (plan: FundAllocationPlan) => void;
  onGenerateRef?: (fn: () => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function FundAllocationWidget({
  profile,
  onAllocationGenerated,
  onGenerateRef,
  hideGenerateButton = false,
}: FundAllocationWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [plan, setPlan] = useState<FundAllocationPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [show3D, setShow3D] = useState(true);

  const cacheInputs = {
    companyName: profile.companyName,
    industry: profile.industry,
    businessStage: profile.businessStage,
    city: profile.city,
    businessType: profile.businessType,
    currentFunds: profile.currentFunds,
  };

  // Restore from cache on mount — also fire onAllocationGenerated so the
  // Dashboard can unblock Revenue Projection and Marketing Strategy.
  useEffect(() => {
    const cached = checkCache<FundAllocationPlan>(CACHE_KEY, cacheInputs);
    if (cached) {
      setPlan(cached.result);
      restoreSuccess();
      onAllocationGenerated?.(cached.result);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    // If the cache is still valid for the current inputs, restore from it and
    // return immediately — no API call needed.
    const cached = checkCache<FundAllocationPlan>(CACHE_KEY, cacheInputs);
    if (cached) {
      setPlan(cached.result);
      restoreSuccess();
      onAllocationGenerated?.(cached.result);
      return;
    }

    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchFundAllocation(profile);
        setPlan(result);
        onAllocationGenerated?.(result);
        writeCache(CACHE_KEY, hashInputs(cacheInputs), result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError(
            "The agent returned a response that couldn't be parsed. Try regenerating."
          );
          throw new Error("Failed to parse fund allocation JSON.");
        }
        throw err;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, generate, onAllocationGenerated]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Fund Allocation Table"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Splits your capital across 6 categories — tuned to Malaysian SME cost norms by your Bedrock advisor."
      idleButtonLabel="Build table"
      regenerateLabel="Rebuild table"
      hideGenerateButton={hideGenerateButton}
    >
      {parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <div className="space-y-4">
          {/* View toggle */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShow3D(false)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !show3D
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              Table
            </button>
            <button
              type="button"
              onClick={() => setShow3D(true)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                show3D
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-white/5 text-neutral-400 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              3D Chart
            </button>
          </div>

          {/* 3D Donut Chart */}
          {show3D && (
            <FinancialDonut3D
              segments={planToDonutSegments(plan)}
              height={480}
              className="w-full"
            />
          )}

          {/* Table view */}
          {!show3D && <AllocationTable plan={plan} />}
        </div>
      ) : null}
    </WidgetCard>
  );
}
