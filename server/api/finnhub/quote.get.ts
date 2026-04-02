/**
 * GET /api/finnhub/quote?symbols=NVDA,BX,AAPL
 * Proxies Finnhub REST quote calls server-side so the API key is never
 * exposed to the browser. Per-symbol cache TTL: 30 s.
 */

interface QuoteEntry { c: number; pc: number; ts: number }
const cache = new Map<string, QuoteEntry>()
const TTL_MS = 30_000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const key = config.finnhubApiKey as string
  if (!key) throw createError({ statusCode: 503, message: 'Finnhub key not configured' })

  const { symbols: raw } = getQuery(event)
  const symbols = String(raw ?? '')
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter(s => /^[A-Z0-9.\-]{1,16}$/.test(s))
    .slice(0, 60) // guard against abuse

  const now = Date.now()
  const stale = symbols.filter(t => {
    const e = cache.get(t)
    return !e || now - e.ts > TTL_MS
  })

  if (stale.length > 0) {
    await Promise.allSettled(
      stale.map(async (t) => {
        try {
          const res = await $fetch<{ c: number; pc: number }>(
            `https://finnhub.io/api/v1/quote?symbol=${t}&token=${key}`,
          )
          if (res?.c) {
            cache.set(t, { c: +res.c.toFixed(2), pc: +(res.pc ?? res.c).toFixed(2), ts: now })
          }
        } catch { /* single symbol failures are silent */ }
      }),
    )
  }

  const result: Record<string, { c: number; pc: number }> = {}
  symbols.forEach(t => {
    const e = cache.get(t)
    if (e) result[t] = { c: e.c, pc: e.pc }
  })
  return result
})
