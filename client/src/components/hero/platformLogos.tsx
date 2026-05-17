/**
 * Platform / programme logos for the trust marquee (served from /public/logos).
 */

import { useEffect, useState } from 'react';

export type PlatformLogoItem = {
  label: string;
  /** Path under public/, e.g. `/logos/Shopee.svg` */
  src?: string;
};

/** Resolve a filename in `client/public/logos/` to a public URL. */
export function logoUrl(filename: string): string {
  return `/logos/${encodeURIComponent(filename)}`;
}

export const PLATFORM_LOGOS: PlatformLogoItem[] = [
  { label: 'TikTok Shop', src: logoUrl('tiktok-shop-icon.png') },
  { label: 'Shopee', src: logoUrl('Shopee.svg') },
  { label: 'Lazada', src: logoUrl('Lazada_(2019).svg') },
  { label: 'WhatsApp Business', src: logoUrl('whatsapp-for-business-icon.webp') },
  { label: 'GrabFood', src: logoUrl('grab-food-Logo.png') },
  { label: 'foodpanda', src: logoUrl('foodpanda-logo.png') },
  { label: 'SSM', src: logoUrl('SSM logo.png') },
  { label: 'BSN', src: logoUrl('BSN logo.png') },
  { label: 'MARA', src: logoUrl('MARA logo.png') },
  { label: 'Cradle', src: logoUrl('cradle logo.png') },
  { label: 'TEKUN', src: logoUrl('TEKUN logo.png') },
  { label: 'MDEC', src: logoUrl('mdec-logo.png') },
];

type LoadState = 'pending' | 'ok' | 'fail';

export function MarqueeBrandChip({
  label,
  src,
}: PlatformLogoItem) {
  const [state, setState] = useState<LoadState>(src ? 'pending' : 'fail');

  useEffect(() => {
    setState(src ? 'pending' : 'fail');
  }, [src, label]);

  return (
    <span
      className="inline-flex min-h-12 min-w-[4.5rem] items-center justify-center rounded-xl border border-white/20 bg-white px-4 py-2.5 shadow-[0_2px_12px_rgba(0,0,0,0.28)] ring-1 ring-black/5"
      aria-label={state === 'ok' ? label : undefined}
    >
      {src && state !== 'fail' && (
        <img
          src={src}
          alt=""
          decoding="async"
          onLoad={() => setState('ok')}
          onError={() => setState('fail')}
          className={
            state === 'ok'
              ? 'h-10 w-auto max-w-[168px] object-contain object-center sm:h-11'
              : 'absolute h-px w-px opacity-0 pointer-events-none overflow-hidden'
          }
        />
      )}
      {state !== 'ok' && (
        <span className="text-sm font-semibold leading-tight text-neutral-800 whitespace-nowrap">
          {label}
        </span>
      )}
    </span>
  );
}
