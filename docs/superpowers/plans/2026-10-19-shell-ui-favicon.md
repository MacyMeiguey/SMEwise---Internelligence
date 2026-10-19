# Shell UI + Favicon Implementation Plan

> **For agentic workers:** Implement task-by-task. Steps use checkbox syntax.

**Goal:** Ship an obvious filled-S favicon and a token-first shared-shell refresh (lavender primary, Plus Jakarta Sans, sharper controls).

**Architecture:** Update design tokens first so Tailwind utilities cascade; regenerate favicon assets; restyle shared components and header chrome without changing widget business logic.

**Tech Stack:** React, Vite, Tailwind v3, Sharp (PNG generation), SVG favicon

**Spec:** `docs/superpowers/specs/2026-10-19-shell-ui-favicon-design.md`

## Global Constraints

- Keep existing stack; no framework migration.
- Do not break workspace navigation or widget APIs.
- Prefer token/class changes over structural rewrites.

---

### Task 1: Favicon assets

- [ ] Add `client/public/favicon.svg`
- [ ] Generate 16/32/180 PNGs; update `index.html` + theme-color

### Task 2: Tokens + typography

- [ ] Sync `design-system.css` + `index.css` + `tailwind.config.js` (fonts, semantic colors)

### Task 3: Shared components

- [ ] Button, Card, Badge, Empty/Loading/Error; add BrandMark; wire header

### Task 4: Smoke check

- [ ] Client builds / typechecks; visual sanity on landing + workspace chrome
