/**
 * Visual + copy metadata for workspace toolkit sections (Dashboard / SectionPanel).
 * Each section has unique highlights, CTA wording, and a matching hero illustration key.
 */

import {
  Building2,
  LineChart,
  Tags,
  Megaphone,
  FileBarChart,
  type LucideIcon,
} from 'lucide-react';

export type SectionHeroArtKey = 'operations' | 'financial' | 'pricing' | 'marketing' | 'owner';

export interface WorkspaceSectionMeta {
  /** Short line under the title */
  tagline: string;
  /** Optional display title override — shown in the heading instead of the section key */
  displayTitle?: string;
  Icon: LucideIcon;
  /** CSS color for hero glow only (stays in brand violet family) */
  glow: string;
  /** 2–3 punchy bullets — different voice per section */
  highlights: string[];
  /** Primary bulk action — avoid repeating “Generate all” everywhere */
  runAllLabel: string;
  /** Micro-hint under the bulk button */
  runAllHint: string;
  /** Pass-through to SectionHeroArt (unique art per section) */
  heroArt: SectionHeroArtKey;
}

export const WORKSPACE_SECTION_META: Record<string, WorkspaceSectionMeta> = {
  Operations: {
    tagline: 'Turn your profile into SSM-aware checklists, a premise read-out, and a risk snapshot.',
    Icon: Building2,
    glow: 'rgba(124, 58, 237, 0.35)',
    highlights: [
      'See what to register or clarify first — no generic legal essay.',
      'Locality notes use your city + structure so advice feels grounded.',
      'Risk view highlights what to watch this quarter, not a scare list.',
    ],
    runAllLabel: 'Run all ops drafts',
    runAllHint: 'Fires registration, location, then risk — grab coffee, skim results.',
    heroArt: 'operations',
  },
  'Financial Planning': {
    tagline: 'Sketch runway, revenue shape, returns, and funding angles — all in RM, tied to your stage.',
    Icon: LineChart,
    glow: 'rgba(139, 92, 246, 0.32)',
    highlights: [
      'Allocation + projections speak to how much headroom you actually have.',
      'Returns block connects “what if” pricing or volume to simple outcomes.',
      'Loans & grants section points at realistic next conversations, not hype.',
    ],
    runAllLabel: 'Fill the money toolkit',
    runAllHint: 'Runs all four money widgets in parallel — great for a monthly review.',
    heroArt: 'financial',
  },
  'Pricing Strategy': {
    displayTitle: 'Market Pricing Intelligence',
    tagline: 'Scan the market, benchmark competitors, and set data-driven prices for your products.',
    Icon: Tags,
    glow: 'rgba(167, 139, 250, 0.28)',
    highlights: [
      'Real-time competitor price scanning gives you market context.',
      'Smart pricing engine recommends a defensible price range.',
      'Cached product results let you compare and act fast.',
    ],
    runAllLabel: 'Run Market Intelligence Scan',
    runAllHint: 'Scans competitors, calculates smart pricing, caches results.',
    heroArt: 'pricing',
  },
  Marketing: {
    tagline: 'Start with a channel-smart plan, then ship poster-ready creative you can tweak in Canva.',
    Icon: Megaphone,
    glow: 'rgba(196, 181, 253, 0.26)',
    highlights: [
      'Strategy card respects your audience sentence from the profile wizard.',
      'Poster flow can lean on the strategy you just generated — less repetition.',
      'Copy blocks are short enough to paste into IG, XHS, or WhatsApp Status.',
    ],
    runAllLabel: 'Ship campaign pack',
    runAllHint: 'Drafts strategy first, then the poster — order matters for coherence.',
    heroArt: 'marketing',
  },
  'Owner Tools': {
    tagline:
      'Stakeholder-ready visuals and exportable briefs — one clear path, no duplicate chat surfaces.',
    Icon: FileBarChart,
    glow: 'rgba(109, 40, 217, 0.3)',
    highlights: [
      'Use the flow strip below: snapshot first, then written exports — mirrors how founders prep packs.',
      '"Build owner bundle" still runs both generators in one tap when you are iterating fast.',
      'Downloads stay on this device until you choose to share — good hygiene for drafts.',
    ],
    runAllLabel: 'Build owner bundle',
    runAllHint: 'Runs dashboard snapshot and report generator together.',
    heroArt: 'owner',
  },
};

export function getSectionMeta(title: string): WorkspaceSectionMeta {
  return (
    WORKSPACE_SECTION_META[title] ?? {
      tagline: 'Guidance powered by your saved business profile.',
      Icon: Building2,
      glow: 'rgba(124, 58, 237, 0.25)',
      highlights: [
        'Each card below drafts something concrete you can edit or export.',
        'Your profile is the single source of truth — update it anytime.',
      ],
      runAllLabel: 'Run every tool below',
      runAllHint: 'Runs all generators in this section that support bulk actions.',
      heroArt: 'operations',
    }
  );
}
