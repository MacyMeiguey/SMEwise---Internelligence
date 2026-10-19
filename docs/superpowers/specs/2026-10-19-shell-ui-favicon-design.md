# SMEwise shell UI + favicon design

**Date:** 2026-10-19  
**Status:** Approved  
**Scope:** Favicon + shared shell UX (Approach 1 — token-first)

## Goals

- Make the browser tab icon obvious at 16×16.
- Sharpen the product shell toward Linear/Notion-style SaaS.
- Use brand lavender as the sole primary accent.
- Do not rewrite individual widget internals.

## Favicon

- Filled rounded-square mark, fill `#7c3aed`, bold white **S**.
- Ship SVG + 16/32 PNGs + 180 apple-touch-icon.
- `theme-color` = `#7c3aed`.
- Optional small mark tile beside wordmark in header.

## Tokens

- Font: Plus Jakarta Sans (replace Inter).
- Primary: lavender scale (align CSS vars with Tailwind).
- Semantic success/error/warning: real green/red/amber (not lavender).
- Tighter radii on controls; hairline borders; lavender focus rings.

## Shell

- Header: mark + wordmark, quieter theme control.
- Sidebar: clearer active state (already partial — polish).
- Shared Button / Card / Badge / Empty / Loading / Error: lavender primary, hover/press feedback, skeletons.

## Out of scope

- Per-widget layout/copy redesign, 3D scenes, full landing marketing overhaul.
