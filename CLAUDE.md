# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # dev server on http://localhost:3000
npm run build     # production build
npm run generate  # static generation
npm run preview   # preview production build locally
```

There is no test suite or linter configured.

## What this is

Philip Benn's personal portfolio site: Nuxt 3 + Vue 3 + Tailwind, deployed on Vercel. Dark-theme-only design (`bg-dark-bg` = `#09090b`, Poppins font). Content spans portfolio galleries (CGI/GenAI/Motion), a markdown blog, and interactive finance apps.

## Architecture

### Two layout modes (app.vue)

`app.vue` branches on the route: paths under `/apps/` get a fullscreen `h-screen overflow-hidden` shell (no footer, no page-transition motion) because the finance apps manage their own internal scrolling. All other pages get the standard `max-w-7xl` container with a `@vueuse/motion` fade-in and `SiteFooter`.

### Interactive apps: pure math in composables, reactivity in components

The finance apps follow a deliberate split:

- `composables/*.js` contain **pure functions only — no Vue reactivity**. `usePortfolioSim.js` (Monte Carlo sim, seeded mulberry32 PRNG, named market scenarios), `useStockValuation.js` (P/E–P/DE valuation stats, staged DCF with an Rx fade and optional perpetuity; config-object driven so adding a stock means a new config, not new math — per-ticker inputs, sources and CAPM betas live in `config/tickerConfig.mjs`), `useProjectionChart.js` (Chart.js projection builder that updates charts in place to avoid flicker on live price ticks), `useAiComplex.js` (lead-time lane layout, readings chart scales, status/staleness logic for the AI Complex board), `useWatchlist.js` (Stock Analyzer watchlist grouping and formatting; the default Stocks/ETFs list is `config/watchlist.mjs`).
- `components/apps/*.vue` own the reactive state and call the composable functions from `computed()`. `StockAnalyzer.vue` (~3500 lines), `CompoundCalculator.vue` and `AiComplex.vue` are the main apps; each has a thin wrapper page in `pages/apps/`. AI Complex charts are hand-rolled SVG laid out in real pixels (ResizeObserver), not Chart.js.

Keep new simulation/valuation math in the composables, not in components, and keep it pure.

### Server API routes (server/api/)

Nitro routes exist to keep API secrets server-side:

- `finnhub/quote.get.ts` (price, previous close, day open/high/low; 30 s TTL), `finnhub/stats.get.ts` (market cap, 3-month avg volume, 52-week range; 24 h TTL) and `finnhub/metrics.get.ts` proxy Finnhub with in-memory per-symbol caches, CDN `Cache-Control` headers and symbol-format validation (`server/utils/finnhub.ts`). The free tier allows 60 calls/min and every symbol is one call, so fan-out is capped, a 429 stops the batch (stats returns the skipped symbols as `pending` for the client to retry), and the ~40-ticker watchlist only polls while its tab is open, every other tick. Stats are nulled for listings Finnhub reports in a non-USD currency. The Finnhub key lives in `runtimeConfig.finnhubApiKey` (server-only, never `public`).
- `ai-complex/signals.get.ts` reads the "AI Complex" Signals + Readings databases from Notion (read-only integration, `runtimeConfig.notionApiKey`, 10 min cache, serves stale on failure). **Publishing is opt-in:** only signals with the `Public` checkbox ticked and a `Public Label` set are returned (a `Tier` select — Key / Standard / Context — sets editorial weight: dot size on the board, card size in the grid), and the response is an explicit field allowlist — Notes, value prose, source notes, working titles and Notion IDs must never be added to it. The underlying tracker is personal research; treat anything outside the allowlist as private.
- `cloudinary/folder/[folder].ts` lists a Cloudinary folder via the Admin API (basic auth from env vars) and returns normalized `{ resources }` objects with scaled + original URLs, consumed by `CloudinaryMasonryGallery.vue`.

### Content

Blog posts are markdown in `content/blog/`, rendered through `@nuxt/content` at `pages/blog/index.vue` and `pages/blog/[...slug].vue` with syntax highlighting (nord theme). Custom MDC components live in `components/content/` (e.g. `Callout.vue`).

### Images

Portfolio imagery is served from Cloudinary (`@nuxtjs/cloudinary`), not committed to the repo; galleries fetch image lists at runtime via the server route above. `NorthlineCard.vue` (featured on the LP, Apps and Projects pages) uses Northline persona portraits mirrored to Cloudinary under `Northline/personas/`, and carries Northline's own brand (Newsreader serif via `font-serif`, orange accent) rather than the site's indigo.

## Environment variables

Required in `.env` (see `nuxt.config.ts` runtimeConfig): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FINNHUB_API_KEY`, `NOTION_API_KEY` (read-only Notion integration shared with only the two AI Complex databases), `NUXT_PUBLIC_FORMSPREE_ENDPOINT` (contact form). Only the Formspree endpoint is public; everything else must stay server-only.
