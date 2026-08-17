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

// ─── Price-gated verdict ─────────────────────────────────────────────────────

/**
 * Compute a buy/sell/hold verdict from a live price, gated on price resolution.
 * Returns null unless priceState === 'resolved' AND price is a positive finite
 * number — a config fallback price must never produce a verdict.
 * Threshold defaults mirror the BX historical P/DE analysis
 * (buy zone < 20×, fair range 22–29×, LTM Q1 2026 DE/share $5.84).
 *
 * @param {{ priceState:'pending'|'resolved'|'error', price:number,
 *           dePerShare?:number, buyZone?:number, fairLow?:number, fairHigh?:number }} args
 * @returns {{ signal:string, color:string, pde:number }|null}
 */
export function getVerdict({ priceState, price, dePerShare = 5.84, buyZone = 20, fairLow = 22, fairHigh = 29 }) {
  if (priceState !== 'resolved') return null
  if (!Number.isFinite(price) || price <= 0) return null
  const pde = +(price / dePerShare).toFixed(2)
  if (pde < buyZone)  return { signal: 'STRONG BUY', color: 'emerald', pde }
  if (pde < fairLow)  return { signal: 'BUY', color: 'green', pde }
  if (pde <= fairHigh) return { signal: 'HOLD / FAIR', color: 'yellow', pde }
  return { signal: 'RICH', color: 'red', pde }
}

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
 * Staged DCF with configurable growth phases and Rx-derived terminal multiple.
 *
 * @param {{
 *   baseValue: number,           — starting value (if no seeds)
 *   seedValues?: number[],       — analyst consensus years (e.g., [8.98, 12.79])
 *   growthStages: {years:number, rate:number}[], — phases after seeds
 *   terminal: {growth:number, years:number},    — terminal growth rate and projection years
 *   discountRate: number         — d (e.g., 0.1556 = 15.56%)
 * }} p
 * @returns {{
 *   valuePath: number[],         — projection years 1..N
 *   pvPath: number[],            — present values year by year
 *   Rx: number,                  — (1 + g_terminal) / (1 + d)
 *   mult: number,                — Rx-derived terminal multiple
 *   terminalNumerator: number,   — V[N] * mult (terminal value at year N)
 *   pvTerminal: number,          — PV of terminal numerator
 *   intrinsic: number            — sum(PV(V)) + PV(terminal)
 *   terminalDiverges: boolean    — true if terminal growth >= discount rate (value grows unbounded)
 *   terminalAsPercentOfIntrinsic: number — terminal value as % of total intrinsic
 * }}
 */
export function computeStagedDCF({
  baseValue,
  seedValues,
  growthStages,
  terminal,
  discountRate,
}) {
  const d = discountRate
  const valuePath = []
  const pvPath = []

  // Start with seeds or baseValue
  let current = baseValue
  let yearIndex = 1

  // Seed years (analyst consensus)
  if (seedValues && seedValues.length > 0) {
    for (const seed of seedValues) {
      valuePath.push(seed)
      const pv = seed / Math.pow(1 + d, yearIndex)
      pvPath.push(pv)
      current = seed
      yearIndex++
    }
  }

  // Growth stages (derived years)
  for (const stage of growthStages) {
    for (let i = 0; i < stage.years; i++) {
      current *= (1 + stage.rate)
      valuePath.push(current)
      const pv = current / Math.pow(1 + d, yearIndex)
      pvPath.push(pv)
      yearIndex++
    }
  }

  // Terminal: Rx method
  // Rx = (1 + g_terminal) / (1 + d)
  // mult = Rx * ((Rx^years - 1) / (Rx - 1))
  // This is the PV factor for an annuity growing at g_terminal
  const g_t = terminal.growth
  const t_years = terminal.years
  const Rx = (1 + g_t) / (1 + d)

  // Check if terminal growth >= discount rate (divergence)
  const terminalDiverges = g_t >= d

  let mult
  if (Math.abs(Rx - 1) < 1e-10) {
    // Degenerate case: Rx ≈ 1
    mult = t_years
  } else {
    mult = Rx * ((Math.pow(Rx, t_years) - 1) / (Rx - 1))
  }

  const terminalNumerator = current * mult
  const pvTerminal = terminalNumerator / Math.pow(1 + d, yearIndex - 1)

  const intrinsic = pvPath.reduce((a, b) => a + b, 0) + pvTerminal
  const terminalAsPercentOfIntrinsic = intrinsic > 0 ? pvTerminal / intrinsic : 0

  return {
    valuePath,
    pvPath,
    Rx,
    mult,
    terminalNumerator,
    pvTerminal,
    intrinsic,
    terminalDiverges,
    terminalAsPercentOfIntrinsic,
  }
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
