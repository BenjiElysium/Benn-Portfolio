/**
 * Shared helpers for the Finnhub proxy routes (auto-imported by Nitro).
 *
 * Finnhub's free tier allows 60 calls/min and 30 calls/s. A 40-ticker
 * watchlist is one call per symbol, so fan-out is capped and a 429 stops the
 * batch — the caller returns what it has and the client asks again later.
 */

export const FINNHUB_SYMBOL = /^[A-Z0-9.\-]{1,16}$/

export function parseSymbols(raw: unknown, max = 60): string[] {
  return [...new Set(
    String(raw ?? '')
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(s => FINNHUB_SYMBOL.test(s)),
  )].slice(0, max)
}

export const isRateLimited = (err: any) => (err?.statusCode ?? err?.response?.status) === 429

/**
 * Run `fn` over `items`, at most `limit` at a time. Once `fn` throws a
 * rate-limit error, items not yet started are skipped.
 */
export async function mapLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
  let next = 0
  let limited = false
  async function worker() {
    while (!limited && next < items.length) {
      const item = items[next++]
      try { await fn(item) }
      catch (err) { if (isRateLimited(err)) limited = true }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return { limited }
}
