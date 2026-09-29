// composables/useAiComplex.js
// Pure functions for the AI Complex signal board — no Vue reactivity.
// Input is the public payload from /api/ai-complex/signals.

// ── Status & direction vocab ───────────────────────────────────
// Status colors are the fixed status palette. Green↔red fails CVD separation,
// so every status also carries a distinct shape and a text label.
export const STATUS = {
  Green:             { key: 'green', label: 'Holding',   color: '#0ca30c', shape: 'circle' },
  Amber:             { key: 'amber', label: 'Watch',     color: '#fab219', shape: 'diamond' },
  Red:               { key: 'red',   label: 'Breach',    color: '#d03b3b', shape: 'square' },
  'Not yet tracked': { key: 'none',  label: 'Untracked', color: '#71717a', shape: 'ring' },
}
export const statusOf = s => STATUS[s] ?? STATUS['Not yet tracked']

export const DIRECTION = {
  Improving:      { glyph: '↑', label: 'Improving' },
  Stable:         { glyph: '→', label: 'Stable' },
  Deteriorating:  { glyph: '↓', label: 'Deteriorating' },
  'Not yet read': { glyph: '·', label: 'Not yet read' },
}
export const directionOf = d => DIRECTION[d] ?? DIRECTION['Not yet read']

// Categorical series slots (dark steps), validated all-pairs on the card surface.
export const SERIES_COLORS = ['#3987e5', '#d95926', '#199e70']

// How long a reading stays current, by the signal's cadence.
const FRESH_DAYS = { Daily: 7, Weekly: 21, Monthly: 60, Quarterly: 150, Annual: 400 }

// ── Formatting ─────────────────────────────────────────────────
// Notion's "% change" option is used for plain percentage levels too.
export function unitSuffix(unit) {
  if (!unit) return ''
  if (unit === '% change') return '%'
  if (unit === 'x (multiple)' || unit === 'ratio') return 'x'
  if (unit === '$/GW ($B)') return 'B/GW'
  return unit
}

export function formatValue(v, unit) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  const n = Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)
  const clean = n.replace(/\.0+$|(\.\d*[1-9])0+$/, '$1')
  switch (unit) {
    case 'USD': return `$${clean}`
    case '$B': return `$${clean}B`
    case '$/GW ($B)': return `$${clean}B/GW`
    case 'bp': return `${clean}bp`
    case 'GW': return `${clean} GW`
    case '% change': return `${clean}%`
    case 'ratio':
    case 'x (multiple)': return `${clean}x`
    default: return clean
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export function formatDate(iso, { short = false } = {}) {
  const [y, m, d] = iso.split('-').map(Number)
  return short ? `${MONTHS[m - 1]} ’${String(y).slice(2)}` : `${MONTHS[m - 1]} ${d}, ${y}`
}

export function leadLabel(months) {
  if (months === null || months === undefined) return 'Lead time unknown'
  if (months === 0) return 'Confirming · in reported revenue'
  return `Leads NVDA revenue by ~${months} mo`
}

// ── Board-level summaries ──────────────────────────────────────
export function statusCounts(signals) {
  const counts = { Green: 0, Amber: 0, Red: 0, 'Not yet tracked': 0 }
  for (const s of signals) counts[STATUS[s.status] ? s.status : 'Not yet tracked']++
  return counts
}

// Categories holding amber/red signals, most-flagged first — drives the summary line.
export function pressureCategories(signals) {
  const tally = new Map()
  for (const s of signals) {
    if (s.status !== 'Amber' && s.status !== 'Red') continue
    tally.set(s.category, (tally.get(s.category) ?? 0) + 1)
  }
  return [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([c]) => c)
}

export const actualReadings = s => s.readings.filter(r => !r.guidance)

// A signal's charted series (e.g. Anthropic + OpenAI run-rates); >1 means no
// single reading can stand in as the headline.
export function seriesCount(signal) {
  return new Set(signal.readings.filter(r => r.unit !== 'count').map(r => `${r.unit}|${r.series}`)).size
}

export function latestReading(signal) {
  const actual = actualReadings(signal)
  return actual.length ? actual[actual.length - 1] : null
}

export function latestDate(signals) {
  let max = null
  for (const s of signals) {
    const r = latestReading(s)
    if (r && (!max || r.date > max)) max = r.date
  }
  return max
}

export function daysBetween(isoA, isoB) {
  return Math.round((Date.parse(isoB) - Date.parse(isoA)) / 86_400_000)
}

// Stale = last actual reading is older than the signal's own cadence allows.
export function staleness(signal, todayIso) {
  const r = latestReading(signal)
  if (!r) return { stale: false, days: null }
  const days = daysBetween(r.date, todayIso)
  const limit = FRESH_DAYS[signal.frequency]
  return { stale: limit !== undefined && days > limit, days }
}

// ── Lead-time lanes ────────────────────────────────────────────
// One lane per category, ordered upstream → downstream by average lead, so the
// board reads left-to-right as the order signals arrive before chip revenue.
// `labelBand` reserves space above each lane's dots for its label (narrow screens).
export function laneLayout(signals, { width, laneHeight = 48, labelBand = 0, margin = { top: 12, right: 24, bottom: 40, left: 168 } }) {
  const groups = new Map()
  for (const s of signals) {
    if (!groups.has(s.category)) groups.set(s.category, [])
    groups.get(s.category).push(s)
  }
  const avgLead = list => list.reduce((a, s) => a + (s.leadMonths ?? 0), 0) / list.length
  const lanes = [...groups.entries()]
    .map(([category, list]) => ({ category, list, avg: avgLead(list) }))
    .sort((a, b) => b.avg - a.avg || a.category.localeCompare(b.category))

  const maxLead = Math.max(24, ...signals.map(s => s.leadMonths ?? 0))
  const plotW = Math.max(120, width - margin.left - margin.right)
  const x = lead => margin.left + (1 - (lead ?? 0) / maxLead) * plotW

  const dots = []
  lanes.forEach((lane, i) => {
    const top = margin.top + i * laneHeight
    const cy = top + labelBand + (laneHeight - labelBand) / 2
    // Signals sharing a lead in one lane fan out vertically instead of overlapping.
    const byX = new Map()
    for (const s of [...lane.list].sort((a, b) => (b.leadMonths ?? 0) - (a.leadMonths ?? 0))) {
      const key = Math.round(x(s.leadMonths) / 14)
      const n = byX.get(key) ?? 0
      byX.set(key, n + 1)
      const offset = n === 0 ? 0 : (n % 2 ? -1 : 1) * Math.ceil(n / 2) * 13
      dots.push({ signal: s, cx: x(s.leadMonths), cy: cy + offset, lane: i })
    }
    lane.y = cy
    lane.top = top
  })

  const ticks = [24, 18, 12, 9, 6, 3, 0].filter(t => t <= maxLead).map(t => ({ value: t, x: x(t) }))
  const height = margin.top + lanes.length * laneHeight + margin.bottom
  return { lanes, dots, ticks, height, margin, plotRight: margin.left + plotW }
}

// SVG path for a status shape centered at (cx, cy) with radius r.
export function shapePath(shape, cx, cy, r) {
  if (shape === 'diamond') {
    const d = r * 1.3
    return `M${cx},${cy - d}L${cx + d},${cy}L${cx},${cy + d}L${cx - d},${cy}Z`
  }
  if (shape === 'square') {
    const s = r * 0.9
    return `M${cx - s},${cy - s}h${2 * s}v${2 * s}h${-2 * s}Z`
  }
  // circle / ring
  return `M${cx - r},${cy}a${r},${r} 0 1,0 ${2 * r},0a${r},${r} 0 1,0 ${-2 * r},0`
}

// ── Readings charts ────────────────────────────────────────────
// Readings of one signal split into charts by unit (never two scales on one
// plot); within a chart, one line per series. 'count' readings are
// qualitative (e.g. "No cuts") and render as notes, not points.
export function readingGroups(signal) {
  const byUnit = new Map()
  const notes = []
  for (const r of signal.readings) {
    if (r.unit === 'count') { notes.push(r); continue }
    if (!byUnit.has(r.unit)) byUnit.set(r.unit, new Map())
    const series = byUnit.get(r.unit)
    if (!series.has(r.series)) series.set(r.series, [])
    series.get(r.series).push(r)
  }
  const groups = [...byUnit.entries()].map(([unit, series]) => ({
    unit,
    // Thresholds are defined in the signal's chart unit only.
    thresholds: unit === signal.unit ? thresholdsOf(signal) : [],
    series: [...series.entries()].map(([name, points], i) => ({ name, points, color: SERIES_COLORS[i % SERIES_COLORS.length] })),
  }))
  // Largest group first so the headline series leads.
  groups.sort((a, b) => b.series.reduce((n, s) => n + s.points.length, 0) - a.series.reduce((n, s) => n + s.points.length, 0))
  return { groups, notes }
}

export function thresholdsOf(signal) {
  const out = []
  if (signal.amberLevel !== null && signal.amberLevel !== undefined) out.push({ level: 'Amber', value: signal.amberLevel, color: STATUS.Amber.color })
  if (signal.redLevel !== null && signal.redLevel !== undefined) out.push({ level: 'Red', value: signal.redLevel, color: STATUS.Red.color })
  return out
}

export function niceTicks(min, max, count = 4) {
  if (min === max) { const pad = Math.abs(min) * 0.1 || 1; min -= pad; max += pad }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(+v.toFixed(10))
  return { ticks, lo, hi }
}

export function readingChartModel(group, { width, height = 168, margin = { top: 14, right: 64, bottom: 26, left: 44 } }) {
  const points = group.series.flatMap(s => s.points)
  const values = [...points.map(p => p.value), ...group.thresholds.map(t => t.value)]
  const zeroBased = values.every(v => v >= 0) && Math.min(...values) < Math.max(...values) * 0.35
  const { ticks, lo, hi } = niceTicks(zeroBased ? 0 : Math.min(...values), Math.max(...values))

  const times = points.map(p => Date.parse(p.date))
  let t0 = Math.min(...times)
  let t1 = Math.max(...times)
  if (t0 === t1) { t0 -= 45 * 86_400_000; t1 += 45 * 86_400_000 } // single date: center it

  const plotW = Math.max(60, width - margin.left - margin.right)
  const plotH = height - margin.top - margin.bottom
  const x = iso => margin.left + ((Date.parse(iso) - t0) / (t1 - t0)) * plotW
  const y = v => margin.top + (1 - (v - lo) / (hi - lo)) * plotH

  const series = group.series.map(s => {
    const pts = s.points.map(p => ({ ...p, cx: x(p.date), cy: y(p.value) }))
    const actual = pts.filter(p => !p.guidance)
    const lastActual = actual[actual.length - 1]
    const guided = pts.filter(p => p.guidance)
    return {
      ...s,
      pts,
      line: actual.length > 1 ? actual.map((p, i) => `${i ? 'L' : 'M'}${p.cx},${p.cy}`).join('') : null,
      // Guided/projected points connect with a dashed leg from the last actual.
      guideLine: lastActual && guided.length ? [lastActual, ...guided].map((p, i) => `${i ? 'L' : 'M'}${p.cx},${p.cy}`).join('') : null,
      end: pts[pts.length - 1],
    }
  })

  // Label dates left-to-right, skipping any closer than ~56px to the last kept
  // one; the final date always wins its slot so the range end is labeled.
  const dates = [...new Set(points.map(p => p.date))].sort()
  const xTicks = []
  for (const d of dates) if (!xTicks.length || x(d) - x(xTicks[xTicks.length - 1]) >= 56) xTicks.push(d)
  const lastDate = dates[dates.length - 1]
  if (xTicks[xTicks.length - 1] !== lastDate) {
    if (xTicks.length > 1) xTicks.pop()
    xTicks.push(lastDate)
  }

  return {
    width, height, margin,
    series,
    yTicks: ticks.map(v => ({ v, y: y(v) })),
    xTicks: xTicks.map(d => ({ d, x: x(d) })),
    thresholds: group.thresholds.filter(t => t.value >= lo && t.value <= hi).map(t => ({ ...t, y: y(t.value) })),
    plotLeft: margin.left,
    plotRight: margin.left + plotW,
    plotBottom: margin.top + plotH,
  }
}
