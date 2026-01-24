# CODEX_BRIEF.md
Personal Homepage V2 (for Codex CLI)

## Current state (v1)
- Root `index.html`: "Sun Clock" fullscreen canvas page
  - Uses geolocation
  - Calls the sunrise-sunset API
  - Renders day/night wedge visualization + time/date overlay
  - Uses seasonal background gradients with date-based interpolation
- `christmas_countdown.html`: fullscreen Christmas countdown
  - Blue gradient background
  - "Old-timey" typography, sparkle text
  - Countdown to Dec 25 (updates daily)
  - Safari-specific styling adjustments
  - Falling snow animation (DOM + CSS keyframes)
- `seasonal_backgrounds.html`: React/Tailwind seasonal abstract background generator
  - Interpolates colors + shape density by day-of-year
  - Renders blurred organic shapes
  - UI toggle + slider to preview any day of year

## Goal
Create a single cohesive personal homepage that hosts these projects as fullscreen "rooms" with subtle navigation, unified style, and organic transitions.

## UX/UI requirements (must-haves)
- A tiny corner glyph button (top-left by default).
- Clicking the glyph opens a small overlay menu listing exactly these 3 items:
  1) Sun Clock
  2) Seasonal Abstracts
  3) Christmas Countdown
- Keep the center of the viewport unobstructed.
- Add an organic route transition (fade and/or blur, about 200 to 400ms).
- Unify typography + spacing across rooms.
  - Christmas can keep an accent style inside its room, but the global UI (nav, layout) stays consistent.
- Accessibility:
  - Menu is keyboard accessible (Tab navigation)
  - ESC closes menu
  - Visible focus styles
  - Respect `prefers-reduced-motion` by reducing/disable transitions and heavy animations when requested

## Technical direction (chosen)
- Static hosting on GitHub Pages (no server-side runtime).
- Use a Vite + React + Tailwind "app shell".
- Use hash-based routing to avoid GitHub Pages refresh 404s:
  - `/#/sun`
  - `/#/seasonal`
  - `/#/christmas`
- Lazy-initialize each room only when active.
  - Clean up on route change (cancel RAF, clear intervals/timeouts, remove listeners, remove injected DOM nodes).

## Non-destructive constraints
- Do not delete the legacy pages. Preserve original experiences under:
  - `public/legacy/sun-clock.html` (copy of the current root `index.html` at the moment V2 starts)
  - `public/legacy/christmas_countdown.html`
  - `public/legacy/seasonal_backgrounds.html`
- Avoid refactoring unrelated parts.
- Prefer small, targeted changes per task.

## Performance / compatibility goals
- No background work for inactive rooms.
- Safari compatibility matters (keep existing Safari adjustments if needed).
- Use `requestAnimationFrame` for animation loops and cancel on cleanup.
- Avoid layout thrash during animations.

## Shared season utility (later, but planned)
Consolidate season/day-of-year utilities into a shared module so Sun Clock and Seasonal Abstracts can share:
- day-of-year calculation
- color interpolation
- season phase mapping

## Implementation approach (high level)
1) Build the V2 shell (routing + nav glyph + overlay menu + transitions).
2) Add the Seasonal Abstracts route (already React-friendly).
3) Port Sun Clock and Christmas as init/cleanup modules.
4) Unify design tokens (fonts, CSS variables) and add `prefers-reduced-motion`.
5) Iterate on efficiency + browser support.
