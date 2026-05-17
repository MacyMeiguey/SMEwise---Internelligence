/**
 * TrustMarquee — platforms & programmes with logo marks from /public/logos.
 */

import LogoWordmark from '../shared/LogoWordmark';
import { MarqueeBrandChip, PLATFORM_LOGOS } from './platformLogos';

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-4 pr-4" aria-hidden>
      {PLATFORM_LOGOS.map((item) => (
        <MarqueeBrandChip key={item.label} {...item} />
      ))}
    </div>
  );
}

export default function TrustMarquee() {
  return (
    <section
      aria-label="Platforms and programmes this advisor understands"
      className="relative border-y border-white/[0.08] bg-[#07070b]/38 backdrop-blur-xl py-8 overflow-hidden text-white"
    >
      <div className="max-w-4xl mx-auto px-4 text-center mb-6">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
          <LogoWordmark size="md" variant="gradient" />
          <span className="hidden sm:block h-8 w-px bg-white/15" aria-hidden />
          <div className="text-left sm:text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-300">
              Speaks your context
            </p>
            <p className="text-sm text-neutral-400 mt-0.5">
              Built for Malaysian SMEs · Same language as your sales channels
            </p>
          </div>
        </div>
      </div>

      <div
        className="group relative w-full overflow-hidden"
        style={{
          maskImage: 'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0, #000 6%, #000 94%, transparent 100%)',
        }}
      >
        <div className="flex w-max motion-safe:animate-marquee group-hover:[animation-play-state:paused]">
          <Track />
          <Track />
        </div>
      </div>
    </section>
  );
}
