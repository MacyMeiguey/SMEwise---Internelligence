import { useState } from "react";

// ─── Types (mirrors the strict JSON schema the agent outputs) ─────────────────

export interface Tactic {
  channel: string;
  action: string;
  amount: number;
}

export interface Phase {
  phaseNumber: number;
  name: string;
  timeline: string;
  overview: string;
  budgetAmount: number;
  budgetPercentage: number;
  tactics: Tactic[];
}

export interface MarketingPlan {
  company: string;
  industry: string;
  location: string;
  totalBudget: number;
  currency: string;
  duration: string;
  phases: Phase[];
}

// ─── Demo data (replace with your agent's JSON output) ───────────────────────

const DEMO_PLAN: MarketingPlan = {
  company: "Pixel Perfect",
  industry: "Camera & Photography",
  location: "Kuala Lumpur",
  totalBudget: 24000,
  currency: "RM",
  duration: "12 Months",
  phases: [
    {
      phaseNumber: 1,
      name: "Awareness",
      timeline: "Month 1–3",
      overview: "Build brand presence and reach photography enthusiasts across KL through digital and offline channels.",
      budgetAmount: 9000,
      budgetPercentage: 37.5,
      tactics: [
        { channel: "Facebook/Instagram Ads", action: "Run targeted ads to photography & videography enthusiasts in KL", amount: 5000 },
        { channel: "Influencer Collaboration", action: "Partner with 2–3 local KL photography influencers for product showcases", amount: 3000 },
        { channel: "Google My Business", action: "Set up and optimise GMB listing with photos, reviews, and posts", amount: 1000 },
      ],
    },
    {
      phaseNumber: 2,
      name: "Engagement",
      timeline: "Month 4–6",
      overview: "Deepen relationships with potential customers through community building and interactive touchpoints.",
      budgetAmount: 4000,
      budgetPercentage: 16.7,
      tactics: [
        { channel: "WhatsApp Business", action: "Launch broadcast list for product tips and personalised support", amount: 1000 },
        { channel: "Local Events", action: "Host 2 photography workshops at co-working spaces in Bangsar/TTDI", amount: 2000 },
        { channel: "Local Partnerships", action: "Partner with photography clubs (e.g. KL Photography Society) for cross-promo", amount: 1000 },
      ],
    },
    {
      phaseNumber: 3,
      name: "Conversion",
      timeline: "Month 7–9",
      overview: "Drive direct sales through optimised digital storefronts and targeted performance campaigns.",
      budgetAmount: 8000,
      budgetPercentage: 33.3,
      tactics: [
        { channel: "Shopee/Lazada", action: "Open official store, run Shopee Ads and participate in 11.11 campaigns", amount: 3000 },
        { channel: "Facebook/Instagram Ads", action: "Retargeting ads with product demos and limited-time Raya/Merdeka promos", amount: 4000 },
        { channel: "Flyers & Posters", action: "Distribute at photography studios and camera shops in KL city centre", amount: 1000 },
      ],
    },
    {
      phaseNumber: 4,
      name: "Retention",
      timeline: "Month 10–12",
      overview: "Maximise customer lifetime value through loyalty programmes and continuous feedback loops.",
      budgetAmount: 3000,
      budgetPercentage: 12.5,
      tactics: [
        { channel: "Email Marketing", action: "Monthly newsletter with exclusive discounts, tips, and new arrivals", amount: 1000 },
        { channel: "Loyalty Programme", action: "Points-based system with referral bonuses for repeat customers", amount: 1000 },
        { channel: "Community Building", action: "Create private Facebook Group for customers; gather feedback via surveys", amount: 1000 },
      ],
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_STYLES = [
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-600/50", text: "text-emerald-800 dark:text-emerald-200", badge: "bg-emerald-200 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100", bar: "bg-emerald-500" },
  { bg: "bg-primary-50 dark:bg-primary-950/30", border: "border-primary-300 dark:border-primary-600/50", text: "text-primary-800 dark:text-primary-200", badge: "bg-primary-200 dark:bg-primary-800/60 text-primary-900 dark:text-primary-100", bar: "bg-primary-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300 dark:border-amber-600/50", text: "text-amber-800 dark:text-amber-200", badge: "bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100", bar: "bg-amber-500" },
  { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-300 dark:border-rose-600/50", text: "text-rose-800 dark:text-rose-200", badge: "bg-rose-200 dark:bg-rose-800/60 text-rose-900 dark:text-rose-100", bar: "bg-rose-500" },
];

const fmt = (n: number, currency: string) =>
  `${currency} ${n.toLocaleString("en-MY")}`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function PhaseRow({ phase, currency, isOpen, onToggle }: {
  phase: Phase;
  currency: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const s = PHASE_STYLES[(phase.phaseNumber - 1) % PHASE_STYLES.length];

  return (
    <div className={`rounded-xl border ${s.border} overflow-hidden bg-white dark:bg-[#101018] transition-shadow duration-150`}>
      {/* Header row */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 ${s.bg} text-left cursor-pointer border-none`}
      >
        {/* Phase badge */}
        <div className={`w-9 h-9 rounded-full ${s.badge} flex items-center justify-center text-xs font-bold shrink-0`}>
          P{phase.phaseNumber}
        </div>

        {/* Name + timeline */}
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
            Phase {phase.phaseNumber}: {phase.name}
          </div>
          <div className={`text-xs mt-0.5 ${s.text}`}>
            {phase.timeline}
          </div>
        </div>

        {/* Budget pill */}
        <div className={`hidden sm:inline-flex ${s.badge} rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap`}>
          {fmt(phase.budgetAmount, currency)}
          <span className="font-normal opacity-75 ml-1">({phase.budgetPercentage}%)</span>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          {/* Budget pill (mobile) */}
          <div className={`sm:hidden inline-flex ${s.badge} rounded-full px-3 py-1 text-xs font-semibold mt-3`}>
            {fmt(phase.budgetAmount, currency)} ({phase.budgetPercentage}%)
          </div>

          {/* Overview */}
          <p className={`text-sm text-neutral-600 dark:text-neutral-400 mt-3 mb-4 leading-relaxed border-l-[3px] ${s.border} pl-3`}>
            {phase.overview}
          </p>

          {/* Tactics table */}
          <div className="overflow-x-auto -mx-4 sm:-mx-5 px-4 sm:px-5">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className={s.bg}>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Channel</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Action</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">Budget</th>
                </tr>
              </thead>
              <tbody>
                {phase.tactics.map((t, i) => (
                  <tr key={i} className="border-b border-neutral-100 dark:border-white/[0.06]">
                    <td className="px-3 py-2.5 align-top whitespace-nowrap">
                      <span className={`${s.badge} px-2 py-0.5 rounded text-[11px] font-semibold`}>
                        {t.channel}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top text-neutral-700 dark:text-neutral-300 leading-snug">{t.action}</td>
                    <td className={`px-3 py-2.5 align-top text-right font-semibold whitespace-nowrap ${s.text}`}>
                      {fmt(t.amount, currency)}
                    </td>
                  </tr>
                ))}
                <tr className={s.bg}>
                  <td colSpan={2} className="px-3 py-2.5 font-bold text-neutral-900 dark:text-white">Phase Total</td>
                  <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${s.text}`}>
                    {fmt(phase.budgetAmount, currency)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MarketingPlan({ plan = DEMO_PLAN }: { plan?: MarketingPlan }) {
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set());

  const toggle = (n: number) => setOpenPhases(prev => {
    const next = new Set(prev);
    next.has(n) ? next.delete(n) : next.add(n);
    return next;
  });

  const expandAll = () => setOpenPhases(new Set(plan.phases.map(p => p.phaseNumber)));
  const collapseAll = () => setOpenPhases(new Set());

  return (
    <div className="font-sans max-w-none">

      {/* Header card */}
      <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] px-4 sm:px-5 py-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
              Long-Term Marketing Plan
            </p>
            <h3 className="text-lg font-bold text-neutral-900 dark:text-white leading-tight truncate">{plan.company}</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {plan.industry} · {plan.location} · {plan.duration}
            </p>
          </div>
          <div className="sm:text-right shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-0.5">Total Budget</p>
            <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">{fmt(plan.totalBudget, plan.currency)}</p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">{plan.phases.length} phases</p>
          </div>
        </div>
      </div>

      {/* Budget bar */}
      <div className="mb-4">
        <div className="flex h-2 rounded-full overflow-hidden bg-neutral-100 dark:bg-white/[0.06]">
          {plan.phases.map((p, i) => (
            <div
              key={i}
              title={`Phase ${p.phaseNumber}: ${p.budgetPercentage}%`}
              className={`${PHASE_STYLES[i % PHASE_STYLES.length].bar} transition-all duration-300`}
              style={{ width: `${p.budgetPercentage}%` }}
            />
          ))}
        </div>
        <div className="flex gap-3 sm:gap-4 mt-2 flex-wrap">
          {plan.phases.map((p, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
              <span className={`w-2.5 h-2.5 rounded-sm ${PHASE_STYLES[i % PHASE_STYLES.length].bar} inline-block`} />
              P{p.phaseNumber}: {p.name} ({p.budgetPercentage}%)
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-2 mb-3 justify-end">
        <button
          onClick={expandAll}
          className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/[0.12] bg-white dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          Expand All
        </button>
        <button
          onClick={collapseAll}
          className="text-xs px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-white/[0.12] bg-white dark:bg-white/[0.04] text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          Collapse All
        </button>
      </div>

      {/* Phase rows */}
      <div className="flex flex-col gap-3">
        {plan.phases.map(phase => (
          <PhaseRow
            key={phase.phaseNumber}
            phase={phase}
            currency={plan.currency}
            isOpen={openPhases.has(phase.phaseNumber)}
            onToggle={() => toggle(phase.phaseNumber)}
          />
        ))}
      </div>

      {/* Footer */}
      <div className="mt-4 px-4 sm:px-5 py-3 rounded-xl bg-neutral-50 dark:bg-white/[0.03] border border-neutral-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-neutral-600 dark:text-neutral-400">Total allocated across all phases</span>
        <span className="font-bold text-neutral-900 dark:text-white">
          {fmt(plan.phases.reduce((s, p) => s + p.budgetAmount, 0), plan.currency)}
          {" / "}
          {fmt(plan.totalBudget, plan.currency)}
        </span>
      </div>
    </div>
  );
}
