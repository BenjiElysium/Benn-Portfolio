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

// ─── Price-gated verdict with hysteresis ─────────────────────────────────────

// Dead band around each conviction boundary, in multiple units. Once a signal
// is set, the value must clear the boundary by this margin before it flips.
export const CONVICTION_HYSTERESIS = 0.25

const SIGNAL_COLORS = {
  'EXTREME BUY': 'emerald',
  'STRONG BUY': 'emerald',
  'BUY': 'green',
  'HOLD / FAIR': 'yellow',
  'RICH': 'red',
}

/**
 * Resolve a signal index on an ascending-boundary ladder with hysteresis.
 * signals.length === bounds.length + 1; value below bounds[i] → signals[i].
 * Moving to a STRONGER signal (lower index) requires value < bound − margin;
 * moving WEAKER requires value > bound + margin. Without a prior, raw wins.
 */
function resolveWithHysteresis(value, signals, bounds, prior, h) {
  let raw = signals.length - 1
  for (let i = 0; i < bounds.length; i++) { if (value < bounds[i]) { raw = i; break } }
  const p = prior != null ? signals.indexOf(prior) : -1
  if (p < 0 || raw === p) return p < 0 ? raw : p
  if (raw < p) {
    let s = signals.length - 1
    for (let i = 0; i < bounds.length; i++) { if (value < bounds[i] - h) { s = i; break } }
    return s < p ? s : p
  }
  let w = 0
  for (let i = bounds.length - 1; i >= 0; i--) { if (value > bounds[i] + h) { w = i + 1; break } }
  return w > p ? w : p
}

/**
 * Boundary-collision-safe label. When the value sits within 0.1 of the nearest
 * boundary, rounded values collide and comparative phrasing contradicts itself
 * ("39.0× below 39.0×") — render "at {boundary}" with two decimals instead.
 */
function bandLabel(metric, value, bounds, names, standardPhrase) {
  let nearest = -1, gap = Infinity
  for (let i = 0; i < bounds.length; i++) {
    const d = Math.abs(value - bounds[i])
    if (Number.isFinite(bounds[i]) && d < gap) { gap = d; nearest = i }
  }
  if (nearest >= 0 && gap < 0.1) {
    return `${metric} ${value.toFixed(2)}× — at ${names[nearest]} (${bounds[nearest].toFixed(2)}×)`
  }
  return `${metric} ${value.toFixed(1)}× — ${standardPhrase}`
}

/**
 * Compute a buy/sell/hold verdict. Two modes:
 *
 * P/E band mode — `{ pe, low, avg?, high?, sigma?, prior?, hysteresis? }`:
 * conviction ladder from historical stats (EXTREME BUY < low−σ < STRONG BUY
 * < low < BUY < avg < HOLD / FAIR < high < RICH), with hysteresis against
 * `prior` and a collision-safe label.
 *
 * P/DE mode (price-gated) — `{ priceState, price, dePerShare?, buyZone?,
 * fairLow?, fairHigh?, prior? }`: returns null unless priceState ===
 * 'resolved' AND price is a positive finite number — a config fallback price
 * must never produce a verdict. Threshold defaults mirror the BX historical
 * P/DE analysis (buy zone < 20×, fair range 22–29×).
 *
 * @returns {{ signal:string, color:string, label:string, pde?:number }|null}
 */
export function getVerdict(args) {
  const h = args.hysteresis ?? CONVICTION_HYSTERESIS

  if (args.pe !== undefined) {
    const { pe, low, avg, high, sigma, prior } = args
    const levels = []
    if (low != null && sigma != null) levels.push({ sig: 'EXTREME BUY', upper: low - sigma, name: 'the extreme-buy threshold' })
    if (low != null) levels.push({ sig: 'STRONG BUY', upper: low, name: 'the low end of the normal range' })
    if (avg != null) levels.push({ sig: 'BUY', upper: avg, name: 'the historical avg' })
    if (high != null) levels.push({ sig: 'HOLD / FAIR', upper: high, name: 'the high end of the normal range' })
    const ORDER = ['EXTREME BUY', 'STRONG BUY', 'BUY', 'HOLD / FAIR', 'RICH']
    const terminal = levels.length ? ORDER[ORDER.indexOf(levels[levels.length - 1].sig) + 1] : 'HOLD / FAIR'
    const signals = [...levels.map(l => l.sig), terminal]
    const bounds = levels.map(l => l.upper)
    const names = levels.map(l => l.name)

    const idx = resolveWithHysteresis(pe, signals, bounds, prior, h)
    const signal = signals[idx]
    const standard = {
      'EXTREME BUY': avg != null ? `far below the historical avg (${avg.toFixed(1)}×)` : `below the extreme-buy threshold (${(low - sigma).toFixed(1)}×)`,
      'STRONG BUY': `below the normal low end (${low?.toFixed(1)}×)`,
      'BUY': avg != null ? `below the historical avg (${avg.toFixed(1)}×)` : `above the normal low end (${low?.toFixed(1)}×)`,
      'HOLD / FAIR': `within the normal range (${low?.toFixed(1)}–${high?.toFixed(1)}×)`,
      'RICH': `above the +1σ ceiling (${high?.toFixed(1)}×)`,
    }[signal]
    return { signal, color: SIGNAL_COLORS[signal], label: bandLabel('P/E', pe, bounds, names, standard) }
  }

  const { priceState, price, dePerShare = 5.84, buyZone = 20, fairLow = 22, fairHigh = 29, prior } = args
  if (priceState !== 'resolved') return null
  if (!Number.isFinite(price) || price <= 0) return null
  const pde = +(price / dePerShare).toFixed(2)
  const signals = ['STRONG BUY', 'BUY', 'HOLD / FAIR', 'RICH']
  const bounds = [buyZone, fairLow, fairHigh]
  const names = ['the buy-zone threshold', 'the fair-range floor', 'the fair-range ceiling']
  const idx = resolveWithHysteresis(pde, signals, bounds, prior, h)
  const signal = signals[idx]
  const standard = {
    'STRONG BUY': `inside the historical buy zone (< ${buyZone}×)`,
    'BUY': `below the ${fairLow}× fair-range floor`,
    'HOLD / FAIR': `within the ${fairLow}–${fairHigh}× fair range`,
    'RICH': `above the ${fairHigh}× fair-range ceiling`,
  }[signal]
  return { signal, color: SIGNAL_COLORS[signal], label: bandLabel('P/DE', pde, bounds, names, standard), pde }
}

// ─── Historical stats ─────────────────────────────────────────────────────────

/**
 * Compute mean, sigma, ±1σ range, and buy-zone count from a numeric series.
 * Sigma is the SAMPLE standard deviation (n − 1 divisor) to match the
 * source analysis — not the population form.
 * @param {number[]} values
 * @param {{ buyZoneThreshold?: number|null }} [opts]
 * @returns {{ avg:number, mean:number, sigma:number, low:number, high:number, belowBuyZone:number, n:number }}
 */
export function computeHistoricalStats(values, opts = {}) {
  const n = values.length
  if (n === 0) return { avg: 0, mean: 0, sigma: 0, low: 0, high: 0, belowBuyZone: 0, n: 0 }

  const avg = values.reduce((a, b) => a + b, 0) / n
  const variance = n > 1
    ? values.reduce((a, b) => a + (b - avg) ** 2, 0) / (n - 1)
    : 0
  const sigma = Math.sqrt(variance)

  const threshold = opts.buyZoneThreshold ?? null
  const belowBuyZone = threshold !== null ? values.filter(v => v < threshold).length : 0

  return { avg, mean: avg, sigma, low: avg - sigma, high: avg + sigma, belowBuyZone, n }
}

/**
 * Least-squares linear trend over a chronological series, x = 1..n.
 * Returns slope, intercept, and at(x) for extrapolation (e.g. at(12) is
 * four quarters past an 8-quarter series).
 * @param {number[]} values — chronological (oldest first)
 * @returns {{ slope:number, intercept:number, n:number, at:(x:number)=>number }}
 */
export function computeLinearTrend(values) {
  const n = values.length
  if (n < 2) {
    const flat = values[0] ?? 0
    return { slope: 0, intercept: flat, n, at: () => flat }
  }
  const xMean = (n + 1) / 2
  const yMean = values.reduce((a, b) => a + b, 0) / n
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) {
    const dx = (i + 1) - xMean
    sxy += dx * (values[i] - yMean)
    sxx += dx * dx
  }
  const slope = sxy / sxx
  const intercept = yMean - slope * xMean
  return { slope, intercept, n, at: x => intercept + slope * x }
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
