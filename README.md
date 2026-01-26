# Personal Homepage V2

A Vite + React + Tailwind shell that hosts three fullscreen rooms: Sun Clock, Seasonal Abstracts, and Christmas Countdown. Hash routing is used for GitHub Pages compatibility.

## Routes

- Rooms (home): `/#/rooms`
- Sun Clock: `/#/sun`
- Seasonal Abstracts: `/#/seasonal`
- Christmas Countdown: `/#/christmas`

Visiting `/#/` will redirect to `/#/sun`.

## Legacy pages

Legacy v1 pages are preserved under `public/legacy/` and are served at:

- `/legacy/index.html`
- `/legacy/sun-clock.html`
- `/legacy/seasonal_backgrounds.html`
- `/legacy/christmas_countdown.html`

## Development

```bash
npm install
npm run dev
```

## Build + preview

```bash
npm run build
npm run preview
```

## Deployment (GitHub Pages)

The repo includes a GitHub Actions workflow that builds `dist/` and deploys to GitHub Pages on pushes to `main`.

1) In GitHub Settings → Pages, set Source to **GitHub Actions**.
2) Merge to `main` and push; the workflow will publish the site.

If you use a custom domain, keep the `CNAME` file at the repo root.
