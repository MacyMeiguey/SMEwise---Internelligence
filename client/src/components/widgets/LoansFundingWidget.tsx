/**
 * LoansFundingWidget — Financial Planning Section
 * Calls the dedicated AWS Bedrock Agent (5I7B8BCVX0) which returns a
 * structured JSON loans & funding recommendation, then renders it with
 * animated entrance transitions.
 *
 * Sections rendered:
 *   - Government Schemes (cards with links)
 *   - Commercial Banks (cards with links)
 *   - Best Fit Recommendation (highlighted panel)
 *   - Requirements (checklist)
 *   - Timeline
 *
 * Requirements: 10.1–10.9
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type { BusinessProfile } from "../../types";
import { useWidgetState } from "../../hooks/useWidgetState";
import WidgetCard from "../WidgetCard";
import { API_BASE } from "../../lib/api";
import {
  Building2,
  Landmark,
  Star,
  ClipboardList,
  Clock,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GovernmentScheme {
  name: string;
  url: string;
}

interface CommercialBank {
  bank: string;
  url: string;
}

interface BestFit {
  scheme: string;
  reason: string;
  alternative: string;
}

interface LoansFundingPlan {
  company: string;
  industry: string;
  governmentSchemes: GovernmentScheme[];
  commercialBanks: CommercialBank[];
  bestFit: BestFit;
  requirements: string[];
  timeline: string;
}

// ─── API call ─────────────────────────────────────────────────────────────────

async function fetchLoansFunding(profile: BusinessProfile): Promise<LoansFundingPlan> {
  const payload = {
    companyName:   profile.companyName,
    industry:      profile.industry,
    businessStage: profile.businessStage,
    city:          profile.city,
    currentFunds:  profile.currentFunds,
    businessType:  profile.businessType,
  };

  const res = await fetch(`${API_BASE}/api/bedrock/loans-funding`, {
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

  return JSON.parse(jsonStr) as LoansFundingPlan;
}

// ─── Animation hook ───────────────────────────────────────────────────────────
// Triggers a CSS fade-up animation when the element enters the viewport.

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("loans-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function SectionHeading({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description?: string;
}) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="text-primary-300">{icon}</span>
        <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-400">
          {label}
        </h3>
      </div>
      {description && (
        <p className="text-xs text-neutral-500 mt-1 ml-6 leading-relaxed">{description}</p>
      )}
    </div>
  );
}

function SchemeCard({
  name,
  url,
  delay,
  badge,
}: {
  name: string;
  url: string;
  delay: number;
  badge?: string;
}) {
  const ref = useFadeIn();
  return (
    <div
      ref={ref}
      className="loans-fade-up rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-3.5 flex flex-col gap-2.5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-semibold text-neutral-200 leading-snug">{name}</span>
        {badge && (
          <span className="shrink-0 rounded-full border border-primary-500/30 bg-primary-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-300">
            {badge}
          </span>
        )}
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Visit ${name}`}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-400 hover:text-primary-200 transition-colors w-fit"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" aria-hidden />
        Apply / Learn more
      </a>
    </div>
  );
}

// ─── Main result renderer ─────────────────────────────────────────────────────

function LoansPlanView({ plan }: { plan: LoansFundingPlan }) {
  const bestFitRef  = useFadeIn();
  const reqRef      = useFadeIn();
  const timelineRef = useFadeIn();

  // Find the URL for the best fit scheme by matching against known schemes/banks
  const bestFitUrl = [
    ...plan.governmentSchemes.map(s => ({ name: s.name, url: s.url })),
    ...plan.commercialBanks.map(b => ({ name: b.bank, url: b.url })),
  ].find(item =>
    plan.bestFit.scheme.toLowerCase().includes(item.name.toLowerCase()) ||
    item.name.toLowerCase().includes(plan.bestFit.scheme.toLowerCase())
  )?.url;

  return (
    <div className="space-y-7">

      {/* ── Best Fit — shown first as the primary recommendation ── */}
      <section>
        <SectionHeading
          icon={<Star className="h-4 w-4" />}
          label="Best Fit Recommendation"
          description="The most suitable funding option based on your business profile."
        />
        <div
          ref={bestFitRef}
          className="loans-fade-up rounded-xl border border-amber-400/30 bg-amber-400/[0.05] p-4 space-y-3"
          style={{ animationDelay: "60ms" }}
        >
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-400/20 border border-amber-400/30">
              <Star className="h-4 w-4 text-amber-300" aria-hidden />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-bold text-amber-200">{plan.bestFit.scheme}</p>
                {bestFitUrl && (
                  <a
                    href={bestFitUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 hover:text-amber-100 transition-colors shrink-0"
                    aria-label={`Apply for ${plan.bestFit.scheme}`}
                  >
                    <ExternalLink className="h-3 w-3" aria-hidden />
                    Apply / Learn more
                  </a>
                )}
              </div>
              <p className="text-sm text-neutral-300 leading-relaxed">{plan.bestFit.reason}</p>
            </div>
          </div>
          <div className="rounded-lg border border-white/[0.07] bg-white/[0.04] px-3 py-2.5 flex items-start gap-2.5">
            <span className="shrink-0 rounded-full border border-neutral-600 bg-neutral-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400 mt-0.5">
              Alt
            </span>
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-0.5">Alternative Option</p>
              <p className="text-sm text-neutral-300">{plan.bestFit.alternative}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Government Schemes ── */}
      <section>
        <SectionHeading
          icon={<Landmark className="h-4 w-4" />}
          label="Government Schemes"
          description="Subsidised loans and grants from Malaysian government agencies — typically lower interest rates and more flexible eligibility."
        />
        <div className="grid sm:grid-cols-2 gap-2.5">
          {plan.governmentSchemes.map((s, i) => (
            <SchemeCard key={s.name} name={s.name} url={s.url} delay={i * 60} badge="Gov" />
          ))}
        </div>
      </section>

      {/* ── Commercial Banks ── */}
      <section>
        <SectionHeading
          icon={<Building2 className="h-4 w-4" />}
          label="Commercial Banks"
          description="SME loan products from licensed Malaysian banks — faster processing but typically require stronger financials."
        />
        <div className="grid sm:grid-cols-2 gap-2.5">
          {plan.commercialBanks.map((b, i) => (
            <SchemeCard
              key={b.bank}
              name={b.bank}
              url={b.url}
              delay={i * 60 + 120}
              badge="Bank"
            />
          ))}
        </div>
      </section>

      {/* ── Requirements ── */}
      <section>
        <SectionHeading
          icon={<ClipboardList className="h-4 w-4" />}
          label="Required Documents"
          description="Prepare these documents before applying to any scheme or bank."
        />
        <div
          ref={reqRef}
          className="loans-fade-up rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
          style={{ animationDelay: "300ms" }}
        >
          <ul className="space-y-2.5">
            {plan.requirements.map((req, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
                <span className="text-sm text-neutral-300 leading-relaxed">{req}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Timeline ── */}
      <section>
        <SectionHeading
          icon={<Clock className="h-4 w-4" />}
          label="Approval Timeline"
          description="Estimated time from application to fund disbursement."
        />
        <div
          ref={timelineRef}
          className="loans-fade-up rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] px-4 py-3.5 flex items-start gap-3"
          style={{ animationDelay: "360ms" }}
        >
          <Clock className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm text-neutral-300 leading-relaxed">{plan.timeline}</p>
        </div>
      </section>

    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

import { checkCache, writeCache, hashInputs } from '../../utils/widgetCache';

const CACHE_KEY = 'loans-funding';

interface LoansFundingWidgetProps {
  profile: BusinessProfile;
  onGenerateRef?: (fn: () => Promise<void>) => void;
  hideGenerateButton?: boolean;
}

export default function LoansFundingWidget({
  profile,
  onGenerateRef,
  hideGenerateButton = false,
}: LoansFundingWidgetProps) {
  const { state, generate, restoreSuccess } = useWidgetState();
  const [plan, setPlan]             = useState<LoansFundingPlan | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const cacheInputs = {
    companyName: profile.companyName,
    industry: profile.industry,
    businessStage: profile.businessStage,
    city: profile.city,
    businessType: profile.businessType,
    currentFunds: profile.currentFunds,
  };

  useEffect(() => {
    const cached = checkCache<LoansFundingPlan>(CACHE_KEY, cacheInputs);
    if (cached) {
      setPlan(cached.result);
      restoreSuccess();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = useCallback(async () => {
    const cached = checkCache<LoansFundingPlan>(CACHE_KEY, cacheInputs);
    if (cached) {
      setPlan(cached.result);
      setParseError(null);
      restoreSuccess();
      return;
    }
    setPlan(null);
    setParseError(null);

    await generate(async () => {
      try {
        const result = await fetchLoansFunding(profile);
        setPlan(result);
        writeCache(CACHE_KEY, hashInputs(cacheInputs), result);
      } catch (err) {
        if (err instanceof SyntaxError) {
          setParseError(
            "The agent returned a response that couldn't be parsed. Try regenerating.",
          );
          throw new Error("Failed to parse loans & funding JSON.");
        }
        throw err;
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, generate]);

  useEffect(() => {
    onGenerateRef?.(handleGenerate);
  }, [onGenerateRef, handleGenerate]);

  return (
    <>
      {/* Scoped keyframe — injected once, no extra dependency */}
      <style>{`
        .loans-fade-up {
          opacity: 0;
          transform: translateY(14px);
          transition: opacity 0.45s ease, transform 0.45s ease;
        }
        .loans-visible.loans-fade-up,
        .loans-visible .loans-fade-up {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

    <WidgetCard
      title="Loans & Funding Panel"
      onGenerate={handleGenerate}
      state={state}
        idleHint="Government schemes, commercial banks, best-fit recommendation, requirements and timeline — all in one place."
        idleButtonLabel="Map funding"
        regenerateLabel="Remap funding"
        hideGenerateButton={hideGenerateButton}
      >
        {parseError ? (
          <p className="text-sm text-red-400">{parseError}</p>
        ) : plan ? (
          <LoansPlanView plan={plan} />
        ) : null}
    </WidgetCard>
    </>
  );
}