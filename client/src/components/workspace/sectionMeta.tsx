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
    tagline: 'Benchmark peers, tune shelf prices, then shape listing copy and a simple product visual.',
    Icon: Tags,
    glow: 'rgba(167, 139, 250, 0.28)',
    highlights: [
      'Optional fields above sharpen every output — worth 60 seconds.',
      'Competitor pass + smart pricing give you a defendable range, not a guess.',
      'Poster-style visual keeps your offer legible on a phone screen.',
    ],
    runAllLabel: 'Refresh pricing desk',
    runAllHint: 'Runs competitor scan, smart pricing, then product visual in one sweep.',
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
    tagline: 'One visual snapshot, exportable briefs, and a chat that already knows your numbers.',
    Icon: FileBarChart,
    glow: 'rgba(109, 40, 217, 0.3)',
    highlights: [
      'Analytics image is illustrative — use it in slides or investor teasers.',
      'Documents land as PDF / Word so you can edit offline or share safely.',
      'Need a sounding board? The Business advisor panel (right rail) already knows this profile — no second chat needed.',
    ],
    runAllLabel: 'Build owner bundle',
    runAllHint: 'Kicks off dashboard art + document generator together.',
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
