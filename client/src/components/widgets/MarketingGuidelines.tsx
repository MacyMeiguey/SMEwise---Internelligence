import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetUtilization {
  totalAllocated: number;
  spendBreakdown: string[];
  costEfficiencyTip: string;
}

export interface TacticalDeepDive {
  channel: string;
  executionSteps: string;
  budgetUtilization: BudgetUtilization;
  suggestedTools: string[];
  estimatedKpis: string;
}

export interface RoadmapPhase {
  phaseNumber: number;
  phaseName: string;
  phaseBudgetStrategy: string;
  operationalGuidelines: string[];
  tacticalDeepDive: TacticalDeepDive[];
  criticalMilestone: string;
}

export interface FeasibilityAudit {
  score: number;
  status: "Practical" | "Ambitious" | "Unrealistic";
  summary: string;
  topRisks: string[];
}

export interface ResourceRequirements {
  personnel: string[];
  thirdPartyServices: string[];
}

export interface MarketingGuidelines {
  feasibilityAudit: FeasibilityAudit;
  detailedRoadmap: RoadmapPhase[];
  resourceRequirements: ResourceRequirements;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE_STYLES = [
  { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-300 dark:border-emerald-600/50", text: "text-emerald-800 dark:text-emerald-200", badge: "bg-emerald-200 dark:bg-emerald-800/60 text-emerald-900 dark:text-emerald-100", bar: "bg-emerald-500" },
  { bg: "bg-primary-50 dark:bg-primary-950/30", border: "border-primary-300 dark:border-primary-600/50", text: "text-primary-800 dark:text-primary-200", badge: "bg-primary-200 dark:bg-primary-800/60 text-primary-900 dark:text-primary-100", bar: "bg-primary-500" },
  { bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-300 dark:border-amber-600/50", text: "text-amber-800 dark:text-amber-200", badge: "bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100", bar: "bg-amber-500" },
  { bg: "bg-rose-50 dark:bg-rose-950/30", border: "border-rose-300 dark:border-rose-600/50", text: "text-rose-800 dark:text-rose-200", badge: "bg-rose-200 dark:bg-rose-800/60 text-rose-900 dark:text-rose-100", bar: "bg-rose-500" },
];

const STATUS_STYLES: Record<FeasibilityAudit["status"], { bg: string; text: string; border: string }> = {
  Practical:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-800 dark:text-emerald-200", border: "border-emerald-300 dark:border-emerald-600/50" },
  Ambitious:   { bg: "bg-amber-50 dark:bg-amber-950/30",     text: "text-amber-800 dark:text-amber-200",     border: "border-amber-300 dark:border-amber-600/50"   },
  Unrealistic: { bg: "bg-rose-50 dark:bg-rose-950/30",       text: "text-rose-800 dark:text-rose-200",       border: "border-rose-300 dark:border-rose-600/50"     },
};

const fmt = (n: number) => `RM ${n.toLocaleString("en-MY")}`;

// ─── Feasibility Audit Card ───────────────────────────────────────────────────

function FeasibilityCard({ audit }: { audit: FeasibilityAudit }) {
  const s = STATUS_STYLES[audit.status] ?? STATUS_STYLES.Practical;
  const scoreColor =
    audit.score >= 70 ? "text-emerald-700 dark:text-emerald-300" :
    audit.score >= 40 ? "text-amber-700 dark:text-amber-300" :
    "text-rose-700 dark:text-rose-300";
  const barColor =
    audit.score >= 70 ? "bg-emerald-500" :
    audit.score >= 40 ? "bg-amber-500" :
    "bg-rose-500";

  return (
    <div className={`rounded-xl border ${s.border} ${s.bg} p-4 sm:p-5 mb-4`}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-1">
            Feasibility Audit
          </p>
          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${s.border} ${s.text} ${s.bg}`}>
            {audit.status}
          </span>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-0.5">Score</p>
          <p className={`text-3xl font-bold ${scoreColor}`}>
            {audit.score}<span className="text-base font-normal opacity-60">/100</span>
          </p>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-2 rounded-full bg-neutral-200 dark:bg-white/[0.08] mb-3 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${audit.score}%` }} />
      </div>

      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed mb-3">{audit.summary}</p>

      {audit.topRisks.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">Top Risks</p>
          <ul className="space-y-1.5">
            {audit.topRisks.map((risk, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${barColor}`} />
                {risk}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ─── Phase Row ────────────────────────────────────────────────────────────────

function PhaseRow({ phase, isOpen, onToggle }: {
  phase: RoadmapPhase;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const s = PHASE_STYLES[(phase.phaseNumber - 1) % PHASE_STYLES.length];

  return (
    <div className={`rounded-xl border ${s.border} overflow-hidden bg-white dark:bg-[#101018]`}>
      {/* Header */}
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3.5 ${s.bg} text-left cursor-pointer border-none`}
      >
        <div className={`w-9 h-9 rounded-full ${s.badge} flex items-center justify-center text-xs font-bold shrink-0`}>
          P{phase.phaseNumber}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">
            Phase {phase.phaseNumber}: {phase.phaseName}
          </div>
          {phase.phaseBudgetStrategy && (
            <div className={`text-xs mt-0.5 ${s.text} line-clamp-1`}>{phase.phaseBudgetStrategy}</div>
          )}
        </div>
        <svg
          className={`w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded */}
      {isOpen && (
        <div className="px-4 sm:px-5 pb-5">
          {/* Operational Guidelines */}
          {phase.operationalGuidelines.length > 0 && (
            <div className="mt-4 mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Operational Guidelines
              </p>
              <ol className="space-y-2">
                {phase.operationalGuidelines.map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                    <span className={`mt-0.5 w-5 h-5 rounded-full ${s.badge} flex items-center justify-center text-[10px] font-bold shrink-0`}>
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Tactical Deep Dive */}
          {phase.tacticalDeepDive.length > 0 && (
            <div className="mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
                Tactical Deep Dive
              </p>
              <div className="space-y-3">
                {phase.tacticalDeepDive.map((tactic, i) => (
                  <div key={i} className={`rounded-lg border ${s.border} ${s.bg} p-3 space-y-2.5`}>
                    {/* Channel badge + execution steps */}
                    <div className="flex items-start gap-2 flex-wrap">
                      <span className={`${s.badge} px-2 py-0.5 rounded text-[11px] font-semibold shrink-0`}>
                        {tactic.channel}
                      </span>
                    </div>
                    <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-snug">
                      {tactic.executionSteps}
                    </p>

                    {/* Budget Utilization */}
                    {tactic.budgetUtilization && (
                      <div className="rounded-md border border-neutral-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] p-2.5 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                            Budget
                          </p>
                          <span className={`text-xs font-bold ${s.text}`}>
                            {fmt(tactic.budgetUtilization.totalAllocated)}
                          </span>
                        </div>
                        {tactic.budgetUtilization.spendBreakdown.length > 0 && (
                          <ul className="space-y-0.5">
                            {tactic.budgetUtilization.spendBreakdown.map((item, j) => (
                              <li key={j} className="text-xs text-neutral-600 dark:text-neutral-400 flex items-start gap-1.5">
                                <span className="mt-1.5 w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500 shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        )}
                        {tactic.budgetUtilization.costEfficiencyTip && (
                          <p className={`text-xs ${s.text} leading-snug border-t border-neutral-200 dark:border-white/[0.06] pt-1.5`}>
                            <span className="font-semibold">Tip: </span>
                            {tactic.budgetUtilization.costEfficiencyTip}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Suggested Tools */}
                    {tactic.suggestedTools.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {tactic.suggestedTools.map((tool, j) => (
                          <span key={j} className="rounded-md border border-neutral-200 dark:border-white/[0.12] bg-white dark:bg-white/[0.04] px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">
                            {tool}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* KPIs */}
                    <p className={`text-xs ${s.text} leading-snug`}>
                      <span className="font-semibold">KPI: </span>{tactic.estimatedKpis}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Critical Milestone */}
          <div className={`rounded-lg border-l-4 ${s.border} pl-3 py-2`}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-0.5">
              Critical Milestone
            </p>
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">{phase.criticalMilestone}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Resource Requirements ────────────────────────────────────────────────────

function ResourceCard({ resources }: { resources: ResourceRequirements }) {
  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/[0.09] bg-white dark:bg-[#101018] p-4 sm:p-5 mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-3">
        Resource Requirements
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Personnel</p>
          <ul className="space-y-1.5">
            {resources.personnel.map((role, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                {role}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Third-Party Services</p>
          <ul className="space-y-1.5">
            {resources.thirdPartyServices.map((svc, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-500 shrink-0" />
                {svc}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketingGuidelines({ guidelines }: { guidelines: MarketingGuidelines }) {
  const [openPhases, setOpenPhases] = useState<Set<number>>(new Set([1]));

  const toggle = (n: number) => setOpenPhases(prev => {
    const next = new Set(prev);
    next.has(n) ? next.delete(n) : next.add(n);
    return next;
  });

  const expandAll = () => setOpenPhases(new Set(guidelines.detailedRoadmap.map(p => p.phaseNumber)));
  const collapseAll = () => setOpenPhases(new Set());

  return (
    <div className="font-sans max-w-none">
      {/* Feasibility Audit */}
      <FeasibilityCard audit={guidelines.feasibilityAudit} />

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

      {/* Roadmap phases */}
      <div className="flex flex-col gap-3">
        {guidelines.detailedRoadmap.map(phase => (
          <PhaseRow
            key={phase.phaseNumber}
            phase={phase}
            isOpen={openPhases.has(phase.phaseNumber)}
            onToggle={() => toggle(phase.phaseNumber)}
          />
        ))}
      </div>

      {/* Resource Requirements */}
      <ResourceCard resources={guidelines.resourceRequirements} />
    </div>
  );
}
