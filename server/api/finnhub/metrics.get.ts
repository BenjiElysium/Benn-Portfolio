/**
 * GET /api/finnhub/metrics?symbol=NVDA
 * Proxies Finnhub basic-financials (metric=all) server-side.
 * Cache TTL: 24 h — historical series don't change intraday.
 */

interface CacheEntry { data: unknown; ts: number }
const cache = new Map<string, CacheEntry>()
const TTL_MS = 24 * 60 * 60 * 1000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const key = config.finnhubApiKey as string
  if (!key) throw createError({ statusCode: 503, message: 'Finnhub key not configured' })

  const { symbol: raw } = getQuery(event)
  const symbol = String(raw ?? '').trim().toUpperCase()
  if (!symbol || !/^[A-Z0-9.\-]{1,16}$/.test(symbol)) {
    throw createError({ statusCode: 400, message: 'Valid symbol required' })
  }

  const now = Date.now()
  const entry = cache.get(symbol)
  if (entry && now - entry.ts < TTL_MS) return entry.data

  const data = await $fetch(
    `https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${key}`,
  )
  cache.set(symbol, { data, ts: now })
  return data
})
