/**
 * AnalyticsDashboardWidget — Owner Tools Section
 * Generates analytics dashboard data using the AnalyticsDashboard Bedrock agent.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 *
 * Props:
 *   profile       — the submitted BusinessProfile
 *   onGenerateRef — callback to register the generate handler for Generate All
 */

import { useState, useCallback, useEffect, useMemo } from "react";
import type { BusinessProfile, AnalyticsDashboardData, ExpenseBreakdown } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import { checkCache, writeCache, hashInputs } from "../../utils/widgetCache";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Component ────────────────────────────────────────────────────────────────

interface AnalyticsDashboardWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
}

const COLORS = ["#7c3aed", "#a78bfa", "#14b8a6", "#10b981", "#f59e0b", "#f43f5e"];

const CACHE_KEY = "analytics-dashboard";

export default function AnalyticsDashboardWidget({
  profile,
  onGenerateRef,
}: AnalyticsDashboardWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [dashboardData, setDashboardData] = useState<AnalyticsDashboardData | null>(null);

  const cacheInputs = useMemo(
    () => ({
      companyName: profile.companyName,
      industry: profile.industry,
      businessStage: profile.businessStage,
      city: profile.city,
      businessType: profile.businessType,
      currentFunds: profile.currentFunds,
      targetCustomer: profile.targetCustomer,
      mainGoal: profile.mainGoal ?? "",
    }),
    [
      profile.companyName,
      profile.industry,
      profile.businessStage,
      profile.city,
      profile.businessType,
      profile.currentFunds,
      profile.targetCustomer,
      profile.mainGoal,
    ],
  );

  useEffect(() => {
    const cached = checkCache<AnalyticsDashboardData>(CACHE_KEY, cacheInputs);
    if (cached) {
      setDashboardData(cached.result);
      restoreSuccess();
    }
    // Intentionally mount-only: same pattern as RiskAnalyzerWidget / FundAllocationWidget
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<AnalyticsDashboardData>(CACHE_KEY, cacheInputs);
    if (cached) {
      setDashboardData(cached.result);
      restoreSuccess();
      return;
    }

    setDashboardData(null);
    await generate(async () => {
      const res = await fetch(`${API_BASE}/api/bedrock/analytics-dashboard`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: profile.companyName,
          industry: profile.industry,
          businessStage: profile.businessStage,
          city: profile.city,
          businessType: profile.businessType,
          currentFunds: profile.currentFunds,
          targetCustomer: profile.targetCustomer,
          mainGoal: profile.mainGoal,
        }),
      });

      if (!res.ok) {
        throw new Error(`Analytics generation failed: HTTP ${res.status}`);
      }

      const data = (await res.json()) as { content?: string; error?: string };
      if (!data.content) {
        throw new Error(data.error ?? "No analytics data returned. Please try again.");
      }

      // Extract JSON from the response
      let cleaned = data.content.trim();
      if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
      }
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1 && end > start) {
        cleaned = cleaned.slice(start, end + 1);
      }

      const parsed = JSON.parse(cleaned) as AnalyticsDashboardData;
      setDashboardData(parsed);
      writeCache(CACHE_KEY, hashInputs(cacheInputs), parsed);
    });
  }, [cacheInputs, generate, restoreSuccess]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <WidgetCard
      title="Analytics Dashboard"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Generate realistic analytics data based on your business profile — ideal for pitch decks and planning."
      idleButtonLabel="Generate Dashboard"
      regenerateLabel="Regenerate"
      hideFooterRegenerate
      hideRegenerateInHeader
    >
      {dashboardData && (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {dashboardData.kpis.map((kpi, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-neutral-200/90 bg-neutral-50/50 p-3 dark:border-white/[0.08] dark:bg-black/20"
              >
                <div className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
                  {kpi.label}
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                    {kpi.value}
                  </div>
                  <div
                    className={`text-xs font-medium ${
                      kpi.trend === "up"
                        ? "text-green-600 dark:text-green-400"
                        : kpi.trend === "down"
                        ? "text-red-600 dark:text-red-400"
                        : "text-neutral-500 dark:text-neutral-400"
                    }`}
                  >
                    {kpi.change}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Monthly Revenue Bar Chart */}
          <div className="rounded-lg border border-neutral-200/90 bg-neutral-50/50 p-4 dark:border-white/[0.08] dark:bg-black/20">
            <h4 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Monthly Revenue (RM)
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dashboardData.revenue.monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#a3a3a3" />
                <YAxis tick={{ fontSize: 11 }} stroke="#a3a3a3" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#101018",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f5f5f5",
                  }}
                />
                <Bar dataKey="value" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Expense Breakdown Pie Chart */}
          <div className="rounded-lg border border-neutral-200/90 bg-neutral-50/50 p-4 dark:border-white/[0.08] dark:bg-black/20">
            <h4 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Expense Breakdown
            </h4>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={dashboardData.expenses.breakdown}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ payload }: { payload?: ExpenseBreakdown }) =>
                    payload ? `${payload.category} (${payload.percentage}%)` : ""}
                >
                  {dashboardData.expenses.breakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#101018",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#f5f5f5",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Projections */}
          <div className="rounded-lg border border-neutral-200/90 bg-neutral-50/50 p-4 dark:border-white/[0.08] dark:bg-black/20">
            <h4 className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">
              Projections
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Next Quarter Revenue:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  RM {dashboardData.projections.nextQuarter.revenue.toLocaleString("en-MY")}
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                    +{dashboardData.projections.nextQuarter.growth}%
                  </span>
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-600 dark:text-neutral-400">Year-End Revenue:</span>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  RM {dashboardData.projections.yearEnd.revenue.toLocaleString("en-MY")}
                  <span className="ml-2 text-xs text-green-600 dark:text-green-400">
                    +{dashboardData.projections.yearEnd.growth}%
                  </span>
                </span>
              </div>
            </div>
          </div>

          <figcaption className="text-[11px] leading-snug text-neutral-500 dark:text-neutral-400">
            Generated analytics based on industry benchmarks and business profile — not connected to live accounting data.
          </figcaption>
        </div>
      )}
    </WidgetCard>
  );
}
