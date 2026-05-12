/**
 * Compact brand-style marks for the trust marquee (simplified shapes + brand colours).
 * Icons sit beside text labels in the marquee — not official trademark assets.
 */

import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

/** Shopee bag — orange */
export function IconShopee(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <path
        fill="#EE4D2D"
        d="M6 10h20l-2 14H8L6 10Zm4-2c0-2.2 1.8-4 4-4s4 1.8 4 4h-3c0-.6-.4-1-1-1s-1 .4-1 1H10Z"
      />
      <path fill="#fff" fillOpacity="0.9" d="M13 18h6v2h-6v-2Z" />
    </svg>
  );
}

/** Lazada — blue card + orange burst */
export function IconLazada(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <rect x="3" y="8" width="26" height="17" rx="2.5" fill="#0f146d" />
      <path fill="#f85607" d="M19 5h10v9l-5 4.5L19 14V5Z" />
    </svg>
  );
}

/** TikTok — note + brand accent blobs */
export function IconTikTok(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="12" cy="21" r="5.5" fill="#25F4EE" opacity="0.35" />
      <circle cx="14" cy="21" r="5.5" fill="#FE2C55" opacity="0.35" />
      <path
        fill="#f4f4f5"
        d="M22 5h-2v11.3a4.4 4.4 0 1 1-2-3.8V10h-5V8h9V5Zm-7.5 16a2.5 2.5 0 100-5 2.5 2.5 0 000 5Z"
      />
    </svg>
  );
}

/** Grab — green tile + G */
export function IconGrab(props: P) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden {...props}>
      <rect width="32" height="32" rx="8" fill="#00B14F" />
      <text
        x="16"
        y="21"
        textAnchor="middle"
        fill="#fff"
        fontSize="15"
        fontWeight="800"
        fontFamily="system-ui, sans-serif"
      >
        G
      </text>
    </svg>
  );
}

/** WhatsApp */
export function IconWhatsApp(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="16" cy="16" r="15" fill="#25D366" />
      <path
        fill="#fff"
        d="M8.5 23.5 9 19c0-4 3.2-7.2 7.2-7.2 2 0 3.6.8 4.8 2A7 7 0 0 0 16 25c-1.2 0-2.3-.3-3.3-.8l-4.2 1.3Zm5.8-4.3.6.3c.7.4 1.5.6 2.3.6 2.5 0 4.5-2 4.5-4.5 0-1-.3-1.9-.9-2.7l-.4-.4-.9.3-1.1.4c-.3.1-.5.4-.4.7l.2.7c.1.4 0 .8-.3 1l-.3.3c-.1.1-.2.4-.1.6l.4 1.1c.1.3.3.5.5.7l.4.3Z"
      />
    </svg>
  );
}

/** foodpanda — pink panda face */
export function IconFoodpanda(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="16" cy="14" r="12" fill="#D70F64" />
      <ellipse cx="12" cy="13" rx="2" ry="2.2" fill="#fff" />
      <ellipse cx="20" cy="13" rx="2" ry="2.2" fill="#fff" />
      <path fill="#fff" d="M10 19c2 3 6 3 12 1l-.5 2c-6 2.5-9.5 1-11.5-3Z" />
    </svg>
  );
}

/** SSM — document stack */
export function IconSSM(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <rect x="6" y="6" width="18" height="22" rx="2" fill="#a78bfa" fillOpacity="0.35" stroke="#a78bfa" strokeWidth="1.5" />
      <path stroke="#fff" strokeWidth="1.2" d="M10 12h10M10 17h10M10 22h6" />
    </svg>
  );
}

/** Programme / funding — coin stack */
export function IconFund(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <ellipse cx="16" cy="22" rx="8" ry="3" fill="#fbbf24" fillOpacity="0.4" />
      <rect x="10" y="10" width="12" height="10" rx="1" fill="#fbbf24" fillOpacity="0.85" />
      <rect x="10" y="6" width="12" height="6" rx="1" fill="#fbbf24" />
    </svg>
  );
}

/** RM — ringgit context */
export function IconRM(props: P) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden {...props}>
      <circle cx="16" cy="16" r="13" stroke="#34d399" strokeWidth="2" fill="none" />
      <text x="16" y="20" textAnchor="middle" fill="#34d399" fontSize="11" fontWeight="800" fontFamily="system-ui,sans-serif">
        RM
      </text>
    </svg>
  );
}
