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

- `composables/*.js` contain **pure functions only — no Vue reactivity**. `usePortfolioSim.js` (Monte Carlo sim, seeded mulberry32 PRNG, named market scenarios), `useStockValuation.js` (P/E–P/DE valuation stats, DCF; config-object driven so adding a stock means a new config, not new math), `useProjectionChart.js` (Chart.js projection builder that updates charts in place to avoid flicker on live price ticks).
- `components/apps/*.vue` own the reactive state and call the composable functions from `computed()`. `StockAnalyzer.vue` (~2700 lines) and `CompoundCalculator.vue` are the two main apps; each has a thin wrapper page in `pages/apps/`.

Keep new simulation/valuation math in the composables, not in components, and keep it pure.

### Server API routes (server/api/)

Nitro routes exist to keep API secrets server-side:

- `finnhub/quote.get.ts` and `finnhub/metrics.get.ts` proxy Finnhub for live stock quotes, with an in-memory per-symbol cache (30 s TTL on quotes) and symbol-format validation. The Finnhub key lives in `runtimeConfig.finnhubApiKey` (server-only, never `public`).
- `cloudinary/folder/[folder].ts` lists a Cloudinary folder via the Admin API (basic auth from env vars) and returns normalized `{ resources }` objects with scaled + original URLs, consumed by `CloudinaryMasonryGallery.vue`.

### Content

Blog posts are markdown in `content/blog/`, rendered through `@nuxt/content` at `pages/blog/index.vue` and `pages/blog/[...slug].vue` with syntax highlighting (nord theme). Custom MDC components live in `components/content/` (e.g. `Callout.vue`).

### Images

Portfolio imagery is served from Cloudinary (`@nuxtjs/cloudinary`), not committed to the repo; galleries fetch image lists at runtime via the server route above.

## Environment variables

Required in `.env` (see `nuxt.config.ts` runtimeConfig): `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FINNHUB_API_KEY`, `NUXT_PUBLIC_FORMSPREE_ENDPOINT` (contact form). Only the Formspree endpoint is public; everything else must stay server-only.
