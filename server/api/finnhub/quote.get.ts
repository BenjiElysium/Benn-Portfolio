/**
 * GET /api/finnhub/quote?symbols=NVDA,BX,AAPL
 * Proxies Finnhub REST quote calls server-side so the API key is never
 * exposed to the browser. Per-symbol cache TTL: 30 s, plus a 30 s CDN cache
 * so visitors polling the same list share one upstream fetch.
 *
 * Returns { SYMBOL: { c, pc, o, h, l } } — current, previous close, and the
 * day's open / high / low. Symbols Finnhub didn't answer are omitted.
 */

interface QuoteEntry { c: number; pc: number; o: number | null; h: number | null; l: number | null; ts: number }
const cache = new Map<string, QuoteEntry>()
const TTL_MS = 30_000

const round = (v: unknown) => (typeof v === 'number' && v > 0 ? +v.toFixed(2) : null)

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

  await mapLimited(stale, 8, async (t) => {
    const res = await $fetch<Record<string, number>>(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(t)}&token=${key}`,
    )
    if (res?.c) {
      cache.set(t, { c: +res.c.toFixed(2), pc: +(res.pc || res.c).toFixed(2), o: round(res.o), h: round(res.h), l: round(res.l), ts: now })
    }
  })

  const result: Record<string, Omit<QuoteEntry, 'ts'>> = {}
  symbols.forEach(t => {
    const e = cache.get(t)
    if (e) result[t] = { c: e.c, pc: e.pc, o: e.o, h: e.h, l: e.l }
  })
  setResponseHeader(event, 'Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30')
  return result
})
