# ROADMAP.md
Personal Homepage V2 roadmap (for Codex CLI)

How to work:
- Always do the FIRST unchecked item only.
- For that item: update PLAN.md, implement, keep PLAN.md updated, then mark the item as done.
- Keep changes small and targeted. Do not refactor unrelated stuff.

## Current: Fixes + additions
- [x] Add a simple favicon
  - Provide a small SVG favicon for local dev and production

- [x] Default landing route to Sun Clock while keeping the home page available
  - Visiting `/#/` should redirect to `/#/sun`
  - Home page remains accessible (e.g., `/#/home` or another explicit route)

- [x] Fix Seasonal Abstracts early-January color interpolation bug
  - Smoothly continue from Dec 31 into early January
  - Avoid abrupt green/yellow jumps in early January

- [ ] Hide initial snowflake line in Christmas Countdown
  - Each snowflake should appear only when its animation begins

- [ ] Add a new “D&D Dice” room
  - Port `public/legacy/dnd_dice.html` into a full-bleed route
  - Add to the glyph menu and home grid

## History
### Phase 1: Safe foundation
- [x] Create `public/legacy/` and copy the current v1 pages into it (do not delete originals yet)
  - `public/legacy/sun-clock.html` (copy of current root `index.html`)
  - `public/legacy/christmas_countdown.html` (copy)
  - `public/legacy/seasonal_backgrounds.html` (copy)
  - Add a tiny `public/legacy/index.html` that links to the 3 legacy pages

- [x] Add Vite + React + Tailwind app shell at repo root (V2)
  - Hash-based routing with 3 routes: `/sun`, `/seasonal`, `/christmas`
  - Add a simple home route (`/#/`) that briefly introduces the 3 rooms and links to them
  - Ensure the dev server runs and builds successfully

- [x] Implement the corner glyph menu (global)
  - Tiny button top-left
  - Overlay menu lists the 3 rooms
  - Keyboard support (Tab, focus styles, ESC closes)
  - Works on mobile (tap-friendly hit target)

- [x] Add organic route transitions + prefers-reduced-motion support
  - Default: fade/blur transition between routes
  - Reduced motion: no blur, minimal or no animation

### Phase 2: Port the rooms
- [x] Port Seasonal Abstracts into a React route (`/#/seasonal`)
  - Preserve the slider/preview behavior
  - Keep it fullscreen and responsive

- [x] Port Sun Clock into a React route (`/#/sun`)
  - Convert existing code into a module with `init(container)` and `cleanup()`
  - Ensure cleanup cancels RAF and removes listeners
  - Keep external API calls and geolocation behavior

- [x] Port Christmas Countdown into a React route (`/#/christmas`)
  - Convert existing code into a module with `init(container)` and `cleanup()`
  - Ensure cleanup removes snow nodes and clears timers
  - Preserve Safari adjustments and sparkle behavior

### Phase 3: Unify + polish
- [x] Introduce shared season utility (day-of-year, interpolation) and reuse in Sun + Seasonal
- [x] Unify global design tokens (fonts, spacing, overlay styling) across rooms
- [x] Performance and compatibility sweep (Safari, iOS, reduced motion, resize handling)

### Phase 4: Deploy
- [x] Add GitHub Pages deployment (likely GitHub Actions building `dist/`)
- [x] Confirm deep links work (hash routing), legacy links work, and README has run/deploy instructions
