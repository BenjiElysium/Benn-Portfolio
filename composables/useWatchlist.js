// Pure helpers for the Stock Analyzer watchlist table — no Vue reactivity.
import { WATCHLIST_STOCKS, WATCHLIST_ETFS } from '~/config/watchlist.mjs'

const NAMES = new Map([...WATCHLIST_STOCKS, ...WATCHLIST_ETFS].map(e => [e.t, e.name]))
const STOCKS = new Set(WATCHLIST_STOCKS.map(e => e.t))
const ETFS = new Set(WATCHLIST_ETFS.map(e => e.t))

export const nameOf = t => NAMES.get(t) ?? ''

/**
 * Split a flat ticker list into the table's sections, keeping list order.
 * Empty sections are dropped. Tickers outside the defaults land in "Added".
 */
export function groupWatchlist(rows) {
  const groups = [
    { key: 'stocks', label: 'Stocks', rows: [] },
    { key: 'etfs', label: 'ETFs', rows: [] },
    { key: 'added', label: 'Added', rows: [] },
  ]
  for (const r of rows) {
    const g = STOCKS.has(r.ticker) ? groups[0] : ETFS.has(r.ticker) ? groups[1] : groups[2]
    g.rows.push(r)
  }
  return groups.filter(g => g.rows.length)
}

/** 1825.39 → "$1,825.39" */
export const usd = n => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** 4191709 (millions) → "4.19T"; 406.6 → "406.60M"; 0.4066 → "406.60K" */
export function compactFromMillions(m) {
  if (!Number.isFinite(m) || m <= 0) return null
  const v = m * 1e6
  const [div, suf] = v >= 1e12 ? [1e12, 'T'] : v >= 1e9 ? [1e9, 'B'] : v >= 1e6 ? [1e6, 'M'] : [1e3, 'K']
  return (v / div).toFixed(2) + suf
}

/**
 * Where `price` sits in its 52-week range, 0–1 (clamped — a fresh high or low
 * can run ahead of the daily stats). Null when the range isn't usable.
 */
export function rangePosition(price, lo, hi) {
  if (!(price > 0) || !(lo > 0) || !(hi > lo)) return null
  return Math.min(1, Math.max(0, (price - lo) / (hi - lo)))
}
