// composables/usePortfolioSim.js
// All simulation math for the compound interest calculator.
// Pure functions — no Vue reactivity here, imported by the component.

// ── PRNG (mulberry32 — deterministic, seedable) ────────────────────────
export function makePRNG(seed) {
  let s = (seed * 1234567) ^ 0x12345678
  return function () {
    s += 0x6D2B79F5
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function randNorm(rng) {
  const u = 1 - rng(), v = rng()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── NAMED SCENARIOS ────────────────────────────────────────────────────
// Each returns an array of absolute annual returns (decimals, e.g. 0.08 = 8%)
export const SCENARIOS = {
  'Early Bear': {
    desc: 'Severe losses years 1–3, mean-reversion after. Worst case for sequence-of-returns risk with active withdrawals.',
    color: '#E67E22',
    getReturns(base, yrs) {
      const a = []
      for (let i = 0; i < yrs; i++) {
        if (i === 0) a.push(-0.25)
        else if (i === 1) a.push(-0.15)
        else if (i === 2) a.push(-0.10)
        else if (i === 3) a.push(0.18)
        else if (i === 4) a.push(0.22)
        else a.push(base / 100)
      }
      return a
    },
  },
  'Late Bear': {
    desc: 'Strong early compounding, crash hits near end. Far less damaging — gains are already locked in.',
    color: '#27AE60',
    getReturns(base, yrs) {
      const a = []
      for (let i = 0; i < yrs; i++) {
        if (i === yrs - 1) a.push(-0.25)
        else if (i === yrs - 2) a.push(-0.15)
        else if (i === yrs - 3) a.push(-0.10)
        else a.push((base / 100) * 1.1)
      }
      return a
    },
  },
  '2000s Decade': {
    desc: 'Dot-com bust then 2008 financial crisis: two deep drawdowns separated by a weak recovery.',
    color: '#C0392B',
    getReturns(_base, yrs) {
      const hist = [-0.09, -0.12, -0.22, 0.28, 0.11, 0.05, 0.16, 0.05, -0.37, 0.26, 0.15, 0.02, 0.16, 0.32, 0.14]
      return Array.from({ length: yrs }, (_, i) => hist[i % hist.length])
    },
  },
  '70s Stagflation': {
    desc: 'Prolonged low nominal returns with elevated inflation. Real purchasing power slowly erodes.',
    color: '#8E44AD',
    getReturns(_base, yrs) {
      const hist = [0.04, -0.15, -0.27, 0.37, 0.24, -0.07, 0.06, 0.18, 0.32, 0.21, 0.05, 0.01, 0.10, 0.08, 0.04]
      return Array.from({ length: yrs }, (_, i) => hist[i % hist.length])
    },
  },
  'Bull Run': {
    desc: '1990s/2010s-style extended expansion: above-average returns with shallow corrections.',
    color: '#1ABC9C',
    getReturns(_base, yrs) {
      const hist = [0.30, 0.08, 0.23, 0.33, 0.29, 0.21, 0.23, -0.09, 0.21, 0.16, 0.32, 0.14, 0.02, 0.22, 0.29]
      return Array.from({ length: yrs }, (_, i) => hist[i % hist.length])
    },
  },
  'Flat / Sideways': {
    desc: 'Low but positive returns every year. Tests whether spending rate is sustainable without growth.',
    color: '#7F8C8D',
    getReturns(_base, yrs) {
      return Array.from({ length: yrs }, (_, i) => 0.03 + (i % 3 === 1 ? -0.01 : 0.01))
    },
  },
}

// ── SMOOTH (deterministic) PATH ────────────────────────────────────────
// Returns { noms, reals, conts } — arrays of length yrs+1
export function calcSmooth({ P, rate, yrs, mo, cg, fees, infl, tax, spend }) {
  const nr = (rate - fees) / 100 / 12
  const tr = tax / 100
  const cgr = cg / 100
  const spendRate = spend / 100
  const noms = [], reals = [], conts = []
  let bal = P, tc = P, cm = mo

  for (let y = 0; y <= yrs; y++) {
    noms.push(Math.round(Math.max(bal, 0)))
    reals.push(Math.round(Math.max(bal, 0) / Math.pow(1 + infl / 100, y)))
    conts.push(Math.round(tc))
    if (y < yrs) {
      const annualSpend = bal * spendRate
      for (let mn = 0; mn < 12; mn++) {
        bal += bal * nr * (1 - tr) + cm - annualSpend / 12
        tc += cm
        if (bal < 0) { bal = 0; break }
      }
      cm *= (1 + cgr)
    }
  }
  return { noms, reals, conts }
}

// ── CUSTOM PATH (per-year return + spend arrays) ───────────────────────
// annualReturns: array of decimals (e.g. 0.08)
// annualSpends:  array of decimals (e.g. 0.04)
export function runCustomPath({ P, yrs, mo, cg, fees, tax, annualReturns, annualSpends }) {
  const tr = tax / 100
  const cgr = cg / 100
  const feeRate = fees / 100
  let bal = P, cm = mo
  const arr = [Math.round(bal)]

  for (let y = 0; y < yrs; y++) {
    const mr = (annualReturns[y] - feeRate) / 12
    const annualSpend = bal * annualSpends[y]
    for (let mn = 0; mn < 12; mn++) {
      bal = bal * (1 + mr * (1 - tr)) + cm - annualSpend / 12
      if (bal < 0) { bal = 0; break }
    }
    cm *= (1 + cgr)
    arr.push(Math.round(Math.max(bal, 0)))
  }
  return arr
}

// ── VOLATILITY PATHS ───────────────────────────────────────────────────
// Returns { paths: [{ arr, solvent }], solventCount }
export function calcVolPaths({ P, rate, yrs, mo, cg, fees, tax, spend, vol, nPaths, seed }) {
  const prng = makePRNG(seed)
  const paths = []
  let solventCount = 0
  const netAnnual = (rate - fees) / 100
  const tr = tax / 100
  const cgr = cg / 100
  const spendRate = spend / 100
  const mVol = vol / 100 / Math.sqrt(12)

  for (let p = 0; p < nPaths; p++) {
    let bal = P, cm = mo, solvent = true
    const arr = [Math.round(bal)]

    for (let y = 0; y < yrs; y++) {
      const as = bal * spendRate
      for (let mn = 0; mn < 12; mn++) {
        const sh = randNorm(prng)
        const mr = netAnnual / 12 + mVol * sh
        bal = bal * (1 + mr * (1 - tr)) + cm - as / 12
        if (bal < 0) { bal = 0; solvent = false; break }
      }
      cm *= (1 + cgr)
      arr.push(Math.round(Math.max(bal, 0)))
      if (!solvent) break
    }
    while (arr.length <= yrs) arr.push(0)
    paths.push({ arr, solvent })
    if (solvent && bal > 0) solventCount++
  }
  return { paths, solventCount }
}

// ── PEARSON CORRELATION ────────────────────────────────────────────────
export function correlation(a, b) {
  const n = a.length
  let mx = 0, my = 0
  for (let i = 0; i < n; i++) { mx += a[i]; my += b[i] }
  mx /= n; my /= n
  let num = 0, da = 0, db = 0
  for (let i = 0; i < n; i++) {
    const ai = a[i] - mx, bi = b[i] - my
    num += ai * bi; da += ai * ai; db += bi * bi
  }
  if (da === 0 || db === 0) return 0
  return num / Math.sqrt(da * db)
}

// ── FORMATTERS ─────────────────────────────────────────────────────────
export function fmtShort(v) {
  v = Math.round(v)
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B'
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M'
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'k'
  return '$' + v.toLocaleString()
}

export function fmtFull(v) {
  return '$' + Math.round(v).toLocaleString()
}

export function yAxisLabel(v) {
  if (v >= 1e9) return '$' + (v / 1e9).toFixed(1) + 'B'
  if (v >= 1e6) return '$' + (v / 1e6).toFixed(1) + 'M'
  if (v >= 1e3) return '$' + (v / 1e3).toFixed(0) + 'k'
  return '$' + Math.round(v)
}
