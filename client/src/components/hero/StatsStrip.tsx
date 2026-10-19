/**
 * StatsStrip — Aetheris / Metrica-style number tiles right under the hero.
 *
 * Honest figures only — these reflect what SMEwise actually delivers; we never
 * fake "10,000+ users" social proof until that's real.
 */

import { Sparkles, Timer, Database, ShieldCheck } from 'lucide-react';

const STATS = [
  {
    icon: Sparkles,
    value: '6',
    valueSuffix: '',
    label: 'Topic toolkits',
    sub: 'Ops · Finance · Pricing · Marketing · Reports · Advisor',
  },
  {
    icon: Timer,
    value: '~3',
    valueSuffix: ' min',
    label: 'Setup time',
    sub: 'Profile once · powers every screen',
  },
  {
    icon: Database,
    value: '0',
    valueSuffix: ' KB',
    label: 'Sent without consent',
    sub: 'Your data stays on your device by default',
  },
  {
    icon: ShieldCheck,
    value: 'RM',
    valueSuffix: '',
    label: 'Native currency',
    sub: 'Malaysian examples, grants, platforms',
  },
] as const;

export default function StatsStrip() {
  return (
    <section
      aria-label="Key facts about SMEwise"
      className="relative border-b border-white/[0.08] bg-[#07070b]/38 backdrop-blur-xl overflow-hidden"
    >
      <div
        className="absolute inset-0 opacity-25 pointer-events-none"
        aria-hidden
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 40%, rgba(167,139,250,0.25), transparent 50%)',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 my-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/[0.08] border border-white/[0.08] rounded-xl overflow-hidden">
        {STATS.map(({ icon: Icon, value, valueSuffix, label, sub }, i) => {
          return (
            <div
              key={label}
              className="relative bg-black/20 backdrop-blur-sm p-6 sm:p-8 flex flex-col gap-3 motion-safe:animate-count-up hover:bg-white/[0.05] transition-colors duration-300"
              style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'backwards' }}
            >
              <div
                className="relative grid place-items-center h-12 w-12 rounded-xl border border-white/[0.1] bg-primary-500/10 text-primary-300"
                aria-hidden
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="relative text-[11px] font-semibold uppercase tracking-wider text-primary-300/90">
                {label}
              </div>

              <p className="relative text-5xl sm:text-6xl font-bold leading-none tabular-nums tracking-tight text-white">
                {value}
                <span className="text-2xl sm:text-3xl align-baseline font-semibold text-primary-200">
                  {valueSuffix}
                </span>
              </p>
              <p className="relative text-sm text-neutral-500 leading-snug max-w-[16rem]">{sub}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
