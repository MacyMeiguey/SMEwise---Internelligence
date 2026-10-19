/**
 * MarketingForecast — Recharts-powered visualization of the marketing forecast
 * agent output. Renders:
 *   1. Executive Summary stat cards
 *   2. Time-series area/line charts (clients, revenue, budget spend, reach)
 *   3. Channel breakdown bar chart
 *   4. Funnel metrics
 *   5. Phase projection cards
 *   6. Benchmarking comparison
 */

import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell,
} from 'recharts';

// ─── Types (matches the agent's JSON schema exactly) ──────────────────────────

export interface ExecutiveSummary {
  projectedTotalGrowth: number;
  averageMonthlySuccessRate: number;
  estimatedCAC: number;
  estimatedROI: number;
  forecastConfidence: number;
  projectedTotalRevenue: number;
  projectedTotalNewClients: number;
}

export interface TimeSeriesData {
  months: number[];
  projectedNewClients: number[];
  cumulativeClients: number[];
  growthRatePercentage: number[];
  marketingReachThousands: number[];
  monthlyBudgetSpend: number[];
  cumulativeBudgetSpend: number[];
  projectedMonthlyRevenue: number[];
  cumulativeRevenue: number[];
}

export interface ChannelBreakdown {
  channel: string;
  allocatedBudget: number;
  budgetPercentage: number;
  projectedReach: number;
  projectedConversions: number;
  estimatedROI: number;
}

export interface FunnelMetrics {
  totalImpressions: number;
  totalLeads: number;
  totalConversions: number;
  impressionToLeadRate: number;
  leadToConversionRate: number;
}

export interface PhaseProjection {
  phaseNumber: number;
  budgetSpend: number;
  expectedConversionRate: number;
  projectedNewClients: number;
  projectedRevenue: number;
  estimatedROI: number;
  successProbability: number;
  primaryGrowthDriver: string;
  riskToGrowth: string;
}

export interface Benchmarking {
  malaysianIndustryAverageGrowth: number;
  competitorScoreIndex: number;
  performanceVsCompetitors: "Above Average" | "At Par" | "Below Average";
  marketSaturationWarning: boolean;
  industryAverageCAC: number;
  industryAverageROI: number;
}

export interface MarketingForecast {
  executiveSummary: ExecutiveSummary;
  timeSeriesData: TimeSeriesData;
  channelBreakdown: ChannelBreakdown[];
  funnelMetrics: FunnelMetrics;
  phaseProjections: PhaseProjection[];
  benchmarking: Benchmarking;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toNum(n: unknown, fallback = 0): number {
  if (n == null || n === '') return fallback;
  const x = Number(n);
  return Number.isFinite(x) ? x : fallback;
}

/** Agent JSON may omit fields — never call `.toLocaleString` on undefined. */
function fmt(n: unknown): string {
  return toNum(n).toLocaleString('en-MY');
}

function fmtRM(n: unknown): string {
  return `RM ${fmt(n)}`;
}

function normalizeExecutiveSummary(
  raw: Partial<ExecutiveSummary> | null | undefined,
): ExecutiveSummary {
  const r = raw ?? {};
  return {
    projectedTotalGrowth: toNum(r.projectedTotalGrowth),
    averageMonthlySuccessRate: toNum(r.averageMonthlySuccessRate),
    estimatedCAC: toNum(r.estimatedCAC),
    estimatedROI: toNum(r.estimatedROI),
    forecastConfidence: toNum(r.forecastConfidence),
    projectedTotalRevenue: toNum(r.projectedTotalRevenue),
    projectedTotalNewClients: toNum(r.projectedTotalNewClients),
  };
}

const PHASE_COLORS = ['#10b981', '#7c3aed', '#f59e0b', '#f43f5e'];
const CHANNEL_COLORS = ['#7c3aed', '#14b8a6', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#fb7185'];

const PERF_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  "Above Average": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-200", border: "border-emerald-300 dark:border-emerald-600/50" },
  "At Par":        { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-700 dark:text-amber-200",     border: "border-amber-300 dark:border-amber-600/50"   },
  "Below Average": { bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-700 dark:text-rose-200",       border: "border-rose-300 dark:border-rose-600/50"     },
};

// Shared tooltip styling — dark background with white text so it's readable
// on both light and dark themes.
const TOOLTIP_STYLE = {
  contentStyle: { backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 },
  labelStyle: { color: '#e5e5e5', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#e5e5e5' },
};

// Axis tick styling — white-ish text readable on dark backgrounds.
const AXIS_TICK = { fontSize: 11, fill: '#a3a3a3' };

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">{label}</p>
      <p className="text-xl sm:text-2xl font-bold" style={{ color }}>{value}</p>
      {sub && <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const v = Math.min(100, Math.max(0, toNum(value)));
  const color = v >= 70 ? '#10b981' : v >= 40 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Forecast Confidence</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${v}%`, background: color }} />
        </div>
        <span className="text-sm font-bold" style={{ color }}>{v}%</span>
      </div>
    </div>
  );
}

// ─── Section Heading ──────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-800 dark:text-neutral-100 mb-2">
      {children}
    </p>
  );
}


export default function MarketingForecastView({ forecast }: { forecast: MarketingForecast }) {
  const exec = normalizeExecutiveSummary(forecast.executiveSummary);
  const { timeSeriesData: ts, channelBreakdown, funnelMetrics, phaseProjections, benchmarking } = forecast;

  // Agent JSON may omit parallel arrays or whole timeSeries blocks — never index undefined.
  const months = ts?.months ?? [];
  const timeData = months.map((m, i) => ({
    month: `M${m}`,
    newClients: ts?.projectedNewClients?.[i] ?? 0,
    cumulativeClients: ts?.cumulativeClients?.[i] ?? 0,
    growthRate: ts?.growthRatePercentage?.[i] ?? 0,
    reach: ts?.marketingReachThousands?.[i] ?? 0,
    budgetSpend: ts?.monthlyBudgetSpend?.[i] ?? 0,
    cumulativeBudget: ts?.cumulativeBudgetSpend?.[i] ?? 0,
    revenue: ts?.projectedMonthlyRevenue?.[i] ?? 0,
    cumulativeRevenue: ts?.cumulativeRevenue?.[i] ?? 0,
  }));

  return (
    <div className="font-sans max-w-none space-y-6">

      {/* ── Executive Summary ── */}
      <div>
        <SectionHeading>Executive Summary</SectionHeading>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Projected Growth" value={`${exec.projectedTotalGrowth}%`} sub="total growth" color="#10b981" />
          <StatCard label="Total Revenue" value={fmtRM(exec.projectedTotalRevenue)} sub="projected" color="#7c3aed" />
          <StatCard label="New Clients" value={fmt(exec.projectedTotalNewClients)} sub="total acquired" color="#a78bfa" />
          <StatCard label="Est. CAC" value={fmtRM(exec.estimatedCAC)} sub="cost per acquisition" color="#f59e0b" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
          <StatCard label="Avg Monthly Success" value={`${exec.averageMonthlySuccessRate}%`} color="#7c3aed" />
          <StatCard label="Estimated ROI" value={`${exec.estimatedROI}x`} color="#10b981" />
          <ConfidenceBar value={exec.forecastConfidence} />
        </div>
      </div>

      {/* ── Revenue & Budget Time Series ── */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5">
        <SectionHeading>Monthly Revenue vs Budget Spend</SectionHeading>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={timeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtRM(v)} {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#10b981" fill="#10b981" fillOpacity={0.15} strokeWidth={2} />
            <Area type="monotone" dataKey="budgetSpend" name="Budget Spend" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Client Growth ── */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5">
        <SectionHeading>Client Acquisition & Cumulative Growth</SectionHeading>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={timeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis tick={AXIS_TICK} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="newClients" name="New Clients" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="cumulativeClients" name="Cumulative" stroke="#a78bfa" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Marketing Reach & Growth Rate ── */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5">
        <SectionHeading>Marketing Reach & Growth Rate</SectionHeading>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={timeData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
            <XAxis dataKey="month" tick={AXIS_TICK} />
            <YAxis yAxisId="left" tick={AXIS_TICK} tickFormatter={(v) => `${v}K`} />
            <YAxis yAxisId="right" orientation="right" tick={AXIS_TICK} tickFormatter={(v) => `${v}%`} />
            <Tooltip {...TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="reach" name="Reach (K)" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3 }} />
            <Line yAxisId="right" type="monotone" dataKey="growthRate" name="Growth %" stroke="#10b981" strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* ── Channel Breakdown ── */}
      {channelBreakdown?.length > 0 && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5">
          <SectionHeading>Channel Budget Allocation & ROI</SectionHeading>
          <ResponsiveContainer width="100%" height={Math.max(200, channelBreakdown.length * 40)}>
            <BarChart data={channelBreakdown} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.1} />
              <XAxis type="number" tick={AXIS_TICK} tickFormatter={(v) => fmtRM(v)} />
              <YAxis type="category" dataKey="channel" tick={AXIS_TICK} width={80} />
              <Tooltip formatter={(v: number) => fmtRM(v)} {...TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="allocatedBudget" name="Budget (RM)" radius={[0, 4, 4, 0]}>
                {channelBreakdown.map((_, i) => (
                  <Cell key={i} fill={CHANNEL_COLORS[i % CHANNEL_COLORS.length]} fillOpacity={0.8} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>

          {/* Channel detail table */}
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-white/[0.08]">
                  <th className="text-left py-2 px-2 font-semibold text-neutral-500">Channel</th>
                  <th className="text-right py-2 px-2 font-semibold text-neutral-500">Budget</th>
                  <th className="text-right py-2 px-2 font-semibold text-neutral-500">%</th>
                  <th className="text-right py-2 px-2 font-semibold text-neutral-500">Reach</th>
                  <th className="text-right py-2 px-2 font-semibold text-neutral-500">Conversions</th>
                  <th className="text-right py-2 px-2 font-semibold text-neutral-500">ROI</th>
                </tr>
              </thead>
              <tbody>
                {channelBreakdown.map((ch, i) => (
                  <tr key={ch.channel} className="border-b border-neutral-100 dark:border-white/[0.04]">
                    <td className="py-2 px-2 font-medium text-neutral-800 dark:text-neutral-200">
                      <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: CHANNEL_COLORS[i % CHANNEL_COLORS.length] }} />
                      {ch.channel}
                    </td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-300">{fmtRM(ch.allocatedBudget)}</td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-300">{toNum(ch.budgetPercentage)}%</td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-300">{fmt(ch.projectedReach)}</td>
                    <td className="py-2 px-2 text-right text-neutral-600 dark:text-neutral-300">{fmt(ch.projectedConversions)}</td>
                    <td className="py-2 px-2 text-right font-semibold text-emerald-600 dark:text-emerald-400">{ch.estimatedROI}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Funnel Metrics ── */}
      {funnelMetrics && (
        <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5">
          <SectionHeading>Marketing Funnel</SectionHeading>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            <div className="text-center">
              <p className="text-lg font-bold text-neutral-800 dark:text-white">{fmt(funnelMetrics.totalImpressions)}</p>
              <p className="text-[10px] text-neutral-500">Impressions</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-300">→ {funnelMetrics.impressionToLeadRate}%</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-primary-600 dark:text-primary-300">{fmt(funnelMetrics.totalLeads)}</p>
              <p className="text-[10px] text-neutral-500">Leads</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-xs font-semibold text-primary-600 dark:text-primary-300">→ {toNum(funnelMetrics.leadToConversionRate)}%</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-300">{fmt(funnelMetrics.totalConversions)}</p>
              <p className="text-[10px] text-neutral-500">Conversions</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Phase Projections ── */}
      {phaseProjections?.length > 0 && (
        <div>
          <SectionHeading>Phase Projections</SectionHeading>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {phaseProjections.map((phase) => {
              const color = PHASE_COLORS[(phase.phaseNumber - 1) % PHASE_COLORS.length];
              return (
                <div key={phase.phaseNumber} className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-3 sm:p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color }}>
                      P{phase.phaseNumber}
                    </div>
                    <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Phase {phase.phaseNumber}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <p className="text-[10px] text-neutral-500 mb-0.5">Budget</p>
                      <p className="font-bold" style={{ color }}>{fmtRM(phase.budgetSpend)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 mb-0.5">Revenue</p>
                      <p className="font-bold" style={{ color }}>{fmtRM(phase.projectedRevenue)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 mb-0.5">New Clients</p>
                      <p className="font-bold">{phase.projectedNewClients}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 mb-0.5">ROI</p>
                      <p className="font-bold text-emerald-600 dark:text-emerald-400">{toNum(phase.estimatedROI)}x</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 mb-0.5">Conversion</p>
                      <p className="font-bold">{toNum(phase.expectedConversionRate)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-neutral-500 mb-0.5">Success Prob.</p>
                      <p className="font-bold">{toNum(phase.successProbability)}%</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="rounded-md bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-white/[0.06] px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-neutral-500 mb-0.5">Growth Driver</p>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-snug">{phase.primaryGrowthDriver ?? '—'}</p>
                    </div>
                    <div className="rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/30 px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mb-0.5">Risk</p>
                      <p className="text-xs text-rose-700 dark:text-rose-300 leading-snug">{phase.riskToGrowth ?? '—'}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Benchmarking ── */}
      {benchmarking && (
        <div className={`rounded-xl border ${(PERF_STYLES[benchmarking.performanceVsCompetitors] ?? PERF_STYLES["At Par"]).border} ${(PERF_STYLES[benchmarking.performanceVsCompetitors] ?? PERF_STYLES["At Par"]).bg} p-4 sm:p-5`}>
          <SectionHeading>Malaysian Market Benchmarking</SectionHeading>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-neutral-500 mb-0.5">Industry Avg Growth</p>
              <p className="text-sm font-bold">{toNum(benchmarking.malaysianIndustryAverageGrowth)}%</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 mb-0.5">Your Growth</p>
              <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{exec.projectedTotalGrowth}%</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 mb-0.5">Competitor Score</p>
              <p className="text-sm font-bold">{benchmarking.competitorScoreIndex}/100</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 mb-0.5">Industry Avg CAC</p>
              <p className="text-sm font-bold">{fmtRM(benchmarking.industryAverageCAC)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 mb-0.5">Industry Avg ROI</p>
              <p className="text-sm font-bold">{toNum(benchmarking.industryAverageROI)}x</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-500 mb-0.5">vs Competitors</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold border ${(PERF_STYLES[benchmarking.performanceVsCompetitors] ?? PERF_STYLES["At Par"]).border} ${(PERF_STYLES[benchmarking.performanceVsCompetitors] ?? PERF_STYLES["At Par"]).text}`}>
                {benchmarking.performanceVsCompetitors}
              </span>
            </div>
          </div>
          {benchmarking.marketSaturationWarning && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 mt-2">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
                <span className="font-semibold">Market Saturation Warning:</span> Your target market may be approaching saturation. Consider diversifying channels or targeting adjacent segments.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
