/**
 * SectionBanner — functional section header banners.
 * Each banner shows: section name (large), subtitle, and a contextual animated graphic.
 * Dark-mode native, animated, and useful (not just decorative).
 */

import { Building2, LineChart, Tags, Megaphone, FileBarChart } from 'lucide-react';

interface BannerConfig {
  title: string;
  subtitle: string;
  icon: typeof Building2;
  gradient: string;
  accentColor: string;
  glowColor: string;
  features: string[];
}

const BANNER_CONFIG: Record<string, BannerConfig> = {
  'Operations': {
    title: 'Operations',
    subtitle: 'Business Setup · Compliance · Risk Assessment',
    icon: Building2,
    gradient: 'from-primary-600/20 via-primary-900/25 to-[#07070b]/40',
    accentColor: '#a78bfa',
    glowColor: 'rgba(167, 139, 250, 0.15)',
    features: ['SSM Registration', 'Location Analysis', 'Risk Snapshot'],
  },
  'Financial Planning': {
    title: 'Financial Planning',
    subtitle: 'Fund Allocation · Revenue · Loans & Funding',
    icon: LineChart,
    gradient: 'from-amber-600/15 via-amber-900/20 to-[#07070b]/30',
    accentColor: '#fbbf24',
    glowColor: 'rgba(251, 191, 36, 0.12)',
    features: ['Budget Breakdown', 'Revenue Projection', 'Funding Sources'],
  },
  'Pricing Strategy': {
    title: 'Pricing Intelligence',
    subtitle: 'Competitor Analysis · Smart Pricing · History',
    icon: Tags,
    gradient: 'from-rose-600/15 via-rose-900/20 to-[#07070b]/30',
    accentColor: '#f472b6',
    glowColor: 'rgba(244, 114, 182, 0.12)',
    features: ['Market Scan', 'AI Pricing', 'Price History'],
  },
  'Marketing': {
    title: 'Marketing',
    subtitle: 'Strategy · Content Guidelines · Forecast',
    icon: Megaphone,
    gradient: 'from-teal-600/15 via-teal-900/20 to-[#07070b]/30',
    accentColor: '#2dd4bf',
    glowColor: 'rgba(45, 212, 191, 0.12)',
    features: ['Channel Strategy', 'Creative Brief', 'Reach Forecast'],
  },
  'Owner Tools': {
    title: 'Owner Tools',
    subtitle: 'Analytics · Reports · Exports',
    icon: FileBarChart,
    gradient: 'from-primary-500/15 via-primary-900/20 to-[#07070b]/35',
    accentColor: '#c4b5fd',
    glowColor: 'rgba(196, 181, 253, 0.15)',
    features: ['Dashboard', 'PDF Report', 'DOCX Export'],
  },
};

export interface SectionBannerProps {
  section: string;
}

export default function SectionBanner({ section }: SectionBannerProps) {
  const config = BANNER_CONFIG[section];
  if (!config) return null;

  const { title, subtitle, icon: Icon, gradient, accentColor, glowColor, features } = config;

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${gradient}`}>
      {/* Animated glow orb */}
      <div
        className="absolute -top-20 -right-20 w-64 h-64 rounded-full opacity-60 animate-glow-pulse pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)` }}
      />
      <div
        className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full opacity-40 animate-glow-pulse pointer-events-none"
        style={{ background: `radial-gradient(circle, ${glowColor}, transparent 70%)`, animationDelay: '2.5s' }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 px-5 sm:px-7 py-5 sm:py-6 flex items-center justify-between gap-4">
        {/* Left: Title + subtitle */}
        <div className="flex items-center gap-4 min-w-0">
          <div
            className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl grid place-items-center border shadow-lg"
            style={{
              borderColor: `${accentColor}40`,
              background: `linear-gradient(135deg, ${accentColor}20, ${accentColor}08)`,
              boxShadow: `0 4px 20px -4px ${accentColor}30`,
            }}
          >
            <Icon className="h-6 w-6 sm:h-7 sm:w-7" style={{ color: accentColor }} />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight truncate">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-white/50 mt-0.5 tracking-wide">
              {subtitle}
            </p>
          </div>
        </div>

        {/* Right: Feature pills */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          {features.map((f) => (
            <span
              key={f}
              className="px-2.5 py-1 rounded-md text-xs font-medium border backdrop-blur-sm"
              style={{
                color: accentColor,
                borderColor: `${accentColor}30`,
                background: `${accentColor}10`,
              }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom accent line */}
      <div
        className="h-[2px] w-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}50, transparent)` }}
      />
    </div>
  );
}
