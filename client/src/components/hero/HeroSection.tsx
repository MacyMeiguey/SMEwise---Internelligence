/**
 * HeroSection — high-conversion landing (Malaysian SME focus).
 * Emotional hook → proof pills → CTAs → journey → visuals → social proof bands.
 */

import Button from '../shared/Button';
import type { BusinessProfile } from '../../types';
import { LandingMediaGallery } from './LandingShowcase';
import AdvisorShowcase from './AdvisorShowcase';
import StatsStrip from './StatsStrip';
import TrustMarquee from './TrustMarquee';
import {
  ShopIcon,
  CoinStackIcon,
  BarChartIcon,
  BagIcon,
  MegaphoneIcon,
  CalculatorIcon,
  AdvisorIcon,
  type SMEIconKey,
} from './SMEIcons';
import type { FC } from 'react';
import {
  ArrowRight,
  Check,
  ChevronDown,
  MousePointer2,
  LayoutGrid,
  Repeat2,
  ListTodo,
  Store,
  type LucideIcon,
} from 'lucide-react';

interface IconBadgeProps { accent: string }

const PAIN_GAIN_ICONS: LucideIcon[] = [LayoutGrid, Repeat2, ListTodo];

/** Topic chips over the 3D stage — same icons as the workspace tabs (one accent family). */
const TOPIC_CHIPS: { key: SMEIconKey; label: string }[] = [
  { key: 'money', label: 'Money' },
  { key: 'customers', label: 'Customers' },
  { key: 'operations', label: 'Operations' },
  { key: 'marketing', label: 'Marketing' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'reports', label: 'Reports' },
];

const CHIP_ACCENT = '#c4b5fd';

const SME_ICON_MAP: Record<SMEIconKey, FC<IconBadgeProps>> = {
  money:      ({ accent }) => <CoinStackIcon  accent={accent} size="md" />,
  advisor:    ({ accent }) => <AdvisorIcon    accent={accent} size="md" />,
  operations: ({ accent }) => <ShopIcon       accent={accent} size="md" />,
  pricing:    ({ accent }) => <CalculatorIcon accent={accent} size="md" />,
  marketing:  ({ accent }) => <MegaphoneIcon  accent={accent} size="md" />,
  reports:    ({ accent }) => <BarChartIcon   accent={accent} size="md" />,
  customers:  ({ accent }) => <BagIcon        accent={accent} size="md" />,
};

export interface HeroSectionProps {
  onGetStarted: () => void;
  profile?: BusinessProfile | null;
  onGoToWorkspace?: () => void;
}

const TRUTH_PILLS = [
  'RM & Malaysian context',
  '~3 minute setup',
  'No payment step',
  'Edit profile anytime',
] as const;

const PAIN_GAIN = [
  {
    pain: 'Juggling spreadsheets, WhatsApp, and half-finished drafts',
    gain: 'One profile powers every planner, doc, and the advisor beside you.',
  },
  {
    pain: 'Re-typing the same business story into every AI tool',
    gain: 'Tell SMEwise once — generators and chat stay aligned.',
  },
  {
    pain: 'Not sure what to tackle next week',
    gain: 'Clear topic tabs: Ops, Money, Pricing, Growth, Reports.',
  },
] as const;

export default function HeroSection({ onGetStarted, profile, onGoToWorkspace }: HeroSectionProps) {
  function scrollToAdvisor() {
    document.getElementById('meet-advisor')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToWorkspacePreview() {
    document.getElementById('landing-see-it')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <div className="bg-transparent text-white">
      {/* ─── HERO — content sits over the global LandingStage3D canvas ─────── */}
      <section id="landing-hero" className="relative overflow-hidden text-white min-h-[88vh] lg:min-h-[96vh] flex items-center">
        {/* Soft vignette so heading stays legible regardless of scene state */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 50% 58%, rgba(10,10,10,0.0) 0%, rgba(10,10,10,0.2) 55%, rgba(10,10,10,0.45) 100%)',
          }}
        />

        {/* Content layer */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24 sm:py-28 text-center motion-safe:animate-fade-up">
          <div className="flex justify-center mb-8">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-black/45 backdrop-blur-md px-4 py-1.5 text-xs sm:text-sm font-medium text-neutral-200 shadow-panel">
              <Store className="h-3.5 w-3.5 text-primary-300 shrink-0" aria-hidden />
              Malaysian SME workspace · Advisor + planners
            </span>
          </div>

          <h1 className="text-[clamp(2.75rem,8vw,6.5rem)] font-extrabold leading-[0.98] tracking-[-0.04em] text-balance">
            <span className="block text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.55)]">
              Plans, paperwork &amp;
            </span>
            <span className="block mt-2 text-primary-100">
              one calm workspace.
            </span>
          </h1>

          <p className="mt-7 text-base sm:text-xl text-neutral-300 max-w-2xl mx-auto leading-relaxed">
            Tell SMEwise about your business <strong className="text-white font-semibold">once</strong>. Get fund ideas,
            pricing drafts, ops checklists &mdash; and chat with an advisor that already knows{' '}
            <strong className="text-primary-200 font-semibold">your street, your RM, your stage.</strong>
          </p>

          <ul
            className="mt-8 flex flex-wrap justify-center gap-2"
            aria-label="Product highlights"
          >
            {TRUTH_PILLS.map((t) => (
              <li
                key={t}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/40 backdrop-blur px-3.5 py-1.5 text-xs sm:text-sm font-semibold text-neutral-200"
              >
                <Check className="h-4 w-4 text-primary-300 shrink-0" aria-hidden />
                {t}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-col sm:flex-row flex-wrap justify-center gap-4 sm:items-center">
            {profile ? (
              <>
                <Button
                  size="lg"
                  className="!py-3.5 !px-8 text-base !bg-white !text-neutral-950 hover:!bg-primary-100 !shadow-panel"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  onClick={onGoToWorkspace}
                >
                  Go to workspace
                </Button>
                <button
                  type="button"
                  onClick={onGetStarted}
                  className="text-base font-semibold text-primary-200 hover:text-white underline underline-offset-4 decoration-primary-400"
                >
                  Update my profile
                </button>
              </>
            ) : (
              <>
                <Button
                  size="lg"
                  className="!py-3.5 !px-8 text-base !bg-primary-600 hover:!bg-primary-500 !text-white !shadow-panel"
                  rightIcon={<ArrowRight className="w-5 h-5" />}
                  onClick={onGetStarted}
                >
                  Start free · ~3 minutes
                </Button>
                <button
                  type="button"
                  onClick={scrollToAdvisor}
                  className="inline-flex items-center justify-center gap-1.5 text-base font-semibold text-neutral-200 hover:text-white px-4 py-2 rounded-xl border border-white/[0.1] bg-white/[0.04] hover:bg-white/[0.07] backdrop-blur-md shadow-panel transition-colors"
                >
                  See how it looks <ChevronDown className="w-5 h-5" aria-hidden />
                </button>
              </>
            )}
          </div>

          {/* Topic legend strip — explains the drifting shards */}
          <div className="mt-12 flex flex-wrap justify-center gap-2">
            {TOPIC_CHIPS.map(({ key, label }) => {
              const Icon = SME_ICON_MAP[key];
              return (
                <span
                  key={key}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-black/40 backdrop-blur-md px-2.5 py-1.5 text-[11px] font-medium text-neutral-200 shadow-panel"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-md border border-white/[0.08] bg-white/[0.04] [&_svg]:max-h-[22px] [&_svg]:max-w-[22px]">
                    <Icon accent={CHIP_ACCENT} />
                  </span>
                  {label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Scroll cue */}
        {!profile && (
          <button
            type="button"
            onClick={scrollToAdvisor}
            className="hidden sm:flex absolute bottom-6 left-1/2 -translate-x-1/2 z-10 items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-300 hover:text-white motion-safe:animate-fade-up motion-safe:[animation-delay:600ms] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 rounded-md px-2 py-1"
            style={{ animationFillMode: 'backwards' }}
          >
            <MousePointer2 className="h-3.5 w-3.5 motion-safe:animate-bounce" aria-hidden />
            Scroll to orbit the scene
          </button>
        )}
      </section>

      <StatsStrip />
      <TrustMarquee />
      <AdvisorShowcase onTryAdvisor={profile ? onGoToWorkspace : onGetStarted} />

      {!profile && (
        <section id="landing-pain-gain" className="relative border-b border-white/[0.08] bg-[#07070b]/40 backdrop-blur-xl text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
            <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-300/90 mb-3">Designed for busy owners</p>
              <h2 className="text-3xl sm:text-[2rem] font-bold tracking-tight text-white">
                Fewer tabs. Fewer repeats.{' '}
                <span className="text-primary-200">Forward motion.</span>
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
              {PAIN_GAIN.map(({ pain, gain }, i) => {
                const Icon = PAIN_GAIN_ICONS[i];
                return (
                  <div
                    key={i}
                    className="relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md p-6 flex flex-col gap-4 shadow-panel hover:shadow-panel-hover hover:border-white/[0.12] transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid place-items-center h-11 w-11 rounded-xl border border-white/[0.1] bg-primary-500/15 text-primary-200">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
                        Without SMEwise
                      </span>
                    </div>
                    <p className="text-base font-medium text-neutral-300 leading-snug">{pain}</p>
                    <div className="h-px w-full bg-white/[0.08]" aria-hidden />
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-primary-300">
                      With SMEwise
                    </p>
                    <p className="text-base font-medium text-white leading-snug">{gain}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <LandingMediaGallery />

      <section id="landing-features" className="relative border-b border-white/[0.08] bg-[#07070b]/45 backdrop-blur-xl text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl mx-auto text-center mb-12 lg:mb-14">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-300/90 mb-3">What you unlock</p>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              Tools grouped the way{' '}
              <span className="text-primary-200">owners actually think</span>
            </h2>
            <p className="mt-4 text-neutral-400 text-base sm:text-lg leading-relaxed">
              Structured areas for Malaysian context: RM, local platforms, registrations, grants, growth.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 lg:gap-6">
            {FEATURES.map((f, idx) => {
              const Icon = SME_ICON_MAP[f.icon];
              const cols =
                idx === 0 ? 'lg:col-span-2 lg:flex lg:flex-row lg:items-center lg:gap-10 lg:p-10' : '';
              const lastFull = idx === FEATURES.length - 1 ? 'lg:col-span-3 lg:text-center lg:justify-center lg:items-center lg:flex lg:flex-col' : '';
              return (
                <div
                  key={f.title}
                  className={`
                    group relative rounded-2xl border border-white/[0.08] p-6 sm:p-7 flex flex-col
                    bg-white/[0.03] backdrop-blur-md shadow-panel hover:shadow-panel-hover hover:border-white/[0.12]
                    transition-all duration-300 text-white overflow-hidden
                    ${cols} ${lastFull}
                  `}
                >
                  <div className="relative shrink-0 mb-5 lg:mb-0">
                    <div className="grid place-items-center h-20 w-20 rounded-2xl border border-white/[0.1] bg-black/25 [&_svg]:max-h-[52px] [&_svg]:max-w-[52px]">
                      <Icon accent={f.accent} />
                    </div>
                  </div>

                  <div className={`relative min-w-0 ${idx === 0 ? 'lg:ml-6' : ''} ${idx === 5 ? 'max-w-2xl' : ''}`}>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-400/25 bg-primary-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary-200">
                      {f.tag}
                    </span>
                    <h3 className={`text-xl lg:text-2xl font-semibold leading-snug mt-3 text-white ${idx === 5 ? 'lg:text-center' : ''}`}>
                      {f.title}
                    </h3>
                    <p className={`mt-3 text-sm sm:text-base leading-relaxed text-neutral-400 ${idx === 0 ? 'max-w-xl' : ''} ${idx === 5 ? 'lg:mx-auto' : ''}`}>
                      {f.body}
                    </p>
                    {idx === 0 && !profile && (
                      <button
                        type="button"
                        onClick={onGetStarted}
                        className="mt-8 inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-500 px-6 py-3 text-sm font-semibold text-white border border-white/[0.1] shadow-panel transition-colors lg:self-start"
                      >
                        Unlock these tools · free <ArrowRight className="w-4 h-4" aria-hidden />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="landing-cta" className="relative overflow-hidden border-t border-white/[0.08] bg-[#07070b]/45 backdrop-blur-xl text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(124,58,237,0.2),transparent_65%)]" aria-hidden />

        <span aria-hidden className="pointer-events-none absolute top-8 left-4 sm:left-12 opacity-35 text-primary-300 motion-safe:animate-hero-float" style={{ animationDelay: '0s' }}>
          <CoinStackIcon  accent="#fbbf24" size="md" />
        </span>
        <span aria-hidden className="pointer-events-none absolute top-12 right-6 sm:right-16 opacity-35 text-primary-300 motion-safe:animate-hero-float" style={{ animationDelay: '0.7s' }}>
          <MegaphoneIcon  accent="#c4b5fd" size="md" />
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-10 left-10 sm:left-24 opacity-35 text-primary-300 motion-safe:animate-hero-float" style={{ animationDelay: '1.4s' }}>
          <BagIcon        accent="#a78bfa" size="md" />
        </span>
        <span aria-hidden className="pointer-events-none absolute bottom-12 right-8 sm:right-28 opacity-35 text-primary-300 motion-safe:animate-hero-float" style={{ animationDelay: '2.1s' }}>
          <BarChartIcon   accent="#c4b5fd" size="md" />
        </span>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-24 lg:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/40 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-neutral-300 mb-8 shadow-panel">
            No credit card · No lock-in · Your data stays yours
          </div>
          <h2 className="text-[clamp(1.875rem,5vw,3.25rem)] font-bold tracking-tight leading-tight max-w-4xl mx-auto text-white">
            Tomorrow morning,{' '}
            <span className="text-primary-200">know what to open first.</span>
          </h2>
          <p className="mt-6 text-neutral-400 text-lg max-w-xl mx-auto leading-relaxed">
            Take three minutes tonight. Wake up with a workspace that remembers your story.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {profile ? (
              <button type="button" onClick={onGoToWorkspace} className="btn-brand px-10 py-3.5 text-base gap-2">
                Enter workspace <ArrowRight className="w-5 h-5" aria-hidden />
              </button>
            ) : (
              <>
                <button type="button" onClick={onGetStarted} className="px-10 py-3.5 text-base gap-2 border border-white/[0.12] inline-flex items-center justify-center rounded-xl transition-colors hover:bg-primary-500 bg-primary-600 text-white font-semibold shadow-panel focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07070b]">
                  Create my workspace free <ArrowRight className="w-5 h-5" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={scrollToWorkspacePreview}
                  className="inline-flex items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-6 py-3.5 text-base font-semibold text-white hover:bg-white/[0.08] backdrop-blur-md shadow-panel focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950"
                >
                  Preview workspace
                </button>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

interface FeatureSpec {
  tag: string;
  title: string;
  body: string;
  icon: SMEIconKey;
  accent: string;
}

const FEATURES: readonly FeatureSpec[] = [
  {
    tag: 'Money & runway',
    title: 'Funds, forecasts, grants & loans',
    body:
      'Allocate capital in RM, model revenue bands, surface funding angles that fit Malaysian programmes — in plain language.',
    icon: 'money',
    accent: '#fbbf24',
  },
  {
    tag: 'Always-on advisor',
    title: 'A business chat that remembers you',
    body:
      'Ask for next steps without pasting context again — it respects your sector, funds, audience, and the tab you are in.',
    icon: 'advisor',
    accent: '#c4b5fd',
  },
  {
    tag: 'Operations',
    title: 'Registration paths & premise thinking',
    body: 'SSM-aligned checklist thinking, locality notes, operational risk reminders — anchored to where you operate.',
    icon: 'operations',
    accent: '#a78bfa',
  },
  {
    tag: 'Pricing',
    title: 'Smarter shelves & positioning',
    body: 'Benchmark-style angles on price, wording for listings, visuals that lift confidence without hiring a designer first.',
    icon: 'pricing',
    accent: '#c4b5fd',
  },
  {
    tag: 'Marketing',
    title: 'Plan + creative in one sprint',
    body: 'Audience-first roadmap and tangible assets — built for SMEs who live on TikTok Shop, Lazada & WhatsApp.',
    icon: 'marketing',
    accent: '#a78bfa',
  },
  {
    tag: 'Reports',
    title: 'Documents you can hand to a bank',
    body: 'Export-friendly outlines and dashboard phrasing — a starting brief you can refine with your accountant.',
    icon: 'reports',
    accent: '#8b5cf6',
  },
];
