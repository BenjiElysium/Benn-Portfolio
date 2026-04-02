/**
 * useStockValuation.js
 * Pure math helpers for the Stock Analyzer page.
 * No Vue reactivity — import functions and call them from computed() or render helpers.
 *
 * Designed to be extensible: accepts a config object so adding a third stock later
 * only requires a new config, not new math.
 *
 * @typedef ValuationConfig
 * @property {'PE'|'PDE'}          metric
 * @property {{date:string,value:number}[]} historicalData
 * @property {number|null}         historyCutoffYear   — null means no cutoff
 * @property {number|null}         buyZoneThreshold    — null means no threshold
 * @property {'two-phase'|'single-phase'} dcfType
 * @property {number}              terminalMultiplier  — e.g. 10 for NVDA, 20 for BX
 */

// ─── Historical stats ─────────────────────────────────────────────────────────

/**
 * Compute avg, sigma, ±1σ range, and buy-zone count from a numeric series.
 * @param {number[]} values
 * @param {{ buyZoneThreshold?: number|null }} [opts]
 * @returns {{ avg:number, sigma:number, low:number, high:number, belowBuyZone:number, n:number }}
 */
export function computeHistoricalStats(values, opts = {}) {
  const n = values.length
  if (n === 0) return { avg: 0, sigma: 0, low: 0, high: 0, belowBuyZone: 0, n: 0 }

  const avg = values.reduce((a, b) => a + b, 0) / n
  const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / n
  const sigma = Math.sqrt(variance)

  const threshold = opts.buyZoneThreshold ?? null
  const belowBuyZone = threshold !== null ? values.filter(v => v < threshold).length : 0

  return { avg, sigma, low: avg - sigma, high: avg + sigma, belowBuyZone, n }
}

/**
 * Filter a data array to only include entries on/after a cutoff year.
 * @param {{date?:string, label?:string, value:number}[]} data
 * @param {number|null} cutoffYear
 * @returns {typeof data}
 */
export function applyHistoryCutoff(data, cutoffYear) {
  if (!cutoffYear) return data
  return data.filter(d => {
    const src = d.date || d.label || ''
    const match = src.match(/\d{4}/)
    if (!match) return true
    return parseInt(match[0], 10) >= cutoffYear
  })
}

// ─── DCF models ───────────────────────────────────────────────────────────────

/**
 * Single-phase DCF (existing NVDA / BX model).
 * @param {{ baseMetric:number, g:number, d:number, terminalMultiplier:number }} p
 * @returns {number} intrinsic floor
 */
export function computeSinglePhaseDCF({ baseMetric, g, d, terminalMultiplier }) {
  let floor = 0
  let ann = baseMetric
  for (let y = 1; y <= 10; y++) {
    ann *= (1 + g)
    floor += ann / Math.pow(1 + d, y)
  }
  floor += ann * terminalMultiplier / Math.pow(1 + d, 10)
  return floor
}

/**
 * Two-phase DCF: high-growth phase (years 1–5) then deceleration (years 6–10).
 * Terminal value = year-10 earnings × terminalMultiplier, discounted back.
 *
 * @param {{ baseEPS:number, g5:number, h5:number, d:number, terminalMultiplier:number }} p
 * @returns {number} intrinsic floor
 */
export function computeTwoPhaseDCF({ baseEPS, g5, h5, d, terminalMultiplier }) {
  let floor = 0
  let ann = baseEPS
  for (let y = 1; y <= 5; y++) {
    ann *= (1 + g5)
    floor += ann / Math.pow(1 + d, y)
  }
  for (let y = 6; y <= 10; y++) {
    ann *= (1 + h5)
    floor += ann / Math.pow(1 + d, y)
  }
  floor += ann * terminalMultiplier / Math.pow(1 + d, 10)
  return floor
}

// ─── Finnhub metric-series extraction ────────────────────────────────────────

/**
 * Try to extract a quarterly P/E series from a Finnhub basic-financials response.
 * Returns an array of { label: string, value: number } ordered oldest → newest,
 * or null if the series is absent / insufficient.
 *
 * @param {object} metricsPayload  — raw Finnhub /stock/metric?metric=all response
 * @param {number} [minQuarters=8]
 * @param {number} [cutoffYear=2016]
 * @returns {{ label:string, value:number }[]|null}
 */
export function extractFinnhubPESeries(metricsPayload, minQuarters = 8, cutoffYear = 2016) {
  if (!metricsPayload?.series?.quarterly) return null

  // Finnhub uses a few different field names depending on plan tier
  const candidates = ['pe', 'peExclXorTTM', 'peNormalizedAnnual']
  let raw = null
  for (const field of candidates) {
    const arr = metricsPayload.series.quarterly[field]
    if (Array.isArray(arr) && arr.length > 0) { raw = arr; break }
  }
  if (!raw) return null

  // Filter by cutoff year, map to { label, value }
  const filtered = raw
    .filter(d => {
      if (!d?.period) return false
      const yr = parseInt(d.period.slice(0, 4), 10)
      return yr >= cutoffYear && d.v != null && isFinite(d.v) && d.v > 0
    })
    .map(d => ({ label: d.period, value: +d.v.toFixed(2) }))
    .sort((a, b) => a.label.localeCompare(b.label)) // oldest → newest

  return filtered.length >= minQuarters ? filtered : null
}
