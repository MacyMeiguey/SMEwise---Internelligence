// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExecutiveSummary {
  projectedTotalGrowth: number;
  averageMonthlySuccessRate: number;
  estimatedCAC: number;
  forecastConfidence: number;
}

export interface TimeSeriesData {
  months: number[];
  projectedNewClients: number[];
  growthRatePercentage: number[];
  marketingReachThousands: number[];
}

export interface PhaseProjection {
  phaseNumber: number;
  expectedConversionRate: number;
  successProbability: number;
  primaryGrowthDriver: string;
  riskToGrowth: string;
}

export interface Benchmarking {
  malaysianIndustryAverageGrowth: number;
  performanceVsCompetitors: "Above Average" | "At Par" | "Below Average";
  marketSaturationWarning: boolean;
}

export interface MarketingForecast {
  executiveSummary: ExecutiveSummary;
  timeSeriesData: TimeSeriesData;
  phaseProjections: PhaseProjection[];
  benchmarking: Benchmarking;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PERF_STYLES: Record<Benchmarking["performanceVsCompetitors"], { bg: string; text: string; border: string }> = {
  "Above Average": { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-300 dark:border-emerald-600/50" },
  "At Par":        { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-800 dark:text-amber-200",     border: "border-amber-300 dark:border-amber-600/50"   },
  "Below Average": { bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-800 dark:text-rose-200",       border: "border-rose-300 dark:border-rose-600/50"     },
};

const PHASE_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#f43f5e"];

// ─── SVG Line Chart ───────────────────────────────────────────────────────────

interface LineChartProps {
  data: number[];
  labels: string[];
  color: string;
  fillColor: string;
  yLabel: string;
  formatY?: (v: number) => string;
}

function LineChart({ data, labels, color, fillColor, yLabel, formatY = String }: LineChartProps) {
  const W = 480;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 32, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const minVal = Math.min(...data);
  const maxVal = Math.max(...data);
  const range = maxVal - minVal || 1;

  const xStep = chartW / (data.length - 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH;

  const points = data.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const areaPoints = [
    `${toX(0)},${PAD.top + chartH}`,
    ...data.map((v, i) => `${toX(i)},${toY(v)}`),
    `${toX(data.length - 1)},${PAD.top + chartH}`,
  ].join(" ");

  // Y-axis ticks (3 ticks)
  const yTicks = [minVal, minVal + range / 2, maxVal];

  return (
    <div className="w-full">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">{yLabel}</p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
        {/* Grid lines */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={PAD.left} y1={toY(tick)}
              x2={PAD.left + chartW} y2={toY(tick)}
              stroke="currentColor" strokeOpacity={0.08} strokeWidth={1}
            />
            <text
              x={PAD.left - 6} y={toY(tick) + 4}
              textAnchor="end" fontSize={9}
              fill="currentColor" fillOpacity={0.45}
            >
              {formatY(Math.round(tick * 10) / 10)}
            </text>
          </g>
        ))}

        {/* Area fill */}
        <polygon points={areaPoints} fill={fillColor} opacity={0.15} />

        {/* Line */}
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Data points */}
        {data.map((v, i) => (
          <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={color} />
        ))}

        {/* X-axis labels — show every 3rd */}
        {labels.map((label, i) => (
          i % 3 === 0 && (
            <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.45}>
              {label}
            </text>
          )
        ))}
      </svg>
    </div>
  );
}

// ─── Dual Line Chart (two series) ────────────────────────────────────────────

interface DualLineChartProps {
  data1: number[];
  data2: number[];
  color1: string;
  color2: string;
  label1: string;
  label2: string;
  labels: string[];
  formatY?: (v: number) => string;
}

function DualLineChart({ data1, data2, color1, color2, label1, label2, labels, formatY = String }: DualLineChartProps) {
  const W = 480;
  const H = 160;
  const PAD = { top: 12, right: 16, bottom: 32, left: 48 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allVals = [...data1, ...data2];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals);
  const range = maxVal - minVal || 1;

  const xStep = chartW / (data1.length - 1);
  const toX = (i: number) => PAD.left + i * xStep;
  const toY = (v: number) => PAD.top + chartH - ((v - minVal) / range) * chartH;

  const pts1 = data1.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const pts2 = data2.map((v, i) => `${toX(i)},${toY(v)}`).join(" ");
  const yTicks = [minVal, minVal + range / 2, maxVal];

  return (
    <div className="w-full">
      <div className="flex items-center gap-4 mb-1">
        {[{ color: color1, label: label1 }, { color: color2, label: label2 }].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: color }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</span>
          </div>
        ))}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line x1={PAD.left} y1={toY(tick)} x2={PAD.left + chartW} y2={toY(tick)} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text x={PAD.left - 6} y={toY(tick) + 4} textAnchor="end" fontSize={9} fill="currentColor" fillOpacity={0.45}>
              {formatY(Math.round(tick * 10) / 10)}
            </text>
          </g>
        ))}
        <polyline points={pts1} fill="none" stroke={color1} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={pts2} fill="none" stroke={color2} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="5 3" />
        {data1.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={2.5} fill={color1} />)}
        {data2.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={2.5} fill={color2} />)}
        {labels.map((label, i) => (
          i % 3 === 0 && (
            <text key={i} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="currentColor" fillOpacity={0.45}>{label}</text>
          )
        ))}
      </svg>
    </div>
  );
}

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

// ─── Confidence Bar ───────────────────────────────────────────────────────────

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 70 ? "#10b981" : value >= 40 ? "#f59e0b" : "#f43f5e";
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-3 sm:p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">Forecast Confidence</p>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 rounded-full bg-neutral-100 dark:bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: color }} />
        </div>
        <span className="text-sm font-bold" style={{ color }}>{value}%</span>
      </div>
    </div>
  );
}

// ─── Phase Projection Cards ───────────────────────────────────────────────────

function PhaseProjectionCard({ phase }: { phase: PhaseProjection }) {
  const color = PHASE_COLORS[(phase.phaseNumber - 1) % PHASE_COLORS.length];
  const convPct = Math.round(phase.expectedConversionRate * 100) / 100;
  const succPct = Math.round(phase.successProbability * 100) / 100;

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: color }}>
          P{phase.phaseNumber}
        </div>
        <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">Phase {phase.phaseNumber}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">Conversion Rate</p>
          <p className="text-sm font-bold" style={{ color }}>{convPct}%</p>
        </div>
        <div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">Success Probability</p>
          <p className="text-sm font-bold" style={{ color }}>{succPct}%</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="rounded-md bg-neutral-50 dark:bg-white/[0.03] border border-neutral-100 dark:border-white/[0.06] px-2.5 py-2">
          <p className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-0.5">Primary Growth Driver</p>
          <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-snug">{phase.primaryGrowthDriver}</p>
        </div>
        <div className="rounded-md bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-800/30 px-2.5 py-2">
          <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mb-0.5">Risk to Growth</p>
          <p className="text-xs text-rose-700 dark:text-rose-300 leading-snug">{phase.riskToGrowth}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Benchmarking Card ────────────────────────────────────────────────────────

function BenchmarkingCard({ bench, projectedGrowth }: { bench: Benchmarking; projectedGrowth: number }) {
  const s = PERF_STYLES[bench.performanceVsCompetitors] ?? PERF_STYLES["At Par"];

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 sm:p-5`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
        Malaysian Market Benchmarking
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
        <div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">Industry Avg Growth</p>
          <p className={`text-lg font-bold ${s.text}`}>{bench.malaysianIndustryAverageGrowth}%</p>
        </div>
        <div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">Your Projected Growth</p>
          <p className={`text-lg font-bold ${s.text}`}>{projectedGrowth}%</p>
        </div>
        <div>
          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mb-0.5">vs Competitors</p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.border} ${s.text} ${s.bg}`}>
            {bench.performanceVsCompetitors}
          </span>
        </div>
      </div>
      {bench.marketSaturationWarning && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 px-3 py-2">
          <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs text-amber-800 dark:text-amber-200 leading-snug">
            <span className="font-semibold">Market Saturation Warning:</span> Your target market may be approaching saturation. Consider diversifying channels or targeting adjacent segments.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketingForecast({ forecast }: { forecast: MarketingForecast }) {
  const { executiveSummary: exec, timeSeriesData: ts, phaseProjections, benchmarking } = forecast;
  const monthLabels = ts.months.map(m => `M${m}`);

  return (
    <div className="font-sans max-w-none space-y-5">

      {/* ── Executive Summary Stats ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
          Executive Summary
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Projected Growth"
            value={`${exec.projectedTotalGrowth}%`}
            sub="over campaign duration"
            color="#10b981"
          />
          <StatCard
            label="Avg Monthly Success"
            value={`${exec.averageMonthlySuccessRate}%`}
            sub="success rate"
            color="#3b82f6"
          />
          <StatCard
            label="Est. CAC"
            value={`RM ${exec.estimatedCAC.toLocaleString("en-MY")}`}
            sub="cost per acquisition"
            color="#f59e0b"
          />
          <ConfidenceBar value={exec.forecastConfidence} />
        </div>
      </div>

      {/* ── Time Series Charts ── */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4">
          12-Month Projections
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LineChart
            data={ts.projectedNewClients}
            labels={monthLabels}
            color="#3b82f6"
            fillColor="#3b82f6"
            yLabel="Projected New Clients"
            formatY={(v) => String(Math.round(v))}
          />
          <LineChart
            data={ts.growthRatePercentage}
            labels={monthLabels}
            color="#10b981"
            fillColor="#10b981"
            yLabel="Growth Rate (%)"
            formatY={(v) => `${v}%`}
          />
          <div className="lg:col-span-2">
            <DualLineChart
              data1={ts.marketingReachThousands}
              data2={ts.projectedNewClients.map(v => v / 10)}
              color1="#a855f7"
              color2="#f59e0b"
              label1="Marketing Reach (K)"
              label2="New Clients (÷10)"
              labels={monthLabels}
              formatY={(v) => `${v}`}
            />
          </div>
        </div>
      </div>

      {/* ── Phase Projections ── */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
          Phase Projections
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {phaseProjections.map(phase => (
            <PhaseProjectionCard key={phase.phaseNumber} phase={phase} />
          ))}
        </div>
      </div>

      {/* ── Benchmarking ── */}
      <BenchmarkingCard bench={benchmarking} projectedGrowth={exec.projectedTotalGrowth} />
    </div>
  );
}
