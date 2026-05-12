/**
 * HeroSection — landing page
 * Two modes: fresh visitor vs. returning user with existing profile
 */

import Button from '../shared/Button';
import type { BusinessProfile } from '../../types';

export interface HeroSectionProps {
  onGetStarted: () => void;
  profile?: BusinessProfile | null;
  onGoToWorkspace?: () => void;
}

export default function HeroSection({ onGetStarted, profile, onGoToWorkspace }: HeroSectionProps) {
  return (
    <div className="bg-white">

      {/* ── Returning user banner ── */}
      {profile && (
        <div className="bg-neutral-950 text-white border-b-2 border-neutral-950">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-primary-300">Welcome back</p>
              <p className="text-lg font-bold">{profile.companyName}</p>
              <p className="text-xs text-neutral-400 mt-0.5">{profile.industry} · {profile.city}</p>
            </div>
            <button
              type="button"
              onClick={onGoToWorkspace}
              className="btn-brand shrink-0"
            >
              Open workspace →
            </button>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="border-b-2 border-neutral-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="pt-16 sm:pt-20 lg:pt-24 pb-0">

            {/* Eyebrow */}
            <div className="flex justify-center lg:justify-start mb-8">
              <span className="pill-brand">
                <span className="w-2 h-2 rounded-full bg-primary-400 inline-block" aria-hidden />
                Built for Malaysian SMEs
              </span>
            </div>

            {/* Headline */}
            <div className="max-w-4xl">
              <h1 className="text-[clamp(2.5rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-tight text-neutral-950 text-balance">
                Run your business
                <br />
                with a{' '}
                <span className="relative inline-block">
                  <span className="relative z-10">clear head</span>
                  <span className="absolute bottom-1 left-0 w-full h-3 sm:h-4 bg-primary-200 -z-0 rounded" aria-hidden />
                </span>
                <span className="text-primary-300">.</span>
              </h1>

              <p className="mt-6 text-base sm:text-lg text-neutral-600 max-w-xl leading-relaxed">
                One workspace — profile, AI planning tools, and an advisor — all using the same
                information about your business. No repeat explanations.
              </p>
            </div>

            {/* CTA */}
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {profile ? (
                <>
                  <Button size="lg" onClick={onGoToWorkspace}>
                    Go to my workspace
                  </Button>
                  <button
                    type="button"
                    onClick={onGetStarted}
                    className="text-sm font-semibold text-neutral-600 hover:text-neutral-950 underline underline-offset-2"
                  >
                    Update profile
                  </button>
                </>
              ) : (
                <>
                  <Button size="lg" onClick={onGetStarted}>
                    Add your business profile (~3 min)
                  </Button>
                  <p className="text-sm text-neutral-500">Free · No payment step · Edit anytime</p>
                </>
              )}
            </div>

            {/* How it works */}
            <div className="mt-12 sm:mt-16 pb-0 grid grid-cols-1 sm:grid-cols-3 gap-px bg-neutral-200 border-t-2 border-neutral-950">
              {[
                { n: '01', title: 'Profile',  body: 'Your business details, audience, and capital — entered once.' },
                { n: '02', title: 'Overview', body: 'A clear summary with shortcuts to every tool group.' },
                { n: '03', title: 'Generate', body: 'Run AI analyses, plans, and documents on demand.' },
              ].map(({ n, title, body }) => (
                <div key={n} className="bg-white px-6 py-8 sm:px-8 sm:py-10">
                  <p className="text-[3rem] sm:text-[4rem] font-bold text-primary-200 leading-none tabular-nums">{n}</p>
                  <p className="mt-3 text-base font-semibold text-neutral-950">{title}</p>
                  <p className="mt-1.5 text-sm text-neutral-600 leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features strip ── */}
      <section className="border-b-2 border-neutral-950 bg-neutral-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <p className="eyebrow text-center mb-10">What's inside</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ title, body, tag }) => (
              <div key={title} className="bg-white border-2 border-neutral-950 rounded-2xl p-6" style={{ boxShadow: '3px 3px 0 0 #0f0f0f' }}>
                <span className="pill-brand mb-4 inline-flex">{tag}</span>
                <h3 className="text-base font-bold text-neutral-950 mt-2">{title}</h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer CTA ── */}
      <section className="border-b-2 border-neutral-950 bg-neutral-950 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to run smarter<span className="text-primary-300">?</span>
          </h2>
          <p className="text-neutral-400 text-base mb-8 max-w-md mx-auto">
            Set up your free profile in 3 minutes and unlock every AI tool.
          </p>
          {profile ? (
            <button type="button" onClick={onGoToWorkspace} className="btn-brand px-8 py-3 text-base">
              Back to my workspace →
            </button>
          ) : (
            <button type="button" onClick={onGetStarted} className="btn-brand px-8 py-3 text-base">
              Get started free
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

const FEATURES = [
  {
    tag: 'Operations',
    title: 'Registration & setup guidance',
    body: 'Company registration steps, office location analysis, and risk checks tailored to your city.',
  },
  {
    tag: 'Finance',
    title: 'Fund allocation & projections',
    body: 'See how to split your capital, project revenue, and explore loan or grant options in Malaysia.',
  },
  {
    tag: 'Pricing',
    title: 'Smart pricing & competitor scan',
    body: 'Data-driven price recommendations, competitor benchmarks, and product description drafts.',
  },
  {
    tag: 'Marketing',
    title: 'Strategy & campaign materials',
    body: 'A 30-day marketing plan and ready-to-use promotional poster based on your audience.',
  },
  {
    tag: 'Reports',
    title: 'Documents & analytics',
    body: 'Export-ready business reports, analytics framing, and an inline chat advisor.',
  },
  {
    tag: 'Advisor',
    title: 'Context-aware AI advisor',
    body: 'Ask anything — the advisor knows your profile and follows whatever section you\'re working in.',
  },
];
