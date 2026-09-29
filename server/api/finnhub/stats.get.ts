/**
 * GET /api/finnhub/stats?symbols=NVDA,IGM,TSM
 * Daily reference stats for the watchlist: market cap, 3-month average
 * volume and the 52-week range, from Finnhub basic-financials + profile.
 *
 * Returns { stats: { SYMBOL: { mcap, avgVol, hi52, lo52 } }, pending: [...] }
 *   mcap    USD millions (null for ETFs — Finnhub doesn't report one)
 *   avgVol  shares, millions
 * Finnhub reports some foreign listings (TSM, ASML, SK hynix) in their home
 * currency; those figures would sit next to a USD price, so they're nulled.
 * `pending` lists symbols skipped after a rate limit — ask again later.
 *
 * Cache TTL: 24 h in memory; the CDN keeps complete answers for an hour.
 */

interface Stats { mcap: number | null; avgVol: number | null; hi52: number | null; lo52: number | null }
const cache = new Map<string, { data: Stats; ts: number }>()
const TTL_MS = 24 * 60 * 60 * 1000

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null)

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const key = config.finnhubApiKey as string
  if (!key) throw createError({ statusCode: 503, message: 'Finnhub key not configured' })

  const symbols = parseSymbols(getQuery(event).symbols)
  const now = Date.now()
  const stale = symbols.filter(t => {
    const e = cache.get(t)
    return !e || now - e.ts > TTL_MS
  })

  await mapLimited(stale, 4, async (t) => {
    const s = encodeURIComponent(t)
    // Only a rate limit is worth retrying; any other failure caches as "no data".
    const get = (path: string) => $fetch<any>(`https://finnhub.io/api/v1/${path}&token=${key}`)
      .catch((err) => { if (isRateLimited(err)) throw err; return null })
    const [metric, profile] = await Promise.all([
      get(`stock/metric?symbol=${s}&metric=all`),
      get(`stock/profile2?symbol=${s}`),
    ])
    const m = metric?.metric ?? {}
    // ETFs come back with an empty profile; their metrics are USD.
    const foreign = typeof profile?.currency === 'string' && profile.currency !== 'USD'
    cache.set(t, {
      ts: now,
      data: foreign
        ? { mcap: null, avgVol: null, hi52: null, lo52: null }
        : {
            mcap: num(m.marketCapitalization),
            avgVol: num(m['3MonthAverageTradingVolume']),
            hi52: num(m['52WeekHigh']),
            lo52: num(m['52WeekLow']),
          },
    })
  })

  const stats: Record<string, Stats> = {}
  const pending: string[] = []
  symbols.forEach(t => {
    const e = cache.get(t)
    if (e) stats[t] = e.data
    else pending.push(t)
  })
  setResponseHeader(event, 'Cache-Control', pending.length
    ? 'no-store'
    : 'public, s-maxage=3600, stale-while-revalidate=86400')
  return { stats, pending }
})
