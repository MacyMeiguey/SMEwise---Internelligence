/**
 * InsightsDashboard — premium dark SaaS overview for the Workspace.
 *
 * Layout (top → bottom):
 *   1. Hero band — eyebrow + welcome + live status + 4 KPI tiles with sparklines.
 *   2. Quick actions strip — Open advisor · Generate plan · Edit profile · Export.
 *   3. Topic toolkits bento — five colourful cards (money / ops / pricing /
 *      marketing / reports) each with an SME illustration and quick stat.
 *   4. Profile readiness matrix — every field of the BusinessProfile listed
 *      with check / value so the owner sees exactly what powers everything.
 *
 * Design references: Elstate Property dashboard, Metrica Finance,
 * Adaline AI control plane, Aetheris Finance — dark, glassy, accent-rich.
 */

import type { BusinessProfile } from '../../types';
import type { FC } from 'react';
import {
  ArrowRight,
  Wallet,
  Target,
  Users,
  MapPin,
  MessageSquare,
  Sparkles,
  Pencil,
  Download,
  Check,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';
import {
  CoinStackIcon,
  ShopIcon,
  CalculatorIcon,
  MegaphoneIcon,
  BarChartIcon,
  type SMEIconKey,
} from '../hero/SMEIcons';

export interface InsightsDashboardProps {
  profile: BusinessProfile;
  onViewDetails: (section: string) => void;
  onEditProfile?: () => void;
  onOpenAdvisor?: () => void;
}

/* ── Sparkline helper (inline tiny chart) ──────────────────────────────────── */
function Sparkline({ points, color }: { points: number[]; color: string }) {
  const w = 100;
  const h = 28;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = w / (points.length - 1);
  const id = `sl-${color.replace('#', '')}`;
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  const lastX = w;
  const lastY = h - ((points[points.length - 1] - min) / range) * h;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="overflow-visible w-full h-7" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#${id})`} />
      <path d={path} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
      <circle cx={lastX} cy={lastY} r="5.5" fill={color} fillOpacity="0.25" />
    </svg>
  );
}

/* ── KPI tile ──────────────────────────────────────────────────────────────── */
interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  accent: string;
  spark?: number[];
  trend?: { delta: string; positive: boolean };
  dim?: boolean;
  big?: boolean;
}

function KpiTile({ icon: Icon, label, value, hint, accent, spark, trend, dim, big }: KpiTileProps) {
  const { effective } = useTheme();
  return (
    <div
      className={`
        relative rounded-2xl border border-neutral-200/90 bg-white/90 backdrop-blur-xl
        shadow-sm hover:shadow-md
        dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-panel dark:hover:shadow-panel-hover
        p-5 sm:p-6 flex flex-col gap-3 overflow-hidden
        transition-shadow duration-300
        ${big ? 'ring-1 ring-neutral-200/80 dark:ring-white/[0.07]' : ''}
      `}
    >
      {/* Glow only on the featured (big) tile */}
      {big && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl opacity-25"
          style={{ backgroundColor: accent }}
        />
      )}

      <div className="relative flex min-w-0 items-center justify-between gap-2">
        <span
          className="grid shrink-0 place-items-center h-9 w-9 rounded-lg border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]"
          style={{ color: accent }}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden />
        </span>
        {trend && (
          <span
            className="inline-flex min-w-0 max-w-[58%] items-center gap-1 truncate rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums"
            style={{
              color: trend.positive ? '#34d399' : '#fb7185',
              borderColor: trend.positive ? '#34d39940' : '#fb718540',
              backgroundColor: trend.positive ? '#34d39910' : '#fb718510',
            }}
            title={`${trend.positive ? '▲' : '▼'} ${trend.delta}`}
          >
            {trend.positive ? '▲' : '▼'} {trend.delta}
          </span>
        )}
      </div>

      <div className="relative text-[10px] font-bold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </div>

      <p
        className={`relative font-bold tabular-nums leading-[1.08] truncate
          ${big ? 'text-3xl sm:text-4xl' : 'text-xl sm:text-2xl'}
          ${
            dim
              ? 'text-neutral-500 dark:text-neutral-600'
              : big
                ? 'text-neutral-900 dark:text-white'
                : 'text-neutral-800 dark:text-neutral-100'
          }`}
        style={
          big && !dim
            ? {
                backgroundImage: `linear-gradient(135deg, ${
                  effective === 'dark' ? '#ffffff' : '#0a0a0a'
                } 0%, ${accent} 90%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }
            : undefined
        }
        title={value}
      >
        {value}
      </p>

      {hint && (
        <p className="relative text-[11px] text-neutral-500 leading-snug" title={hint}>
          {hint}
        </p>
      )}

      {spark && <Sparkline points={spark} color={accent} />}
    </div>
  );
}

/* ── Quick action tile ─────────────────────────────────────────────────────── */
interface QuickActionProps {
  icon: LucideIcon;
  label: string;
  hint: string;
  accent: string;
  onClick: () => void;
}

function QuickAction({ icon: Icon, label, hint, accent, onClick }: QuickActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative rounded-2xl border border-neutral-200/90 bg-white/90 backdrop-blur-xl shadow-sm hover:shadow-md dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-panel dark:hover:shadow-panel-hover p-4 text-left overflow-hidden transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#07070b]"
    >
      <span
        className="inline-flex shrink-0 items-center justify-center h-10 w-10 rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/10 dark:bg-white/[0.06]"
        style={{ color: accent }}
      >
        <Icon className="h-5 w-5 shrink-0" aria-hidden />
      </span>
      <p className="mt-3 text-sm font-semibold text-neutral-900 dark:text-white">{label}</p>
      <p className="mt-0.5 text-[11px] text-neutral-500 leading-snug">{hint}</p>
      <ArrowRight
        aria-hidden
        className="absolute bottom-3 right-3 h-4 w-4 text-neutral-400 group-hover:text-neutral-700 dark:text-neutral-600 dark:group-hover:text-neutral-300 group-hover:translate-x-0.5 transition-all duration-200"
      />
    </button>
  );
}

/* ── Topic toolkit card ────────────────────────────────────────────────────── */
interface ToolkitCardProps {
  Icon: FC<{ accent: string; size?: 'md' | 'lg' }>;
  title: string;
  plain: string;
  accent: string;
  stat: { label: string; value: string };
  hint: string;
  ctaLabel: string;
  onOpen: () => void;
  span?: string;
}

function ToolkitCard({ Icon, title, plain, accent, stat, hint, ctaLabel, onOpen, span = '' }: ToolkitCardProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${title}`}
      className={`group relative rounded-2xl border border-neutral-200/90 bg-white/90 backdrop-blur-xl shadow-sm hover:shadow-md dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-panel dark:hover:shadow-panel-hover p-6 text-left overflow-hidden flex flex-col gap-4 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#07070b] ${span}`}
    >
      {/* Subtle top-edge accent tint — gives identity without neon overload */}
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl"
        style={{ backgroundColor: accent, opacity: 0.6 }}
      />

      <div className="relative flex min-w-0 items-start justify-between gap-3">
        {/*
          SMEIcons md = 64×45px; use a 64×64 frame (was 56×56) to avoid overflow.
        */}
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 dark:border-white/[0.08] dark:bg-white/[0.06]">
          <Icon accent={accent} size="md" />
        </div>
        <span
          className="shrink-0 max-w-[45%] truncate text-right text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-md sm:max-w-none sm:whitespace-normal sm:text-left"
          style={{ backgroundColor: `${accent}18`, color: accent }}
          title={plain}
        >
          {plain}
        </span>
      </div>

      <div className="relative">
        <h4 className="text-base font-semibold text-neutral-900 leading-tight dark:text-white">{title}</h4>
        <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed line-clamp-2 dark:text-neutral-400">{hint}</p>
      </div>

      <div className="relative mt-auto flex min-w-0 items-end justify-between gap-2 border-t border-neutral-200 pt-3 dark:border-white/[0.06]">
        <div className="min-w-0 flex-1 pr-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500">
            {stat.label}
          </p>
          <p className="truncate text-sm font-semibold text-neutral-800 dark:text-neutral-200" title={stat.value}>
            {stat.value}
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-neutral-500 transition-all duration-200 group-hover:gap-1.5 group-hover:text-neutral-900 dark:text-neutral-400 dark:group-hover:text-white">
          <span className="max-w-[7.5rem] truncate sm:max-w-[10rem]">{ctaLabel}</span>{' '}
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </span>
      </div>
    </button>
  );
}

/* ── Profile readiness row ─────────────────────────────────────────────────── */
function ReadinessRow({
  label,
  value,
  isOk,
}: {
  label: string;
  value: string;
  isOk: boolean;
}) {
  return (
    <li className="flex min-w-0 items-center gap-3 py-3 border-b border-neutral-200/80 dark:border-white/5 last:border-b-0">
      <span
        className={`grid shrink-0 place-items-center h-7 w-7 rounded-full border ${
          isOk
            ? 'bg-accent-mint/15 border-accent-mint/40 text-accent-mint'
            : 'bg-accent-coral/15 border-accent-coral/40 text-accent-coral'
        }`}
        aria-hidden
      >
        {isOk ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
      </span>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-neutral-500 shrink-0">
          {label}
        </span>
        <span
          className={`text-sm truncate text-right ${
            isOk ? 'text-neutral-900 font-semibold dark:text-white' : 'text-neutral-500 italic'
          }`}
          title={value}
        >
          {isOk ? value : '— not set'}
        </span>
      </div>
    </li>
  );
}

/* ── Topic toolkit catalogue ───────────────────────────────────────────────── */
interface ToolkitSpec {
  key: SMEIconKey;
  title: string;
  plain: string;
  section: string;
  accent: string;
  Icon: FC<{ accent: string; size?: 'md' | 'lg' }>;
  ctaLabel: string;
}

const TOOLKITS: ToolkitSpec[] = [
  { key: 'money',      title: 'Money & Funding',  plain: 'Money',     section: 'Financial Planning', accent: '#fbbf24', Icon: CoinStackIcon, ctaLabel: 'Open money tools' },
  { key: 'operations', title: 'Operations',       plain: 'Ops',       section: 'Operations',         accent: '#34d399', Icon: ShopIcon,      ctaLabel: 'Open ops tools' },
  { key: 'pricing',    title: 'Pricing Strategy', plain: 'Pricing',   section: 'Pricing Strategy',   accent: '#fb7185', Icon: CalculatorIcon,ctaLabel: 'Open pricing' },
  { key: 'marketing',  title: 'Marketing',        plain: 'Marketing', section: 'Marketing',          accent: '#38bdf8', Icon: MegaphoneIcon, ctaLabel: 'Open marketing' },
  { key: 'reports',    title: 'Owner Reports',    plain: 'Reports',   section: 'Owner Tools',        accent: '#2dd4bf', Icon: BarChartIcon,  ctaLabel: 'Open reports' },
];

/* ── Root component ───────────────────────────────────────────────────────── */
export default function InsightsDashboard({
  profile,
  onViewDetails,
  onEditProfile,
  onOpenAdvisor,
}: InsightsDashboardProps) {
  const fundsLabel = `RM ${profile.currentFunds.toLocaleString('en-MY')}`;
  const hasGoal = !!profile.mainGoal?.trim();
  const hasCustomer = !!profile.targetCustomer?.trim();

  /* Profile readiness — % of meaningful fields filled in */
  const checks: Array<{ label: string; value: string; ok: boolean }> = [
    { label: 'Company',  value: profile.companyName,  ok: !!profile.companyName },
    { label: 'Industry', value: profile.industry,     ok: !!profile.industry },
    { label: 'City',     value: profile.city,         ok: !!profile.city },
    { label: 'Stage',    value: profile.businessStage,ok: !!profile.businessStage },
    { label: 'Type',     value: profile.businessType, ok: !!profile.businessType },
    { label: 'Capital',  value: fundsLabel,           ok: profile.currentFunds > 0 },
    { label: 'Goal',     value: profile.mainGoal,     ok: hasGoal },
    { label: 'Customer', value: profile.targetCustomer, ok: hasCustomer },
  ];
  const readyCount = checks.filter((c) => c.ok).length;
  const readiness = Math.round((readyCount / checks.length) * 100);

  /* Visual-only sparkline data — illustrative trends keyed to the KPI */
  const sparkCapital   = [22, 24, 23, 26, 30, 33, 31, 36, 40, 44];
  const sparkReadiness = [40, 48, 52, 58, 65, 70, 74, 80, 86, readiness];

  return (
    <section
      id="workspace-overview"
      aria-label="Workspace overview"
      className="relative bg-neutral-50 text-neutral-950 overflow-hidden min-h-[80vh] dark:bg-[#07070b] dark:text-white"
    >
      {/* Atmospherics — soft mesh (finance dashboard aesthetic) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50 dark:opacity-80"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 50% at 10% 0%, rgba(139,92,246,0.12), transparent 50%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(251,113,133,0.08), transparent 55%), radial-gradient(ellipse 70% 50% at 50% 100%, rgba(52,211,153,0.06), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06] dark:opacity-[0.10]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.12) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage:
            'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.95) 0%, transparent 70%)',
          WebkitMaskImage:
            'radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.95) 0%, transparent 70%)',
        }}
      />

      {/* ─── 1. Hero band ──────────────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-6 motion-safe:animate-fade-up">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5">
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-wide text-neutral-500 mb-3">
              Workspace · Overview
            </p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.08] tracking-[-0.03em]">
              <span className="text-neutral-600 text-2xl sm:text-3xl lg:text-4xl font-bold block mb-1 dark:text-neutral-300">
                Welcome back,
              </span>
              <span className="bg-gradient-to-r from-neutral-900 via-primary-600 to-rose-600 bg-clip-text text-transparent break-words dark:from-white dark:via-primary-200 dark:to-accent-coral">
                {profile.companyName || 'your business'}.
              </span>
            </h2>
            <p className="mt-3 text-neutral-600 text-sm sm:text-base dark:text-neutral-300">
              {profile.industry} · {profile.city} · {profile.businessStage} · {profile.businessType}
            </p>
          </div>
          <div className="shrink-0 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-medium border border-emerald-500/25 px-2.5 py-1 dark:text-emerald-300 dark:border-emerald-500/20"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />
          Live · saved locally
        </span>
          </div>
        </div>

        {/* 4 KPI tiles */}
        <div className="mt-7 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <KpiTile
            icon={Wallet}
            label="Available capital"
            value={fundsLabel}
            hint={`Stage · ${profile.businessStage}`}
            accent="#fbbf24"
            spark={sparkCapital}
            trend={{ delta: '+12%', positive: true }}
            big
          />
          <KpiTile
            icon={Sparkles}
            label="Profile readiness"
            value={`${readiness}%`}
            hint={`${readyCount} / ${checks.length} fields filled`}
            accent="#a78bfa"
            spark={sparkReadiness}
            trend={{ delta: `${readiness}%`, positive: readiness >= 75 }}
          />
          <KpiTile
            icon={Target}
            label="Main goal"
            value={hasGoal ? profile.mainGoal : 'Not set'}
            hint={hasGoal ? 'Used across every generator' : 'Add a goal in your profile'}
            accent="#a78bfa"
            dim={!hasGoal}
          />
          <KpiTile
            icon={Users}
            label="Target customer"
            value={hasCustomer ? profile.targetCustomer : 'Not set'}
            hint={hasCustomer ? 'Marketing + pricing use this' : 'Add an audience in your profile'}
            accent="#a78bfa"
            dim={!hasCustomer}
          />
        </div>
      </div>

      {/* ─── 2. Quick actions strip ─────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Quick actions</h3>
          <span className="text-[11px] text-neutral-600 hidden sm:inline">Jump straight back in</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <QuickAction
            icon={MessageSquare}
            label="Ask the advisor"
            hint="Chat about your business right now"
            accent="#a78bfa"
            onClick={() => onOpenAdvisor?.()}
          />
          <QuickAction
            icon={Sparkles}
            label="Generate a plan"
            hint="Pricing, marketing or money toolkit"
            accent="#a78bfa"
            onClick={() => onViewDetails('Financial Planning')}
          />
          <QuickAction
            icon={Pencil}
            label="Edit profile"
            hint="Refresh goals, audience, capital"
            accent="#fbbf24"
            onClick={() => onEditProfile?.()}
          />
          <QuickAction
            icon={Download}
            label="Export brief"
            hint="A snapshot you can send to a partner"
            accent="#fbbf24"
            onClick={() => onViewDetails('Owner Tools')}
          />
        </div>
      </div>

      {/* ─── 3. Topic toolkits bento ────────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Topic toolkits</h3>
          <span className="text-[11px] text-neutral-600 hidden sm:inline">Tap any card to open its tools</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 sm:gap-5">
          {TOOLKITS.map((t, i) => {
            const span = i === 0
              ? 'sm:col-span-2 lg:col-span-4'
              : i === 1
                ? 'sm:col-span-2 lg:col-span-2'
                : 'lg:col-span-2';
            const stat =
              t.key === 'money'
                ? { label: 'Available now', value: fundsLabel }
                : t.key === 'operations'
                  ? { label: 'Premise', value: `${profile.city} · ${profile.businessType}` }
                  : t.key === 'pricing'
                    ? { label: 'Industry', value: profile.industry }
                    : t.key === 'marketing'
                      ? { label: 'Audience', value: hasCustomer ? profile.targetCustomer : 'Add target customer' }
                      : { label: 'Stage', value: profile.businessStage };
            const hint =
              t.key === 'money'
                ? 'Funds, forecasts, grants & loan thinking — in RM.'
                : t.key === 'operations'
                  ? 'SSM-aligned checklists, premise, locality, and risk reminders.'
                  : t.key === 'pricing'
                    ? 'Smart pricing, listing wording, and product visuals.'
                    : t.key === 'marketing'
                      ? 'Audience-first plan, then poster + caption assets.'
                      : 'Export-friendly outlines and dashboards for partners.';
  return (
              <ToolkitCard
                key={t.key}
                Icon={t.Icon}
                title={t.title}
                plain={t.plain}
                accent={t.accent}
                stat={stat}
                hint={hint}
                ctaLabel={t.ctaLabel}
                onOpen={() => onViewDetails(t.section)}
                span={span}
              />
            );
          })}
            </div>
          </div>

      {/* ─── 4. Profile readiness matrix ────────────────────────────────────── */}
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="flex items-baseline justify-between gap-4 mb-4">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Profile readiness</h3>
          <span className="text-[11px] text-neutral-600 hidden sm:inline">
            Anything blank is filled by you — nothing is auto-written
          </span>
        </div>

        <div className="rounded-2xl border border-neutral-200/90 bg-white/80 backdrop-blur-xl shadow-sm p-6 sm:p-8 overflow-hidden relative dark:border-white/[0.06] dark:bg-white/[0.03] dark:shadow-panel">

          {/* Top progress strip */}
          <div className="relative flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-neutral-400">
                  Your business profile
                </p>
                <p
                  className="text-xl font-extrabold tabular-nums bg-gradient-to-br from-neutral-900 via-primary-600 to-primary-400 bg-clip-text text-transparent dark:from-white dark:via-primary-200 dark:to-primary-400"
                >
                  {readiness}%
                </p>
                </div>
              <div className="h-2 rounded-full bg-neutral-200 overflow-hidden dark:bg-white/10">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-300 via-accent-coral to-accent-gold transition-[width] duration-500"
                  style={{ width: `${readiness}%` }}
                />
              </div>
          </div>
            {readiness < 100 && (
        <button
          type="button"
                onClick={() => onEditProfile?.()}
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-white hover:bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 dark:border-white/15 dark:bg-white/5 dark:hover:bg-white/10 dark:text-white"
        >
                <Pencil className="h-3.5 w-3.5" aria-hidden />
                Complete profile
        </button>
            )}
          </div>

          {/* Field list */}
          <ul className="relative grid grid-cols-1 sm:grid-cols-2 gap-x-8">
            {checks.map(({ label, value, ok }) => (
              <ReadinessRow key={label} label={label} value={value} isOk={ok} />
            ))}
          </ul>

          <p className="relative mt-6 text-xs text-neutral-500 flex items-center gap-2">
            <MapPin className="h-3 w-3" aria-hidden />
            Saved locally — your data never leaves this browser by default.
          </p>
        </div>
      </div>
    </section>
  );
}
