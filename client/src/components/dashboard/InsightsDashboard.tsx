/**
 * InsightsDashboard — Bento grid overview
 * Brand: black ink + lavender accent
 */

import type { BusinessProfile } from '../../types';
import { ArrowRight } from 'lucide-react';

export interface InsightsDashboardProps {
  profile: BusinessProfile;
  onViewDetails: (section: string) => void;
}

const SECTIONS = [
  {
    key: 'operations',
    title: 'Operations',
    plain: 'Setup & day-to-day',
    cta: 'Open setup tools',
    icon: '⚙',
    getBullet: (p: BusinessProfile) => `Based in ${p.city} — registration, premises, risk check.`,
  },
  {
    key: 'financial',
    title: 'Financial Planning',
    plain: 'Money & funding',
    cta: 'Open money tools',
    icon: '₿',
    getBullet: (p: BusinessProfile) =>
      `RM ${p.currentFunds.toLocaleString('en-MY')} available${p.mainGoal ? ` · Goal: ${p.mainGoal}` : ''}.`,
  },
  {
    key: 'pricing',
    title: 'Pricing Strategy',
    plain: 'Prices & products',
    cta: 'Open pricing tools',
    icon: '◈',
    getBullet: (p: BusinessProfile) => `${p.industry} — competitor scan, smart price, product visual.`,
  },
  {
    key: 'marketing',
    title: 'Marketing',
    plain: 'Customers & promotion',
    cta: 'Open marketing tools',
    icon: '◎',
    getBullet: (p: BusinessProfile) => `Audience: ${p.targetCustomer}.`,
  },
  {
    key: 'owner',
    title: 'Owner Tools',
    plain: 'Reports & exports',
    cta: 'Open reports',
    icon: '□',
    getBullet: (_p: BusinessProfile) => 'Documents, analytics framing, and inline chat.',
  },
] as const;

export default function InsightsDashboard({ profile, onViewDetails }: InsightsDashboardProps) {
  const fundsLabel = `RM ${profile.currentFunds.toLocaleString('en-MY')}`;

  return (
    <section id="workspace-summary" className="border-b-2 border-neutral-950 scroll-mt-20">

      {/* ── Top summary band ── */}
      <div className="bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary-300 mb-2">Your summary</p>
              <h2 className="text-2xl sm:text-3xl font-bold leading-tight">{profile.companyName}</h2>
              <p className="mt-2 text-neutral-400 text-sm sm:text-base">
                {profile.industry} · {profile.city} · {profile.businessStage} · {profile.businessType}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Available capital</p>
              <p className="text-4xl sm:text-5xl font-bold tabular-nums text-white">{fundsLabel}</p>
            </div>
          </div>

          {/* goal + audience pills */}
          <div className="mt-6 flex flex-wrap gap-2">
            {profile.mainGoal?.trim() && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                <span className="text-primary-400">Goal</span>
                {profile.mainGoal}
              </span>
            )}
            {profile.targetCustomer?.trim() && (
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-neutral-800 text-xs text-neutral-300 border border-neutral-700">
                <span className="text-primary-400">Audience</span>
                {profile.targetCustomer}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Bento grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="flex items-baseline justify-between gap-4 mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-neutral-950">What do you want to work on?</h3>
          <p className="text-sm text-neutral-500 hidden sm:block">Tap any card to jump to that toolkit</p>
        </div>

        {/* Bento: 12-col responsive grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-4 sm:gap-5">

          {/* ── Card 1 — Featured (wide): Financial ── */}
          <BentoCard
            className="xl:col-span-5 xl:row-span-2"
            featured
            icon={SECTIONS[1].icon}
            plain={SECTIONS[1].plain}
            title={SECTIONS[1].title}
            bullet={SECTIONS[1].getBullet(profile)}
            cta={SECTIONS[1].cta}
            onOpen={() => onViewDetails(SECTIONS[1].title)}
            stat={fundsLabel}
            statLabel="available"
          />

          {/* ── Card 2 — Operations ── */}
          <BentoCard
            className="xl:col-span-4"
            icon={SECTIONS[0].icon}
            plain={SECTIONS[0].plain}
            title={SECTIONS[0].title}
            bullet={SECTIONS[0].getBullet(profile)}
            cta={SECTIONS[0].cta}
            onOpen={() => onViewDetails(SECTIONS[0].title)}
          />

          {/* ── Card 3 — Marketing ── */}
          <BentoCard
            className="xl:col-span-3"
            icon={SECTIONS[3].icon}
            plain={SECTIONS[3].plain}
            title={SECTIONS[3].title}
            bullet={SECTIONS[3].getBullet(profile)}
            cta={SECTIONS[3].cta}
            onOpen={() => onViewDetails(SECTIONS[3].title)}
          />

          {/* ── Card 4 — Pricing ── */}
          <BentoCard
            className="xl:col-span-4"
            icon={SECTIONS[2].icon}
            plain={SECTIONS[2].plain}
            title={SECTIONS[2].title}
            bullet={SECTIONS[2].getBullet(profile)}
            cta={SECTIONS[2].cta}
            onOpen={() => onViewDetails(SECTIONS[2].title)}
          />

          {/* ── Card 5 — Owner Tools ── */}
          <BentoCard
            className="xl:col-span-3"
            icon={SECTIONS[4].icon}
            plain={SECTIONS[4].plain}
            title={SECTIONS[4].title}
            bullet={SECTIONS[4].getBullet(profile)}
            cta={SECTIONS[4].cta}
            onOpen={() => onViewDetails(SECTIONS[4].title)}
          />
        </div>

        {/* ── Bottom note ── */}
        <p className="mt-6 text-xs text-neutral-500 text-center">
          Nothing here is auto-generated — this is your profile data. Use <strong className="text-neutral-700">AI generators</strong> below for drafts and analyses.
        </p>
      </div>
    </section>
  );
}

// ── Bento Card ──────────────────────────────────────────────────────────────

interface BentoCardProps {
  className?: string;
  featured?: boolean;
  icon: string;
  plain: string;
  title: string;
  bullet: string;
  cta: string;
  onOpen: () => void;
  stat?: string;
  statLabel?: string;
}

function BentoCard({
  className = '',
  featured = false,
  icon,
  plain,
  title,
  bullet,
  cta,
  onOpen,
  stat,
  statLabel,
}: BentoCardProps) {
  return (
    <div
      className={`
        group relative flex flex-col
        border-2 border-neutral-950 rounded-2xl overflow-hidden
        cursor-pointer
        transition-all duration-200
        hover:shadow-hard hover:-translate-y-[2px]
        ${featured ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-950'}
        ${className}
      `}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen()}
      aria-label={`Open ${title}`}
    >
      {/* icon corner */}
      <div className={`absolute top-4 right-4 text-2xl select-none ${featured ? 'opacity-30' : 'opacity-20'}`} aria-hidden>
        {icon}
      </div>

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        {/* eyebrow */}
        <p className={`text-2xs font-semibold uppercase tracking-widest mb-3 ${featured ? 'text-primary-300' : 'text-primary-600'}`}>
          {plain}
        </p>

        {/* title */}
        <h4 className={`text-lg sm:text-xl font-bold leading-tight ${featured ? 'text-white' : 'text-neutral-950'}`}>
          {title}
        </h4>

        {/* stat (featured only) */}
        {featured && stat && (
          <div className="mt-4 mb-2">
            <p className="text-4xl sm:text-5xl font-bold tabular-nums text-white">{stat}</p>
            {statLabel && <p className="text-sm text-neutral-400 mt-1">{statLabel}</p>}
          </div>
        )}

        {/* bullet */}
        <p className={`mt-3 text-sm leading-relaxed flex-1 ${featured ? 'text-neutral-400' : 'text-neutral-600'}`}>
          {bullet}
        </p>

        {/* CTA */}
        <div className={`mt-5 flex items-center gap-1.5 text-sm font-semibold ${featured ? 'text-primary-300' : 'text-primary-700'} group-hover:gap-2.5 transition-all`}>
          {cta}
          <ArrowRight className="w-4 h-4 shrink-0" aria-hidden />
        </div>
      </div>
    </div>
  );
}
