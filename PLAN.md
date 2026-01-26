Goal: Default landing to Sun Clock while keeping the rooms page at /#/rooms.

Plan (3–7 steps):
1) Update routing to treat /#/ as /#/sun and add /#/rooms for the home grid.
2) Update in-app links that point back to the home grid.
3) Refresh README routes to reflect the new default landing behavior.
4) Log progress/decisions and update the roadmap.

Progress (append bullets):
- Created public/legacy and copied v1 HTML files with required names.
- Added public/legacy/index.html linking to legacy pages.
- Added Vite/React/Tailwind config and package.json for the app shell.
- Replaced root index.html with Vite entry and added src scaffold.
- Implemented hash-based routing with home + room placeholder routes.
- Added a global glyph button and menu overlay listing the three rooms.
- Wired up ESC close, focus styles, and menu close on route change.
- Added fade/blur route transitions with a reduced-motion override.
- Wired transition state to hash routing so room changes animate.
- Ported Seasonal Abstracts into a dedicated React component with slider controls.
- Routed /#/seasonal to the fullscreen seasonal background.
- Switched the seasonal background to use an absolute wrapper and ensured the route container is full-height.
- Added Sun Clock module with init/cleanup and wired it to /#/sun.
- Added Sun Clock styling and full-bleed layout handling.
- Ported Christmas Countdown into init/cleanup modules with snow + countdown text.
- Routed /#/christmas to the new React wrapper and added CSS for layout/sparkle.
- Adjusted the Christmas scene wrapper to preserve fullscreen layout in Chromium.
- Added shared season utilities for day-of-year and color interpolation.
- Reused shared utilities in Seasonal Abstracts and Sun Clock.
- Defined global UI tokens (fonts, panels, spacing) in the base CSS.
- Updated menu, cards, and room pill to use token-based classes.
- Aligned Sun Clock time display with the global display font.
- Added safe-area offsets for fixed UI and bottom padding for the Sun Clock time.
- Added full-bleed viewport sizing with svh/dvh support and Safari backdrop prefixes.
- Added a GitHub Actions workflow to build and deploy `dist/` to Pages.
- Added a root README with hash route, legacy link, and run/deploy instructions.
- Redirected /#/ to /#/sun and moved the rooms grid to /#/rooms.
- Updated back links and README to reflect the rooms route.

Decisions (append bullets):
- Used a minimal custom hash router to avoid adding react-router for now.
- Kept transitions in App state with a short timeout to avoid extra libs.
- Applied the seasonal background color to the room container instead of body styles.
- Avoided fixed positioning to prevent transition container stacking issues.
- Used requestAnimationFrame for the Sun Clock update loop to ease cleanup.
- Kept the snowflakes DOM-based for simplicity and parity with legacy.
- Split the Christmas room into a full-bleed host and inner scene to avoid height collapse.
- Added both hex and rgb interpolation helpers to support existing room outputs.
- Kept Christmas typography as an accent while loading the shared font set globally.
- Preferred CSS-based safe-area handling to avoid JS layout logic.
- Targeted Node 20 in the Pages workflow for consistency.
- Documented legacy access paths without adding new UI links.
- Kept the rooms page accessible only via /#/rooms (no menu item) to preserve the 3-room menu requirement.

Next:
