/**
 * TrustMarquee — platforms & programmes with recognizable logo marks + SMEwise brand.
 */

import LogoWordmark from '../shared/LogoWordmark';
import {
  IconShopee,
  IconLazada,
  IconTikTok,
  IconWhatsApp,
  IconGrab,
  IconFoodpanda,
  IconSSM,
  IconFund,
  IconRM,
} from './platformLogos';
import type { FC, SVGProps } from 'react';

type TrackItem = {
  Icon: FC<SVGProps<SVGSVGElement>>;
  label: string;
};

const PLATFORMS: TrackItem[] = [
  { Icon: IconTikTok,     label: 'TikTok Shop' },
  { Icon: IconShopee,     label: 'Shopee' },
  { Icon: IconLazada,     label: 'Lazada' },
  { Icon: IconWhatsApp,   label: 'WhatsApp Business' },
  { Icon: IconGrab,       label: 'GrabFood' },
  { Icon: IconFoodpanda,  label: 'foodpanda' },
  { Icon: IconSSM,        label: 'SSM-aware' },
  { Icon: IconFund,       label: 'BSN · MARA' },
  { Icon: IconFund,       label: 'Cradle · TEKUN' },
  { Icon: IconFund,       label: 'MDEC' },
  { Icon: IconRM,         label: 'RM context' },
];

function Track() {
  return (
    <div className="flex shrink-0 items-center gap-3 pr-3" aria-hidden>
      {PLATFORMS.map(({ Icon, label }, i) => (
        <span
          key={`${label}-${i}`}
          className="inline-flex items-center gap-2.5 rounded-2xl border border-white/[0.12] bg-white/[0.05] backdrop-blur-sm px-3.5 py-2.5 text-sm font-medium text-neutral-100 whitespace-nowrap shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]"
        >
          <Icon className="h-8 w-8 shrink-0" width={32} height={32} />
          <span className="leading-tight">{label}</span>
        </span>
      ))}
    </div>
  );
}

export default function TrustMarquee() {
  return (
    <section
      aria-label="Platforms and Malaysian context this advisor understands"
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
