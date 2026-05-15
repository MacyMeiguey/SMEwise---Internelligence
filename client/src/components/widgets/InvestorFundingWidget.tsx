/**
 * InvestorFundingWidget — Financial Planning Section
 * "Investor & Funding Suggestion"
 *
 * Calls the dedicated AWS Bedrock Agent (K5UUZVS6JI / PNWZWR9JBM).
 * Agent schema:
 * {
 *   company, industry,
 *   grants:       [{ name, url }],
 *   investors:    [{ name, url }],
 *   accelerators: [{ name, url }],
 *   bestRecommendation: { source, reason, nextStep }
 * }
 *
 * Renders four animated sections + a Best Recommendation highlight.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import {
  Award,
  Users,
  Rocket,
  Sparkles,
  ExternalLink,
  ArrowRight,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FundingItem {
  name: string;
  url: string;
}

interface InvestorFundingPlan {
  company: string;
  industry: string;
  grants: FundingItem[];
  investors: FundingItem[];
  accelerators: FundingItem[];
  bestRecommendation: {
    source: string;
    reason: string;
    nextStep: string;
  };
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchInvestorFunding(profile: BusinessProfile): Promise<InvestorFundingPlan> {
  const payload = {
    companyName:   profile.companyName,
    industry:      profile.industry,
    businessStage: profile.businessStage,
    city:          profile.city,
    // Always send Goal — agent instruction lists it as one of the 6 required fields
    mainGoal:      profile.mainGoal?.trim() || "Grow the business sustainably",
    businessType:  profile.businessType,
  };

  const res = await fetch(`${API_BASE}/api/bedrock/investor-funding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }

  const data = (await res.json()) as { content: string };

  let jsonStr = data.content.trim();
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/i, "").replace(/\n?```$/, "").trim();
  }
  const start = jsonStr.indexOf("{");
  const end   = jsonStr.lastIndexOf("}");
  if (start !== -1 && end !== -1) jsonStr = jsonStr.slice(start, end + 1);

  return JSON.parse(jsonStr) as InvestorFundingPlan;
}

// ─── Animation hook ───────────────────────────────────────────────────────────

function useFadeUp(delayMs = 0) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Start hidden
    el.style.opacity = "0";
    el.style.transform = "translateY(18px)";
    el.style.transition = `opacity 0.5s ease ${delayMs}ms, transform 0.5s ease ${delayMs}ms`;

    const timer = setTimeout(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            el.style.opacity = "1";
            el.style.transform = "translateY(0)";
            observer.disconnect();
          }
        },
        { threshold: 0.05 },
      );
      observer.observe(el);
      return () => observer.disconnect();
    }, 60);

    return () => clearTimeout(timer);
  }, [delayMs]);

  return ref;
}

// ─── Pill link ────────────────────────────────────────────────────────────────

function ItemPill({
  item,
  accent,
  delay,
}: {
  item: FundingItem;
  accent: string;   // tailwind border + text classes
  delay: number;
}) {
  const ref = useFadeUp(delay);
  return (
    <div ref={ref}>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className={`group flex items-center justify-between gap-3 rounded-xl border ${accent} bg-white/[0.03] hover:bg-white/[0.07] transition-all duration-200 px-4 py-3`}
      >
        <span className="text-sm font-medium text-neutral-200 leading-snug group-hover:text-white transition-colors">
          {item.name}
        </span>
        <ExternalLink
          className="h-3.5 w-3.5 shrink-0 text-neutral-500 group-hover:text-primary-300 transition-colors"
          aria-hidden
        />
      </a>
    </div>
  );
}

// ─── Category block ───────────────────────────────────────────────────────────

function CategoryBlock({
  icon,
  label,
  iconColour,
  accent,
  items,
  baseDelay,
}: {
  icon: React.ReactNode;
  label: string;
  iconColour: string;
  accent: string;
  items: FundingItem[];
  baseDelay: number;
}) {
  const headRef = useFadeUp(baseDelay);
  return (
    <div>
      {/* Heading */}
      <div ref={headRef} className="flex items-center gap-2 mb-3">
        <span className={iconColour}>{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">{label}</h3>
      </div>
      {/* Items */}
      <div className="grid sm:grid-cols-2 gap-2">
        {items.map((item, i) => (
          <ItemPill
            key={item.name}
            item={item}
            accent={accent}
            delay={baseDelay + 60 + i * 70}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Full plan view ───────────────────────────────────────────────────────────

function InvestorFundingView({ plan }: { plan: InvestorFundingPlan }) {
  const bestRef    = useFadeUp(0);
  const headerRef  = useFadeUp(60);

  return (
    <div className="space-y-7">

      {/* Company / industry strip */}
      <div ref={headerRef} className="flex flex-wrap gap-2 text-sm">
        <span className="rounded-lg border border-white/10 bg-white/[0.05] px-3 py-1.5 text-neutral-300">
          <span className="font-semibold text-white">{plan.company}</span>
          <span className="mx-1.5 text-neutral-500">·</span>
          {plan.industry}
        </span>
      </div>

      {/* ── Best Recommendation ── */}
      <div
        ref={bestRef}
        className="rounded-xl border border-amber-400/35 bg-amber-400/[0.06] p-5 space-y-3"
      >
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-400/20 border border-amber-400/30">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" aria-hidden />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-widest text-amber-400">
            Best Recommendation
          </span>
        </div>

        <p className="text-base font-bold text-white">{plan.bestRecommendation.source}</p>
        <p className="text-sm text-neutral-300 leading-relaxed">{plan.bestRecommendation.reason}</p>

        <div className="flex items-start gap-2.5 rounded-lg bg-white/[0.05] border border-white/[0.07] px-3 py-2.5">
          <ArrowRight className="h-4 w-4 text-amber-300 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-neutral-200 leading-relaxed">
            <span className="font-semibold text-amber-200">Next step: </span>
            {plan.bestRecommendation.nextStep}
          </p>
        </div>
      </div>

      {/* ── Government Grants ── */}
      <CategoryBlock
        icon={<Award className="h-4 w-4" />}
        label="Government Grants"
        iconColour="text-emerald-300"
        accent="border-emerald-500/20 hover:border-emerald-400/40"
        items={plan.grants}
        baseDelay={120}
      />

      {/* ── Angel Investors & VC ── */}
      <CategoryBlock
        icon={<Users className="h-4 w-4" />}
        label="Angel Investors & VC"
        iconColour="text-violet-300"
        accent="border-violet-500/20 hover:border-violet-400/40"
        items={plan.investors}
        baseDelay={260}
      />

      {/* ── Accelerators & Crowdfunding ── */}
      <CategoryBlock
        icon={<Rocket className="h-4 w-4" />}
        label="Accelerators & Crowdfunding"
        iconColour="text-blue-300"
        accent="border-blue-500/20 hover:border-blue-400/40"
        items={plan.accelerators}
        baseDelay={400}
      />

    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface InvestorFundingWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function InvestorFundingWidget({
  profile,
  onGenerateRef,
  hideGenerateButton = false,
}: InvestorFundingWidgetProps) {
  const { state, generate }         = useWidgetState();
  const [plan, setPlan]             = useState<InvestorFundingPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const handleGenerate = useCallback(async () => {
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchInvestorFunding(profile);
        setPlan(result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError("The agent returned a response that couldn't be parsed. Try regenerating.");
          throw new Error("Failed to parse investor funding JSON.");
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
      title="Investor & Funding Suggestion"
      onGenerate={handleGenerate}
      state={state}
      idleHint="Government grants, angel investors, VCs, accelerators and crowdfunding — matched to your stage and industry."
      idleButtonLabel="Find investors"
      regenerateLabel="Refresh suggestions"
      hideGenerateButton={hideGenerateButton}
    >
      {parseError ? (
        <p className="text-sm text-red-400">{parseError}</p>
      ) : plan ? (
        <InvestorFundingView plan={plan} />
      ) : null}
    </WidgetCard>
  );
}
