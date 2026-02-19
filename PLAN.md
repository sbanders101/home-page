Goal: Replace the website-linked ICS2CSV app with the new version from `import/ics2csv`.

Plan (3–7 steps):
1) Inspect `import/ics2csv` file structure and confirm required runtime assets.
2) Copy the new app files into `public/ics2csv` (the website-linked path).
3) Append progress/decisions and mark the roadmap checkbox complete.

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
- Added a simple SVG favicon and linked it in the app entry.
- Fixed early-January interpolation by wrapping days before the first anchor.
- Snowflakes now start hidden and fade in when their fall animation begins.
- Ported the D&D Dice canvas into an init/cleanup module and React wrapper.
- Added the /#/dice route to the menu, rooms grid, and full-bleed layout list.
- Started direct-link publishing task for ICS2CSV.
- Copied `ics2qbo` static webapp files into `public/ics2csv`.
- Kept app-shell navigation unchanged so ICS2CSV stays direct-link only.
- Started ICS2CSV export/preview enhancement task.
- Updated ICS2CSV preview headers with per-customer Invoice Date and Terms controls.
- Updated CSV export columns to invoice-centric fields including DueDate and ServiceDate.
- Added invoice numbering starting at 1001 and incrementing once per exported customer.
- Started ICS2CSV entry-point fix after confirming `/ics2csv/` currently falls through to the homepage app.
- Added a path guard in the homepage entry HTML to redirect `/ics2csv/` requests to `/ics2csv/index.html`.
- Synced updated `public/ics2csv/app.js` and `public/ics2csv/styles.css` into `ics2qbo` for direct-file usage.
- Located new app source under `import/ics2csv` and confirmed it includes `ics-core.js` in addition to `index.html`, `styles.css`, and `app.js`.
- Replaced website-linked app files in `public/ics2csv` with the imported version files.

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
- Used an SVG favicon for a lightweight, theme-consistent icon.
- Adjusted day-of-year logic for Seasonal Abstracts only to preserve anchor list.
- Used CSS variables for per-flake opacity to keep initial state hidden.
- Kept the D&D Dice room canvas-based to match the legacy interaction model.
- Published the utility app as plain static files under `public/ics2csv` instead of adding a hash route.
- ICS2CSV changes should be made in `public/ics2csv` because that path is what the homepage serves directly.
- Invoice-level fields (number/date/terms/due date) are customer-scoped and reused for each selected service row under that customer.
- Keep `public/ics2csv` and `ics2qbo` synchronized when local file-based usage is still needed.
- For Vite dev fallback behavior, a small pre-bootstrap redirect in root `index.html` is the minimal fix to make `/ics2csv/` land on the utility app.
- Treat `public/ics2csv` as the canonical served target when replacing with newer external app drops.

Next:
