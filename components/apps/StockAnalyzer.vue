<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { buildProjectionChart } from '~/composables/useProjectionChart.js'
import {
  computeHistoricalStats,
  computeStagedDCF,
  extractFinnhubPESeries,
  getVerdict,
} from '~/composables/useStockValuation.js'
import { TICKER_CONFIG, cloneConfigForReactive, resetConfigToDefaults, applyScenario } from '~/config/tickerConfig.mjs'

// ─── Chart.js (dynamic import — SSR-safe) ─────────────────────
let ChartJS = null
let nProjChart = null, nRevChart = null, nDcfChart = null
let bProjChart = null, bDeChart = null, bDeGainChart = null
let gProjChart = null, gRevChart = null, gHistPeChart = null, gEpsGainChart = null, gDcfChart = null
let nHistPeChart = null, nEpsGainChart = null, bHistPdeChart = null

// API key now server-only — all Finnhub calls go through /api/finnhub/*
// No FINNHUB_KEY on the client.

const activeTab = ref('nvda')

const prices = reactive({})
const prevPrices = reactive({})

// ─── Price resolution state ───────────────────────────────────
// ticker → 'pending' | 'resolved' | 'error'. Verdicts, live multiples, and
// "% from today" figures are suppressed until 'resolved' — never computed
// from the config fallback price. Once resolved, a failed poll does not
// downgrade the state (a stale real price is still a real price).
const priceStates = reactive({})
const nPriceState = computed(() => priceStates['NVDA'] ?? 'pending')
const bPriceState = computed(() => priceStates['BX'] ?? 'pending')
const gPriceState = computed(() => priceStates['GOOGL'] ?? 'pending')
const nPriceReady = computed(() => nPriceState.value === 'resolved')
const bPriceReady = computed(() => bPriceState.value === 'resolved')
const gPriceReady = computed(() => gPriceState.value === 'resolved')
const statusText = ref('Fetching prices...')
const livePaused = ref(false)
const POLL_INTERVAL_MS = 30_000
let pollTimer = null

// ─── Per-ticker reactive stores (cloned from config on mount) ───
const nvdaState = reactive({})
const bxState = reactive({})
const googlState = reactive({})

// ─── Sidebar ──────────────────────────────────────────────────
const isLg = ref(true)
const sidebarOpen = ref(false)
const sidebarScrollEl = ref(null)

function checkBreakpoint() {
  const wasLg = isLg.value
  isLg.value = window.matchMedia('(min-width: 1024px)').matches
  if (wasLg !== isLg.value) sidebarOpen.value = isLg.value
}
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

// ─── Scenario preset handler ───────────────────────────────────
const nLastScenario = ref(TICKER_CONFIG.NVDA.defaultScenario ?? null)
function applyNVDAScenario(scenarioKey) {
  applyScenario(nvdaState, scenarioKey, TICKER_CONFIG.NVDA)
  nLastScenario.value = scenarioKey
}

// ─── Cost bases ───────────────────────────────────────────────
const BASES = {
  BX: 154.14, GOOGL: 313, NVDA: 186.5, IGM: 129.16, PRME: 3.47,
  APO: 144.76, AAPL: 271.86, AKRE: 65.51, ALNY: 397.65, AMZN: 230.82,
  ARES: 161.63, ARKG: 28.97, BEAM: 27.72, CG: 59.11, CRWV: 71.61,
  CRSP: 52.44, CRWD: 468.76,
}

// ─── NVDA Historical P/E seed ─────────────────────────────────
// Hardcoded 7-quarter seed (newest first). Chart reverses to chronological.
// Overridden at mount if Finnhub returns ≥8 quarters since 2016.
const NVDA_PE_SEED = [
  { label: 'Current',  value: 35.24 },
  { label: 'Jan 2026', value: 47.31 },
  { label: 'Oct 2025', value: 57.69 },
  { label: 'Jul 2025', value: 57.38 },
  { label: 'Apr 2025', value: 37.05 },
  { label: 'Jan 2025', value: 47.40 },
  { label: 'Oct 2024', value: 62.24 },
]

// Derive initial nPeMin/nPeMax from seed ±1σ so defaults are historically grounded
function _seedStats() {
  const vals = NVDA_PE_SEED.map(d => d.value)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const sigma = Math.sqrt(vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length)
  return { low: avg - sigma, high: avg + sigma }
}
const _ss = _seedStats()

const nHistPE = ref([...NVDA_PE_SEED])  // may be replaced with Finnhub data

// ─── BX Historical P/DE data (static quarterly base + live current point) ────
// Finnhub supplies the live price. BX distributable earnings come from company
// filings because Finnhub basic-financials does not expose non-GAAP DE/share.
const BX_LATEST_DE_SOURCE = {
  label: 'LTM Q1 2026',
  dePerShare: 5.84,
  source: 'Blackstone Q1 2026 earnings release',
}
const BX_HIST_PDE = [
  { label: 'Q4 2025', value: 27.36 },
  { label: 'Q3 2025', value: 27.64 },
  { label: 'Q2 2025', value: 30.96 },
  { label: 'Q1 2025', value: 29.84 },
  { label: 'Q4 2024', value: 29.34 },
  { label: 'Q3 2024', value: 37.10 },
  { label: 'Q2 2024', value: 37.73 },
  { label: 'Q1 2024', value: 31.04 },
  { label: 'Q4 2023', value: 33.23 },
  { label: 'Q3 2023', value: 33.22 },
  { label: 'Q2 2023', value: 27.43 },
  { label: 'Q1 2023', value: 23.11 },
  { label: 'Q4 2022', value: 19.14 },
  { label: 'Q3 2022', value: 14.33 },
  { label: 'Q2 2022', value: 14.40 },
  { label: 'Q1 2022', value: 15.12 },
  { label: 'Q4 2021', value: 23.66 },
  { label: 'Q3 2021', value: 27.09 },
  { label: 'Q2 2021', value: 27.70 },
  { label: 'Q1 2021', value: 27.34 },
  { label: 'Q4 2020', value: 23.55 },
  { label: 'Q3 2020', value: 24.38 },
  { label: 'Q2 2020', value: 23.23 },
  { label: 'Q1 2020', value: 25.89 },
  { label: 'Q4 2019', value: 19.66 },
  { label: 'Q3 2019', value: 24.38 },
  { label: 'Q2 2019', value: 21.62 },
  { label: 'Q1 2019', value: 18.24 },
  { label: 'Q4 2018', value: 13.69 },
  { label: 'Q3 2018', value: 11.79 },
  { label: 'Q2 2018', value: 13.38 },
  { label: 'Q1 2018', value: 12.32 },
  { label: 'Q4 2017', value: 12.46 },
  { label: 'Q3 2017', value: 10.08 },
  { label: 'Q2 2017', value: 12.23 },
  { label: 'Q1 2017', value: 12.38 },
  { label: 'Q4 2016', value: 11.96 },
  { label: 'Q3 2016', value: 15.12 },
  { label: 'Q2 2016', value: 13.07 },
  { label: 'Q1 2016', value: 11.99 },
  { label: 'Q4 2015', value: 11.25 },
  { label: 'Q3 2015', value:  9.10 },
  { label: 'Q2 2015', value:  9.28 },
  { label: 'Q1 2015', value: 12.19 },
  { label: 'Q4 2014', value: 12.43 },
]

const BX_DE_VS_GAIN = [
  // DE/share is Blackstone non-GAAP DE per common share. Capital gain excludes distributions.
  { year: '2021', de: 6.17, deGain: 84.7, cap: 99.65 },
  { year: '2022', de: 6.63, deGain:  7.5, cap: -42.66 },
  { year: '2023', de: 5.06, deGain: -23.7, cap: 76.47 },
  { year: '2024', de: 5.97, deGain: 17.9, cap: 31.70 },
  { year: '2025', de: 5.57, deGain: -6.7, cap: -10.60 },
]

// ─── EPS vs Capital Gain historical evidence ──────────────────
const EPS_VS_GAIN = [
  // FY2017–FY2020: from original spreadsheet (source of truth)
  { year: 'FY2017', eps: 182.87, cap: 223.91 },
  { year: 'FY2018', eps:  79.81, cap:  81.27 },
  { year: 'FY2019', eps: -48.31, cap: -30.94 },
  { year: 'FY2020', eps:  66.32, cap:  76.09 },
  // FY2021–FY2026: sourced from MacroTrends (EPS YoY) + Slickcharts (cap gain)
  { year: 'FY2021', eps: 147.06, cap: 125.29 },
  { year: 'FY2022', eps: -55.00, cap:  -50.31 },
  { year: 'FY2023', eps: -55.00, cap: 238.87 },
  { year: 'FY2024', eps: 600.00, cap: 171.17 },
  { year: 'FY2025', eps: 147.06, cap:  38.88 },
  { year: 'FY2026', eps:  66.67, cap:  -11.44 },
]

// ─── GOOGL Historical P/E seed ────────────────────────────────
// Newest-first. Overridden at mount if Finnhub returns ≥8 quarters since 2016.
const GOOGL_PE_SEED = [
  { label: 'Current',  value: 20.12 },
  { label: 'Jan 2025', value: 22.48 },
  { label: 'Oct 2024', value: 23.55 },
  { label: 'Jul 2024', value: 22.03 },
  { label: 'Apr 2024', value: 25.10 },
  { label: 'Jan 2024', value: 26.82 },
  { label: 'Oct 2023', value: 27.05 },
]
function _googlSeedStats() {
  const vals = GOOGL_PE_SEED.map(d => d.value)
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length
  const sigma = Math.sqrt(vals.reduce((a, b) => a + (b - avg) ** 2, 0) / vals.length)
  return { low: avg - sigma, high: avg + sigma }
}
const _gs = _googlSeedStats()
const gHistPE = ref([...GOOGL_PE_SEED])

// ─── GOOGL EPS vs Capital Gain ────────────────────────────────
// EPS YoY from MacroTrends, capital gain from Slickcharts (calendar year).
// Fiscal year = calendar year — no offset needed unlike NVDA.
const GOOGL_EPS_VS_GAIN = [
  { year: '2017', eps:  19.15, cap:  32.93 },
  { year: '2018', eps:   3.46, cap:  -0.80 },
  { year: '2019', eps:  12.20, cap:  28.18 },
  { year: '2020', eps:  19.11, cap:  30.85 },
  { year: '2021', eps:  91.43, cap:  65.30 },
  { year: '2022', eps: -20.97, cap: -39.09 },
  { year: '2023', eps:  27.19, cap:  58.32 },
  { year: '2024', eps:  38.62, cap:  35.51 },
  { year: '2025', eps:  34.45, cap:  65.35 },
]

const NVDA_YAHOO_EPS_ESTIMATE_SEED = {
  fy2027: 8.94,
  fy2028: 12.65,
}

const GOOGL_YAHOO_EPS_ESTIMATE_SEED = {
  y2026: 14.24,
  y2027: 14.49,
}

const BX_DE_ESTIMATE_SEED = {
  y2026: 6.33,
  y2027: 7.90,
}

// ─── Computed getters/setters over reactive stores ──────────────
// Store is the single source of truth. Computed refs expose store fields.
// Template binds to computed, not to hardcoded refs.

// NVDA computed refs
const nEps1 = computed({
  get: () => nvdaState.forward?.y1 ?? TICKER_CONFIG.NVDA.forward.y1,
  set: (v) => { nvdaState.forward.y1 = v }
})
const nEps2 = computed({
  get: () => nvdaState.forward?.y2 ?? TICKER_CONFIG.NVDA.forward.y2,
  set: (v) => { nvdaState.forward.y2 = v }
})
const nPeMin = computed({
  get: () => nvdaState.multipleBand?.min ?? TICKER_CONFIG.NVDA.multipleBand.min,
  set: (v) => { nvdaState.multipleBand.min = v }
})
const nPeMax = computed({
  get: () => nvdaState.multipleBand?.max ?? TICKER_CONFIG.NVDA.multipleBand.max,
  set: (v) => { nvdaState.multipleBand.max = v }
})
const nG = computed({
  get: () => nvdaState.projectionGrowth ?? TICKER_CONFIG.NVDA.projectionGrowth,
  set: (v) => { nvdaState.projectionGrowth = v }
})
const nG5 = computed({
  get: () => {
    const stages = nvdaState.growthStages ?? TICKER_CONFIG.NVDA.growthStages
    return (stages?.[0]?.rate ?? 0) * 100
  },
  set: (v) => { /* read-only; derived from staged growth config */ }
})
const nH5 = computed({
  get: () => {
    const stages = nvdaState.growthStages ?? TICKER_CONFIG.NVDA.growthStages
    return (stages?.[stages.length - 1]?.rate ?? 0) * 100
  },
  set: (v) => { /* read-only; derived from staged growth config */ }
})
const nD = computed({
  get: () => +(nDiscountRate.value * 100).toFixed(2),
  set: (v) => { /* read-only; discount rate is CAPM-derived */ }
})
const nCapmRf = computed({
  get: () => (nvdaState.capm?.rf ?? TICKER_CONFIG.NVDA.capm.rf) * 100,
  set: (v) => { nvdaState.capm.rf = v / 100 }
})
const nCapmErp = computed({
  get: () => (nvdaState.capm?.erp ?? TICKER_CONFIG.NVDA.capm.erp) * 100,
  set: (v) => { nvdaState.capm.erp = v / 100 }
})
const nCapmBeta = computed({
  get: () => nvdaState.capm?.beta ?? TICKER_CONFIG.NVDA.capm.beta,
  set: (v) => { nvdaState.capm.beta = v }
})
const nBaseEPS = computed({
  get: () => nvdaState.baseValue ?? TICKER_CONFIG.NVDA.baseValue,
  set: (v) => { nvdaState.baseValue = v }
})
const nR1 = computed({
  get: () => nvdaState.revenueModel?.q1 ?? TICKER_CONFIG.NVDA.revenueModel.q1,
  set: (v) => { nvdaState.revenueModel.q1 = v }
})
const nR2 = computed({
  get: () => nvdaState.revenueModel?.q2 ?? TICKER_CONFIG.NVDA.revenueModel.q2,
  set: (v) => { nvdaState.revenueModel.q2 = v }
})
const nR3 = computed({
  get: () => nvdaState.revenueModel?.q3 ?? TICKER_CONFIG.NVDA.revenueModel.q3,
  set: (v) => { nvdaState.revenueModel.q3 = v }
})
const nR4 = computed({
  get: () => nvdaState.revenueModel?.q4 ?? TICKER_CONFIG.NVDA.revenueModel.q4,
  set: (v) => { nvdaState.revenueModel.q4 = v }
})

// BX computed refs
const bDe1 = computed({
  get: () => bxState.forward?.y1 ?? TICKER_CONFIG.BX.forward.y1,
  set: (v) => { bxState.forward.y1 = v }
})
const bDe2 = computed({
  get: () => bxState.forward?.y2 ?? TICKER_CONFIG.BX.forward.y2,
  set: (v) => { bxState.forward.y2 = v }
})
const bPay = computed({
  get: () => bxState.payoutRatio ?? TICKER_CONFIG.BX.payoutRatio,
  set: (v) => { bxState.payoutRatio = v }
})
const bPMin = computed({
  get: () => bxState.multipleBand?.min ?? TICKER_CONFIG.BX.multipleBand.min,
  set: (v) => { bxState.multipleBand.min = v }
})
const bPMax = computed({
  get: () => bxState.multipleBand?.max ?? TICKER_CONFIG.BX.multipleBand.max,
  set: (v) => { bxState.multipleBand.max = v }
})
const bG = computed({
  get: () => bxState.projectionGrowth ?? TICKER_CONFIG.BX.projectionGrowth,
  set: (v) => { bxState.projectionGrowth = v }
})
const bD = computed({
  get: () => +(bDiscountRate.value * 100).toFixed(2),
  set: (v) => { /* read-only; discount rate is CAPM-derived */ }
})
const bCapmRf = computed({
  get: () => (bxState.capm?.rf ?? TICKER_CONFIG.BX.capm.rf) * 100,
  set: (v) => { bxState.capm.rf = v / 100 }
})
const bCapmErp = computed({
  get: () => (bxState.capm?.erp ?? TICKER_CONFIG.BX.capm.erp) * 100,
  set: (v) => { bxState.capm.erp = v / 100 }
})
const bCapmBeta = computed({
  get: () => bxState.capm?.beta ?? TICKER_CONFIG.BX.capm.beta,
  set: (v) => { bxState.capm.beta = v }
})

// GOOGL computed refs
const gEps1 = computed({
  get: () => googlState.forward?.y1 ?? TICKER_CONFIG.GOOGL.forward.y1,
  set: (v) => { googlState.forward.y1 = v }
})
const gEps2 = computed({
  get: () => googlState.forward?.y2 ?? TICKER_CONFIG.GOOGL.forward.y2,
  set: (v) => { googlState.forward.y2 = v }
})
const gPeMin = computed({
  get: () => googlState.multipleBand?.min ?? TICKER_CONFIG.GOOGL.multipleBand.min,
  set: (v) => { googlState.multipleBand.min = v }
})
const gPeMax = computed({
  get: () => googlState.multipleBand?.max ?? TICKER_CONFIG.GOOGL.multipleBand.max,
  set: (v) => { googlState.multipleBand.max = v }
})
const gG = computed({
  get: () => googlState.projectionGrowth ?? TICKER_CONFIG.GOOGL.projectionGrowth,
  set: (v) => { googlState.projectionGrowth = v }
})
const gG5 = computed({
  get: () => {
    const stages = googlState.growthStages ?? TICKER_CONFIG.GOOGL.growthStages
    return (stages?.[0]?.rate ?? 0) * 100
  },
  set: (v) => { /* read-only; derived from staged growth config */ }
})
const gH5 = computed({
  get: () => {
    const stages = googlState.growthStages ?? TICKER_CONFIG.GOOGL.growthStages
    return (stages?.[stages.length - 1]?.rate ?? 0) * 100
  },
  set: (v) => { /* read-only; derived from staged growth config */ }
})
const gD = computed({
  get: () => +(TICKER_CONFIG.GOOGL.discountRateOverride * 100).toFixed(2),
  set: (v) => { /* read-only; discount rate is hardcoded fallback */ }
})
const gBaseEPS = computed({
  get: () => googlState.baseValue ?? TICKER_CONFIG.GOOGL.baseValue,
  set: (v) => { googlState.baseValue = v }
})
const gR1 = computed({
  get: () => googlState.revenueModel?.q1 ?? TICKER_CONFIG.GOOGL.revenueModel.q1,
  set: (v) => { googlState.revenueModel.q1 = v }
})
const gR2 = computed({
  get: () => googlState.revenueModel?.q2 ?? TICKER_CONFIG.GOOGL.revenueModel.q2,
  set: (v) => { googlState.revenueModel.q2 = v }
})
const gR3 = computed({
  get: () => googlState.revenueModel?.q3 ?? TICKER_CONFIG.GOOGL.revenueModel.q3,
  set: (v) => { googlState.revenueModel.q3 = v }
})
const gR4 = computed({
  get: () => googlState.revenueModel?.q4 ?? TICKER_CONFIG.GOOGL.revenueModel.q4,
  set: (v) => { googlState.revenueModel.q4 = v }
})

// ─── Slider configs ───────────────────────────────────────────
const dlr = n => '$' + n.toFixed(2)
const pct = (n, d = 1) => (n >= 0 ? '+' : '') + (n * 100).toFixed(d) + '%'
const colCls = n => n >= 0 ? 'pos' : 'neg'
const absDlr = n => (n >= 0 ? '+$' : '\u2212$') + Math.abs(n).toFixed(2)
const fmtX = v => v.toFixed(1) + '\u00d7'
const pctPoint = n => +(n * 100).toFixed(2)

function computeDcfBreakdown({ baseEPS, g5, h5, d, terminalMultiplier }) {
  let ann = baseEPS
  let pvEarnings = 0
  for (let y = 1; y <= 5; y++) {
    ann *= (1 + g5)
    pvEarnings += ann / Math.pow(1 + d, y)
  }
  for (let y = 6; y <= 10; y++) {
    ann *= (1 + h5)
    pvEarnings += ann / Math.pow(1 + d, y)
  }
  const terminalValue = ann * terminalMultiplier
  const pvTerminal = terminalValue / Math.pow(1 + d, 10)
  return {
    yr5EPS: baseEPS * Math.pow(1 + g5, 5),
    yr10EPS: ann,
    pvEarnings,
    terminalValue,
    pvTerminal,
    floor: pvEarnings + pvTerminal,
  }
}

// ─── Slider config key → computed ref mapper ─────────────────────
function buildSliderSections(ticker, sliderConfig, refMap, fmtMap) {
  return sliderConfig.sections.map(section => ({
    section: section.section,
    items: section.items.map(item => {
      const model = refMap[item.key]
      const fmtFn = fmtMap[item.fmt]
      return {
        label: item.label,
        model,
        min: item.min,
        max: item.max,
        step: item.step,
        fmt: fmtFn
      }
    })
  }))
}

// Format functions (used in computed() refs will format display)
const formatters = {
  dlr: v => dlr(v),
  multiple: v => fmtX(v),
  percent: v => v.toFixed(1) + '%',
  billion: v => '$' + v.toFixed(1) + 'B',
  decimal: v => v.toFixed(2),
}

// ─── Dynamic slider generation from config ─────────────────────

// NVDA: map config keys to computed refs
const nvdaSliders = buildSliderSections('NVDA', TICKER_CONFIG.NVDA.sliderConfig, {
  y1: nEps1, y2: nEps2,
  minMultiple: nPeMin, maxMultiple: nPeMax,
  projGrowth: nG,
  baseValue: nBaseEPS,
  dcfG5: nG5, dcfH5: nH5, discountRate: nD,
  capmRf: nCapmRf, capmErp: nCapmErp, capmBeta: nCapmBeta,
  revQ1: nR1, revQ2: nR2, revQ3: nR3, revQ4: nR4,
}, formatters)

// BX: map config keys to computed refs
const bxSliders = buildSliderSections('BX', TICKER_CONFIG.BX.sliderConfig, {
  y1: bDe1, y2: bDe2,
  payoutRatio: bPay,
  minMultiple: bPMin, maxMultiple: bPMax,
  projGrowth: bG,
  discountRate: bD,
  capmRf: bCapmRf, capmErp: bCapmErp, capmBeta: bCapmBeta,
}, formatters)

// GOOGL: map config keys to computed refs
const googlSliders = buildSliderSections('GOOGL', TICKER_CONFIG.GOOGL.sliderConfig, {
  y1: gEps1, y2: gEps2,
  minMultiple: gPeMin, maxMultiple: gPeMax,
  projGrowth: gG,
  baseValue: gBaseEPS,
  dcfG5: gG5, dcfH5: gH5, discountRate: gD,
  revQ1: gR1, revQ2: gR2, revQ3: gR3, revQ4: gR4,
}, formatters)

const currentSliders = computed(() => {
  if (activeTab.value === 'nvda')  return nvdaSliders
  if (activeTab.value === 'bx')    return bxSliders
  if (activeTab.value === 'googl') return googlSliders
  return []
})

// ─── Watchlist ────────────────────────────────────────────────
const WATCHLIST_KEY = 'sa-stock-watchlist-v1'
const DEFAULT_WATCHLIST = Object.freeze([
  'NVDA', 'BX', 'AAPL', 'AMZN', 'GOOGL', 'CRWD', 'APO', 'ARES', 'ARKG', 'PRME', 'ALNY',
])

function normalizeWatchlist(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  return raw.reduce((out, item) => {
    const t = String(item).trim().toUpperCase()
    if (!t || !/^[A-Z0-9.\-]{1,16}$/.test(t) || seen.has(t)) return out
    seen.add(t); out.push(t); return out
  }, [])
}

const watchlist = ref([...DEFAULT_WATCHLIST])
if (import.meta.client) {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY)
    if (stored) {
      const n = normalizeWatchlist(JSON.parse(stored))
      if (n.length) watchlist.value = n
    }
  } catch { /* ignore */ }
}
const newTicker = ref('')

// ─── Canvas refs ──────────────────────────────────────────────
const nProjCanvas    = ref(null)
const nRevCanvas     = ref(null)
const nHistPeCanvas  = ref(null)
const nEpsGainCanvas = ref(null)
const nDcfCanvas     = ref(null)
const bProjCanvas    = ref(null)
const bDeCanvas      = ref(null)
const bDeGainCanvas  = ref(null)
const bHistPdeCanvas = ref(null)
const gProjCanvas    = ref(null)
const gRevCanvas     = ref(null)
const gHistPeCanvas  = ref(null)
const gEpsGainCanvas = ref(null)
const gDcfCanvas     = ref(null)

// ─── Misc state ───────────────────────────────────────────────
const nvdaGlossaryOpen  = ref(false)
const bxGlossaryOpen    = ref(false)
const googlGlossaryOpen = ref(false)
const nProjZoomed       = ref(false)
const bProjZoomed       = ref(false)
const gProjZoomed       = ref(false)

// ─── NVDA computed ────────────────────────────────────────────
const nvdaPrice   = computed(() => prices['NVDA'] || TICKER_CONFIG.NVDA.priceFallback)
const nvdaPrev    = computed(() => prevPrices['NVDA'] || nvdaPrice.value)
const nvdaChg     = computed(() => nvdaPrice.value - nvdaPrev.value)
const nvdaChgPct  = computed(() => nvdaChg.value / nvdaPrev.value)

const nP1h = computed(() => nEps1.value * nPeMax.value)
const nP1l = computed(() => nEps1.value * nPeMin.value)
const nP2h = computed(() => nEps2.value * nPeMax.value)
const nP2l = computed(() => nEps2.value * nPeMin.value)

const n1Range    = computed(() => `${dlr(nP1l.value)}\u2013${dlr(nP1h.value)}`)
const n2Range    = computed(() => `${dlr(nP2l.value)}\u2013${dlr(nP2h.value)}`)
const n1RangeSub = computed(() => `${pct((nP1l.value - nvdaPrice.value) / nvdaPrice.value)} to ${pct((nP1h.value - nvdaPrice.value) / nvdaPrice.value)}`)
const n2RangeSub = computed(() => `${pct((nP2l.value - nvdaPrice.value) / nvdaPrice.value)} to ${pct((nP2h.value - nvdaPrice.value) / nvdaPrice.value)}`)

// NVDA Staged DCF with CAPM-derived discount rate
const nDiscountRate = computed(() => {
  const capm = nvdaState.capm ?? TICKER_CONFIG.NVDA.capm
  if (capm) {
    return capm.rf + capm.beta * capm.erp
  }
  return TICKER_CONFIG.NVDA.discountRateOverride / 100  // fallback (not used for NVDA)
})

const nDcfFull = computed(() => computeStagedDCF({
  baseValue: nvdaState.baseValue ?? TICKER_CONFIG.NVDA.baseValue,
  seedValues: nvdaState.seedValues ?? TICKER_CONFIG.NVDA.seedValues,
  growthStages: nvdaState.growthStages ?? TICKER_CONFIG.NVDA.growthStages,
  terminal: nvdaState.terminal ?? TICKER_CONFIG.NVDA.terminal,
  discountRate: nDiscountRate.value,
}))

const nFloor = computed(() => nDcfFull.value.intrinsic)
const nTerminalDiverges = computed(() => nDcfFull.value.terminalDiverges)
const nTerminalPercent = computed(() => nDcfFull.value.terminalAsPercentOfIntrinsic)

// Keep old breakdown for backward compatibility (will be replaced by nDcfFull)
const nDcfBreakdown = computed(() => {
  const full = nDcfFull.value
  return {
    valuePath: full.valuePath,
    pvPath: full.pvPath,
    intrinsic: full.intrinsic,
    Rx: full.Rx,
    mult: full.mult,
    terminalNumerator: full.terminalNumerator,
    pvTerminal: full.pvTerminal,
    pvEarnings: full.intrinsic - full.pvTerminal,
    floor: full.intrinsic,
    yr5EPS: full.valuePath[4] ?? 0,
    yr10EPS: full.valuePath[full.valuePath.length - 1] ?? 0,
  }
})
const nVsFloor = computed(() => (nFloor.value - nvdaPrice.value) / nvdaPrice.value)

// ─── Scenario comparison: compute all three scenario floors ─────────────────
const nScenarioFloors = computed(() => {
  const scenarios = TICKER_CONFIG.NVDA.scenarios
  const results = {}

  for (const [key, scenario] of Object.entries(scenarios)) {
    const dcf = computeStagedDCF({
      baseValue: TICKER_CONFIG.NVDA.baseValue,
      seedValues: scenario.seedValues,
      growthStages: scenario.growthStages,
      terminal: scenario.terminal,
      discountRate: nDiscountRate.value,
    })
    results[key] = {
      floor: dcf.intrinsic,
      yr10EPS: dcf.valuePath[dcf.valuePath.length - 1],
    }
  }
  return results
})

// Compute implied revenue for each scenario (from Yr-10 EPS)
// netMargin = (GM * (1 - opex) * (1 - tax)) / dilutedShares
// = (0.73 * 0.814 * 0.8412) / 24.432 = 0.1639 ≈ 16.39% net margin
// impliedRev = Yr10EPS / netMargin
const nScenarioImpliedRev = computed(() => {
  const dilutedShares = 24.432
  const gm = 0.73, opex = 0.186, tax = 0.1588
  const netMargin = (gm * (1 - opex) * (1 - tax)) / dilutedShares

  const results = {}
  for (const [key, data] of Object.entries(nScenarioFloors.value)) {
    results[key] = data.yr10EPS / netMargin
  }
  return results
})

// Generate comparison caption
const nScenarioCaption = computed(() => {
  const bearFloor = nScenarioFloors.value.bear?.floor ?? 0
  const baseFloor = nScenarioFloors.value.base?.floor ?? 0
  const bullFloor = nScenarioFloors.value.bull?.floor ?? 0
  const price = nvdaPrice.value

  if (nPriceState.value === 'error') {
    return 'Live price unavailable — scenario floors shown without a spot comparison.'
  }
  if (!nPriceReady.value) {
    return 'Fetching live price… scenario floors shown below.'
  }
  if (price < bearFloor) {
    return `At $${price.toFixed(2)}, NVDA is priced below the Bear case.`
  } else if (price >= bearFloor && price < baseFloor) {
    return `At $${price.toFixed(2)}, NVDA is priced between the Bear and Base cases.`
  } else if (price >= baseFloor && price < bullFloor) {
    return `At $${price.toFixed(2)}, NVDA is priced between the Base and Bull cases.`
  } else {
    return `At $${price.toFixed(2)}, NVDA is priced above the Bull case.`
  }
})

// Compute scenario numberline positions (0 to 100%)
const nScenarioLinePositions = computed(() => {
  const floors = nScenarioFloors.value
  const price = nvdaPrice.value

  const minVal = Math.min(price, floors.bear?.floor, floors.base?.floor, floors.bull?.floor) * 0.9
  const maxVal = Math.max(price, floors.bear?.floor, floors.base?.floor, floors.bull?.floor) * 1.1
  const range = maxVal - minVal

  return {
    bear: ((floors.bear?.floor - minVal) / range) * 100,
    base: ((floors.base?.floor - minVal) / range) * 100,
    bull: ((floors.bull?.floor - minVal) / range) * 100,
    price: ((price - minVal) / range) * 100,
  }
})

// Track active scenario and dirty state (derived from store vs scenario config,
// anchored on the last-applied scenario — not on edit events)
const nActiveScenario = computed(() => {
  const active = nLastScenario.value
  if (!active) return { active: null, isDirty: false }
  const scenario = TICKER_CONFIG.NVDA.scenarios?.[active]
  if (!scenario) return { active: null, isDirty: false }

  const stateSeeds = nvdaState.seedValues ?? TICKER_CONFIG.NVDA.seedValues
  const stateStages = nvdaState.growthStages ?? TICKER_CONFIG.NVDA.growthStages
  const stateTerminal = nvdaState.terminal ?? TICKER_CONFIG.NVDA.terminal
  const stateMultiple = nvdaState.multipleBand ?? TICKER_CONFIG.NVDA.multipleBand

  const isDirty = !(
    JSON.stringify(stateSeeds) === JSON.stringify(scenario.seedValues) &&
    JSON.stringify(stateStages) === JSON.stringify(scenario.growthStages) &&
    JSON.stringify(stateTerminal) === JSON.stringify(scenario.terminal) &&
    JSON.stringify(stateMultiple) === JSON.stringify(scenario.multipleBand)
  )

  return { active, isDirty }
})

const nScenarioButtonLabel = computed(() => {
  const as = nActiveScenario.value
  if (!as.active) return null
  const label = TICKER_CONFIG.NVDA.scenarios[as.active].label
  return as.isDirty ? `${label} (modified)` : label
})

// Implied revenue with sanity check for staged DCF current config
const REVENUE_SANITY_CEILING = 1.5e12  // ~2x current global semiconductor industry revenue (~$750B)
const nDcfImpliedRev = computed(() => {
  const dilutedShares = 24.432e9
  const gm = 0.73, opex = 0.186, tax = 0.1588

  const path = nDcfFull.value.valuePath
  const yr10EPS = path[path.length - 1] ?? 0
  // impliedRev ($) = (yr10EPS × dilutedShares) / (GM × (1 - opex) × (1 - tax))
  const impliedRev = yr10EPS * dilutedShares / gm / (1 - opex) / (1 - tax)

  return {
    value: impliedRev,
    flagged: impliedRev > REVENUE_SANITY_CEILING,
  }
})

// Historical P/E stats (reactive — updates if Finnhub data replaces seed)
const nHistStats = computed(() => {
  const chronological = [...nHistPE.value].reverse()
  const values = chronological.map(d => d.value)
  return computeHistoricalStats(values)
})

const nRevs        = computed(() => [nR1.value, nR2.value, nR3.value, nR4.value])
const nRevTotal    = computed(() => nRevs.value.reduce((a, b) => a + b, 0))
const nQEPS        = computed(() => {
  const gm = 0.73, ox = 0.186, tx = 0.1588, sh = 24.432
  return nRevs.value.map(r => (r * gm * (1 - ox)) * (1 - tx) / sh)
})
const nRevEPSTotal = computed(() => nQEPS.value.reduce((a, b) => a + b, 0))
const nRevQoQ      = computed(() => ((nR4.value / nR1.value) ** (1 / 3) - 1) * 100)
const nRevHit1T    = computed(() => nRevTotal.value >= 1000)
const nExpectedPrice1 = computed(() => (nP1l.value + nP1h.value) / 2)
const nExpectedPrice2 = computed(() => (nP2l.value + nP2h.value) / 2)
const nForwardEpsRows = computed(() => [
  { label: 'FY2027E', eps: nEps1.value, source: 'Yahoo normalized consensus / slider EPS' },
  { label: 'FY2028E', eps: nEps2.value, source: 'Yahoo normalized consensus / slider EPS' },
])
const nExpectedPriceRow1 = computed(() => nExpectedPrice1.value)
const nExpectedPriceRow2 = computed(() => {
  const eps = nForwardEpsRows.value[1]?.eps ?? nEps2.value
  return eps * ((nPeMin.value + nPeMax.value) / 2)
})
const nEpsGainSeries = computed(() => {
  const row1 = nForwardEpsRows.value[0]
  const row2 = nForwardEpsRows.value[1]
  const price1 = nExpectedPriceRow1.value
  const price2 = nExpectedPriceRow2.value
  return [
    ...EPS_VS_GAIN.map(d => ({ ...d, projected: false })),
    {
      year: row1.label,
      eps: pctPoint(row1.eps / nBaseEPS.value - 1),
      cap: pctPoint(price1 / nvdaPrice.value - 1),
      epsEstimate: row1.eps,
      expectedPrice: price1,
      projected: true,
      source: row1.source,
      priceSource: 'slider midpoint target',
    },
    {
      year: row2.label,
      eps: pctPoint(row2.eps / row1.eps - 1),
      cap: pctPoint(price2 / price1 - 1),
      epsEstimate: row2.eps,
      expectedPrice: price2,
      projected: true,
      source: row2.source,
      priceSource: 'EPS estimate × P/E midpoint',
    },
  ]
})

// NVDA conviction signal — based on current P/E vs normal historical range
// Suppressed until the live quote resolves — never rendered off a fallback price.
const nConviction = computed(() => {
  if (!nPriceReady.value) return null
  const pe = nHistPE.value[0]?.value ?? null
  if (!pe) return null
  const { avg, sigma, low, high } = nHistStats.value
  if (pe < low - sigma) return {
    signal: 'EXTREME BUY', color: 'emerald',
    reason: `P/E ${pe.toFixed(1)}× — far below the historical avg (${avg.toFixed(1)}×)`,
    context: `Deepest discount in the dataset. Multiple compressed far below any historical norm.`,
  }
  if (pe < low) return {
    signal: 'STRONG BUY', color: 'emerald',
    reason: `P/E ${pe.toFixed(1)}× — below the normal low end (${low.toFixed(1)}×)`,
    context: `Trading below the historical low-end multiple. Long-run avg is ${avg.toFixed(1)}×.`,
  }
  if (pe < avg) return {
    signal: 'BUY', color: 'green',
    reason: `P/E ${pe.toFixed(1)}× — below the historical avg (${avg.toFixed(1)}×)`,
    context: `Multiple compressed below the long-run average — room to re-rate upward.`,
  }
  if (pe <= high) return {
    signal: 'HOLD / FAIR', color: 'yellow',
    reason: `P/E ${pe.toFixed(1)}× — within the normal range (${low.toFixed(1)}–${high.toFixed(1)}×)`,
    context: `Multiple within the normal historical range. Not cheap, not extended.`,
  }
  return {
    signal: 'RICH', color: 'red',
    reason: `P/E ${pe.toFixed(1)}× — above the +1σ ceiling (${high.toFixed(1)}×)`,
    context: `Multiple extended beyond the historical high-end. Expect compression risk.`,
  }
})

// ─── BX computed ──────────────────────────────────────────────
const bxPrice   = computed(() => prices['BX'] || TICKER_CONFIG.BX.priceFallback)
const bxPrev    = computed(() => prevPrices['BX'] || bxPrice.value)
const bxChg     = computed(() => bxPrice.value - bxPrev.value)
const bxChgPct  = computed(() => bxChg.value / bxPrev.value)

const bxQuarterCount = BX_HIST_PDE.length
const bxCurrentPde = computed(() => +(bxPrice.value / BX_LATEST_DE_SOURCE.dePerShare).toFixed(2))
const bxHistPdeSeries = computed(() => [
  { label: 'Current', value: bxCurrentPde.value, isLive: true },
  ...BX_HIST_PDE,
])
const bxHistStats = computed(() => {
  const values = BX_HIST_PDE.map(d => d.value)
  return computeHistoricalStats(values, { buyZoneThreshold: 20 })
})
const bxHistAvg = computed(() => bxHistStats.value.avg)
const bxHistBelowBuyZone = computed(() => bxHistStats.value.belowBuyZone)
const bxCurrentBelowBuyZone = computed(() => bxCurrentPde.value < 20)

const bP1h = computed(() => bDe1.value * bPMax.value)
const bP1l = computed(() => bDe1.value * bPMin.value)
const bP2h = computed(() => bDe2.value * bPMax.value)
const bP2l = computed(() => bDe2.value * bPMin.value)

const b1Range    = computed(() => `${dlr(bP1l.value)}\u2013${dlr(bP1h.value)}`)
const b2Range    = computed(() => `${dlr(bP2l.value)}\u2013${dlr(bP2h.value)}`)
const b1RangeSub = computed(() => `${pct((bP1l.value - bxPrice.value) / bxPrice.value)} to ${pct((bP1h.value - bxPrice.value) / bxPrice.value)}`)
const b2RangeSub = computed(() => `${pct((bP2l.value - bxPrice.value) / bxPrice.value)} to ${pct((bP2h.value - bxPrice.value) / bxPrice.value)}`)

const bYld1 = computed(() => (bPay.value / 100 * bDe1.value) / bxPrice.value)
const bYld2 = computed(() => (bPay.value / 100 * bDe2.value) / bxPrice.value)
const bExpectedPrice1 = computed(() => (bP1l.value + bP1h.value) / 2)
const bExpectedPrice2 = computed(() => (bP2l.value + bP2h.value) / 2)
const bDeGainSeries = computed(() => [
  ...BX_DE_VS_GAIN.map(d => ({ ...d, projected: false })),
  {
    year: '2026E',
    de: bDe1.value,
    deGain: pctPoint(bDe1.value / BX_LATEST_DE_SOURCE.dePerShare - 1),
    cap: pctPoint(bExpectedPrice1.value / bxPrice.value - 1),
    distYield: pctPoint(bYld1.value),
    expectedPrice: bExpectedPrice1.value,
    projected: true,
    source: 'DE slider / LTM Q1 2026 base',
    priceSource: 'P/DE midpoint target',
  },
  {
    year: '2027E',
    de: bDe2.value,
    deGain: pctPoint(bDe2.value / bDe1.value - 1),
    cap: pctPoint(bExpectedPrice2.value / bExpectedPrice1.value - 1),
    distYield: pctPoint(bYld2.value),
    expectedPrice: bExpectedPrice2.value,
    projected: true,
    source: 'DE slider',
    priceSource: 'P/DE midpoint target',
  },
])

// BX Staged DCF with CAPM-derived discount rate (uses DpS, not DE)
const bDiscountRate = computed(() => {
  const capm = bxState.capm ?? TICKER_CONFIG.BX.capm
  if (capm) {
    return capm.rf + capm.beta * capm.erp
  }
  return TICKER_CONFIG.BX.discountRateOverride / 100  // fallback
})

const bDcfFull = computed(() => computeStagedDCF({
  baseValue: TICKER_CONFIG.BX.baseValue,
  seedValues: TICKER_CONFIG.BX.seedValues,
  growthStages: TICKER_CONFIG.BX.growthStages,
  terminal: TICKER_CONFIG.BX.terminal,
  discountRate: bDiscountRate.value,
}))

const bFloor = computed(() => bDcfFull.value.intrinsic)
const bTerminalDiverges = computed(() => bDcfFull.value.terminalDiverges)
const bTerminalPercent = computed(() => bDcfFull.value.terminalAsPercentOfIntrinsic)
const bVsFloor = computed(() => (bFloor.value - bxPrice.value) / bxPrice.value)

const bDeYears  = computed(() => {
  const g = bG.value / 100
  return [0, 1, 2, 3].map(y => +(bDe1.value * Math.pow(1 + g, y)).toFixed(2))
})
const bDistYears = computed(() => bDeYears.value.map(v => +(v * bPay.value / 100).toFixed(2)))
const bYr3Yield  = computed(() => (bDistYears.value[3] / bxPrice.value) * 100)

// BX conviction signal — based on current P/DE vs fair-range thresholds.
// getVerdict returns null unless the live quote has resolved; the raw
// prices map (no fallback) is passed on purpose.
const bConviction = computed(() => {
  const v = getVerdict({
    priceState: bPriceState.value,
    price: prices['BX'],
    dePerShare: BX_LATEST_DE_SOURCE.dePerShare,
  })
  if (!v) return null
  const { signal, color, pde } = v
  const detail = {
    'STRONG BUY': {
      reason: `P/DE ${pde}× — inside the historical buy zone (< 20×)`,
      context: `Only ${bxHistBelowBuyZone.value} of ${bxQuarterCount} tracked quarters have reached this level. Rare entry.`,
    },
    'BUY': {
      reason: `P/DE ${pde}× — below the 22× fair-range floor`,
      context: `Approaching the lower bound of the 22–29× historical fair range.`,
    },
    'HOLD / FAIR': {
      reason: `P/DE ${pde}× — within the 22–29× fair range`,
      context: `Multiple within the historically sourced fair-value band.`,
    },
    'RICH': {
      reason: `P/DE ${pde}× — above the 29× fair-range ceiling`,
      context: `Multiple extended beyond historical fair value. Compression risk elevated.`,
    },
  }[signal]
  return { signal, color, ...detail }
})

// ─── GOOGL computed ────────────────────────────────────────────
const googlPrice  = computed(() => prices['GOOGL'] || TICKER_CONFIG.GOOGL.priceFallback)
const googlPrev   = computed(() => prevPrices['GOOGL'] || googlPrice.value)
const googlChg    = computed(() => googlPrice.value - googlPrev.value)
const googlChgPct = computed(() => googlChg.value / googlPrev.value)

const gP1h = computed(() => gEps1.value * gPeMax.value)
const gP1l = computed(() => gEps1.value * gPeMin.value)
const gP2h = computed(() => gEps2.value * gPeMax.value)
const gP2l = computed(() => gEps2.value * gPeMin.value)

const g1Range    = computed(() => `${dlr(gP1l.value)}\u2013${dlr(gP1h.value)}`)
const g2Range    = computed(() => `${dlr(gP2l.value)}\u2013${dlr(gP2h.value)}`)
const g1RangeSub = computed(() => `${pct((gP1l.value - googlPrice.value) / googlPrice.value)} to ${pct((gP1h.value - googlPrice.value) / googlPrice.value)}`)
const g2RangeSub = computed(() => `${pct((gP2l.value - googlPrice.value) / googlPrice.value)} to ${pct((gP2h.value - googlPrice.value) / googlPrice.value)}`)

// GOOGL Staged DCF with fixed discount rate (no CAPM source yet)
const gDcfFull = computed(() => computeStagedDCF({
  baseValue: TICKER_CONFIG.GOOGL.baseValue,
  seedValues: TICKER_CONFIG.GOOGL.seedValues,
  growthStages: TICKER_CONFIG.GOOGL.growthStages,
  terminal: TICKER_CONFIG.GOOGL.terminal,
  discountRate: TICKER_CONFIG.GOOGL.discountRateOverride,
}))

const gFloor = computed(() => gDcfFull.value.intrinsic)
const gTerminalDiverges = computed(() => gDcfFull.value.terminalDiverges)
const gTerminalPercent = computed(() => gDcfFull.value.terminalAsPercentOfIntrinsic)

// Keep old breakdown for backward compat
const gDcfBreakdown = computed(() => {
  const full = gDcfFull.value
  return {
    valuePath: full.valuePath,
    pvPath: full.pvPath,
    intrinsic: full.intrinsic,
    Rx: full.Rx,
    mult: full.mult,
    terminalNumerator: full.terminalNumerator,
    pvTerminal: full.pvTerminal,
    pvEarnings: full.intrinsic - full.pvTerminal,
    floor: full.intrinsic,
    yr5EPS: full.valuePath[4] ?? 0,
    yr10EPS: full.valuePath[full.valuePath.length - 1] ?? 0,
  }
})
const gVsFloor = computed(() => (gFloor.value - googlPrice.value) / googlPrice.value)

// Revenue model — FY2026 (calendar 2026)
// Effective net margin from Q4 2025 actuals: ~$2.15 EPS on $96.5B rev → ~27.4% net
// gm=0.58, ox=0.449 → operating margin 31.9%, tax 14%, 12.3B shares
const gRevs        = computed(() => [gR1.value, gR2.value, gR3.value, gR4.value])
const gRevTotal    = computed(() => gRevs.value.reduce((a, b) => a + b, 0))
const gQEPS        = computed(() => {
  const gm = 0.58, ox = 0.449, tx = 0.14, sh = 12.3
  return gRevs.value.map(r => (r * gm * (1 - ox)) * (1 - tx) / sh)
})
const gRevEPSTotal = computed(() => gQEPS.value.reduce((a, b) => a + b, 0))
const gRevQoQ      = computed(() => ((gR4.value / gR1.value) ** (1 / 3) - 1) * 100)
const gExpectedPrice1 = computed(() => (gP1l.value + gP1h.value) / 2)
const gExpectedPrice2 = computed(() => (gP2l.value + gP2h.value) / 2)
const gForwardEpsRows = computed(() => [
  { label: '2026E', eps: gEps1.value, source: 'Yahoo normalized consensus / slider EPS' },
  { label: '2027E', eps: gEps2.value, source: 'Yahoo normalized consensus / slider EPS' },
])
const gExpectedPriceRow1 = computed(() => gExpectedPrice1.value)
const gExpectedPriceRow2 = computed(() => {
  const eps = gForwardEpsRows.value[1]?.eps ?? gEps2.value
  return eps * ((gPeMin.value + gPeMax.value) / 2)
})
const gEpsGainSeries = computed(() => {
  const row1 = gForwardEpsRows.value[0]
  const row2 = gForwardEpsRows.value[1]
  const price1 = gExpectedPriceRow1.value
  const price2 = gExpectedPriceRow2.value
  return [
    ...GOOGL_EPS_VS_GAIN.map(d => ({ ...d, projected: false })),
    {
      year: row1.label,
      eps: pctPoint(row1.eps / gBaseEPS.value - 1),
      cap: pctPoint(price1 / googlPrice.value - 1),
      epsEstimate: row1.eps,
      expectedPrice: price1,
      projected: true,
      source: row1.source,
      priceSource: 'slider midpoint target',
    },
    {
      year: row2.label,
      eps: pctPoint(row2.eps / row1.eps - 1),
      cap: pctPoint(price2 / price1 - 1),
      epsEstimate: row2.eps,
      expectedPrice: price2,
      projected: true,
      source: row2.source,
      priceSource: 'EPS estimate × P/E midpoint',
    },
  ]
})

const gHistStats = computed(() => {
  const chronological = [...gHistPE.value].reverse()
  const values = chronological.map(d => d.value)
  return computeHistoricalStats(values)
})

const gConviction = computed(() => {
  if (!gPriceReady.value) return null
  const pe = gHistPE.value[0]?.value ?? null
  if (!pe) return null
  const { avg, sigma, low, high } = gHistStats.value
  if (pe < low - sigma) return {
    signal: 'EXTREME BUY', color: 'emerald',
    reason: `P/E ${pe.toFixed(1)}× — far below the historical avg (${avg.toFixed(1)}×)`,
    context: `Deepest discount in the dataset. Multiple compressed far below any historical norm.`,
  }
  if (pe < low) return {
    signal: 'STRONG BUY', color: 'emerald',
    reason: `P/E ${pe.toFixed(1)}× — below the normal low end (${low.toFixed(1)}×)`,
    context: `Trading below the historical low-end multiple. Long-run avg is ${avg.toFixed(1)}×.`,
  }
  if (pe < avg) return {
    signal: 'BUY', color: 'green',
    reason: `P/E ${pe.toFixed(1)}× — below the historical avg (${avg.toFixed(1)}×)`,
    context: `Multiple compressed below the long-run average — room to re-rate upward.`,
  }
  if (pe <= high) return {
    signal: 'HOLD / FAIR', color: 'yellow',
    reason: `P/E ${pe.toFixed(1)}× — within the normal range (${low.toFixed(1)}–${high.toFixed(1)}×)`,
    context: `Multiple within the normal historical range. Not cheap, not extended.`,
  }
  return {
    signal: 'RICH', color: 'red',
    reason: `P/E ${pe.toFixed(1)}× — above the +1σ ceiling (${high.toFixed(1)}×)`,
    context: `Multiple extended beyond the historical high-end. Expect compression risk.`,
  }
})

// ─── Watchlist ────────────────────────────────────────────────
const watchlistRows = computed(() =>
  watchlist.value.map(t => {
    const p = prices[t] || 0, pp = prevPrices[t] || p
    const c = p - pp, pc = p > 0 ? c / pp : 0
    const basis = BASES[t], bp = basis && p > 0 ? (p - basis) / basis : null
    return { ticker: t, price: p, change: c, changePct: pc, vsBasis: bp, basis }
  })
)

// ─── Chart helpers ────────────────────────────────────────────
function safeDestroyChart(c) { try { c?.destroy() } catch { /* ignore */ } }

function canPatchBarChart(chart, el) {
  if (!ChartJS || !chart?.canvas || !el) return false
  try {
    if (chart.canvas !== el) return false
    const reg = ChartJS.getChart(el)
    if (reg != null && reg !== chart) return false
    return chart.config?.type === 'bar' && chart.data?.datasets?.length === 2
  } catch { return false }
}

function gc() {
  return window.matchMedia('(prefers-color-scheme:dark)').matches
    ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
}

// ─── NVDA projection chart ────────────────────────────────────
function renderNVDAProjChart() {
  if (!ChartJS) return
  const el = nProjCanvas.value
  if (!el) return
  try {
    nProjChart = buildProjectionChart(
      ChartJS, el, nvdaPrice.value,
      nEps1.value, nEps2.value, nPeMin.value, nPeMax.value, nG.value / 100,
      nProjChart, nProjZoomed.value ? 3 : 10,
    )
  } catch {
    safeDestroyChart(nProjChart); nProjChart = null
    try {
      nProjChart = buildProjectionChart(
        ChartJS, el, nvdaPrice.value,
        nEps1.value, nEps2.value, nPeMin.value, nPeMax.value, nG.value / 100,
        null, nProjZoomed.value ? 3 : 10,
      )
    } catch { /* give up */ }
  }
}

// ─── NVDA revenue chart ───────────────────────────────────────
function renderNVDARevChart() {
  if (!ChartJS) return
  const el = nRevCanvas.value
  if (!el) return
  const revData = nRevs.value.map(v => +v.toFixed(1))
  const epsData = nQEPS.value.map(v => +v.toFixed(2))
  const g = gc()

  if (canPatchBarChart(nRevChart, el)) {
    try {
      nRevChart.data.datasets[0].data = revData
      nRevChart.data.datasets[1].data = epsData
      nRevChart.options.scales.y.grid.color = g
      nRevChart.update(); return
    } catch { /* fall through */ }
  }
  safeDestroyChart(nRevChart); nRevChart = null
  try {
    nRevChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: ['Q1 Apr26', 'Q2 Jul26', 'Q3 Oct26', 'Q4 Jan27'],
        datasets: [
          { label: 'Revenue', data: revData, backgroundColor: '#378ADD', yAxisID: 'y' },
          { label: 'EPS', data: epsData, type: 'line', borderColor: '#BA7517', backgroundColor: 'transparent', pointBackgroundColor: '#BA7517', pointRadius: 5, yAxisID: 'y2' },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: g }, title: { display: true, text: 'Revenue ($B)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y2: { position: 'right', title: { display: true, text: 'EPS ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── NVDA Historical P/E chart ────────────────────────────────
function renderNVDAHistPEChart() {
  if (!ChartJS) return
  const el = nHistPeCanvas.value
  if (!el) return
  safeDestroyChart(nHistPeChart); nHistPeChart = null

  // Data in chronological order (oldest → newest = left → right)
  const ordered = [...nHistPE.value].reverse()
  const labels  = ordered.map(d => d.label)
  const values  = ordered.map(d => d.value)
  const { avg, sigma } = nHistStats.value
  const N = values.length

  const upperBand = Array(N).fill(+(avg + sigma).toFixed(2))
  const lowerBand = Array(N).fill(+(avg - sigma).toFixed(2))
  const avgLine   = Array(N).fill(+avg.toFixed(2))
  const g = gc()
  const currentPriceLabel = dlr(nvdaPrice.value)

  try {
    nHistPeChart = new ChartJS(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          // 0: upper sigma band — fill down to dataset 1
          { data: upperBand, borderColor: 'transparent', backgroundColor: 'rgba(55,138,221,0.10)', pointRadius: 0, fill: '+1', borderWidth: 0, tension: 0 },
          // 1: lower sigma band
          { data: lowerBand, borderColor: 'rgba(55,138,221,0.25)', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1, borderDash: [2, 4], tension: 0 },
          // 2: avg reference line
          { data: avgLine, borderColor: '#888780', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1.5, borderDash: [5, 4], tension: 0 },
          // 3: actual P/E
          { data: values, borderColor: '#378ADD', backgroundColor: 'transparent', pointRadius: 4, pointBackgroundColor: '#378ADD', fill: false, borderWidth: 2, tension: 0.1, spanGaps: false },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                if (c.datasetIndex !== 3) return null
                return c.dataIndex === values.length - 1
                  ? `Current: ${c.raw}×`
                  : `${c.label}: ${c.raw}×`
              },
              afterLabel: c => {
                if (c.datasetIndex !== 3 || c.dataIndex !== values.length - 1) return null
                return `Price: ${currentPriceLabel}`
              },
            },
          },
        },
        scales: {
          y: { grid: { color: g }, ticks: { font: { size: 11 }, callback: v => v + '×' }, title: { display: true, text: 'TTM P/E', font: { size: 11 } } },
          x: { grid: { color: g }, ticks: { font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── NVDA EPS vs Capital Gain chart ──────────────────────────
function renderNVDAEpsGainChart() {
  if (!ChartJS) return
  const el = nEpsGainCanvas.value
  if (!el) return
  safeDestroyChart(nEpsGainChart); nEpsGainChart = null
  const g = gc()
  const rows = nEpsGainSeries.value
  const epsColors = rows.map(d => d.projected ? '#7dd3fc' : '#378ADD')
  const capColors = rows.map(d => d.projected ? '#86efac' : '#1D9E75')

  try {
    nEpsGainChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: rows.map(d => d.year),
        datasets: [
          { label: 'EPS gain %', data: rows.map(d => d.eps), backgroundColor: epsColors },
          { label: 'Capital gain %', data: rows.map(d => d.cap), backgroundColor: capColors },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                const row = rows[c.dataIndex]
                const suffix = row?.projected ? ' (projected)' : ''
                return `${c.dataset.label}${suffix}: ${c.raw}%`
              },
              afterBody: items => {
                const row = rows[items?.[0]?.dataIndex]
                if (!row?.projected) return null
                return [
                  `EPS estimate: ${dlr(row.epsEstimate)}`,
                  `Implied price: ${dlr(row.expectedPrice)}`,
                  `EPS source: ${row.source}`,
                  `Price source: ${row.priceSource}`,
                ]
              },
            },
          },
        },
        scales: {
          y: { grid: { color: g }, ticks: { font: { size: 11 }, callback: v => v + '%' }, title: { display: true, text: 'Annual gain %', font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── NVDA DCF EPS growth path chart ──────────────────────────
function renderNVDADcfChart() {
  if (!ChartJS) return
  const el = nDcfCanvas.value
  if (!el) return
  safeDestroyChart(nDcfChart); nDcfChart = null

  const base = nBaseEPS.value
  const g5 = nG5.value / 100
  const h5 = nH5.value / 100
  const d  = nD.value  / 100

  const years = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const epsAt = yr => {
    if (yr <= 5) return base * Math.pow(1 + g5, yr)
    return base * Math.pow(1 + g5, 5) * Math.pow(1 + h5, yr - 5)
  }

  const phase1 = years.map(yr => yr <= 5 ? +epsAt(yr).toFixed(2) : null)
  const phase2 = years.map(yr => yr >= 5 ? +epsAt(yr).toFixed(2) : null)
  const pvLine = years.map(yr => +(epsAt(yr) / Math.pow(1 + d, yr)).toFixed(2))
  const g = gc()

  try {
    nDcfChart = new ChartJS(el, {
      type: 'line',
      data: {
        labels: years.map(yr => `Yr ${yr}`),
        datasets: [
          {
            label: 'Phase 1 EPS (g5)',
            data: phase1,
            borderColor: '#378ADD',
            backgroundColor: 'transparent',
            pointRadius: years.map(yr => (yr === 0 || yr === 5) ? 5 : 3),
            pointBackgroundColor: '#378ADD',
            borderWidth: 2.5,
            tension: 0.2,
            spanGaps: false,
          },
          {
            label: 'Phase 2 EPS (h5)',
            data: phase2,
            borderColor: '#1D9E75',
            backgroundColor: 'transparent',
            pointRadius: years.map(yr => (yr === 5 || yr === 10) ? 5 : 3),
            pointBackgroundColor: '#1D9E75',
            borderWidth: 2.5,
            tension: 0.2,
            spanGaps: false,
          },
          {
            label: 'PV at d%',
            data: pvLine,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            fill: true,
            pointRadius: 0,
            borderWidth: 1.5,
            borderDash: [4, 3],
            tension: 0.2,
          },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.dataset.label}: $${c.raw}` } },
        },
        scales: {
          y: {
            grid: { color: g },
            ticks: { font: { size: 11 }, callback: v => '$' + v },
            title: { display: true, text: 'EPS ($)', font: { size: 11 } },
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    })
  } catch { /* give up */ }
}

function renderNVDACharts() {
  renderNVDAProjChart()
  renderNVDARevChart()
  renderNVDAHistPEChart()
  renderNVDAEpsGainChart()
  renderNVDADcfChart()
}

// ─── BX projection chart ──────────────────────────────────────
function renderBXProjChart() {
  if (!ChartJS) return
  const el = bProjCanvas.value
  if (!el) return
  try {
    bProjChart = buildProjectionChart(
      ChartJS, el, bxPrice.value,
      bDe1.value, bDe2.value, bPMin.value, bPMax.value, bG.value / 100,
      bProjChart, bProjZoomed.value ? 3 : 10,
    )
  } catch {
    safeDestroyChart(bProjChart); bProjChart = null
    try {
      bProjChart = buildProjectionChart(
        ChartJS, el, bxPrice.value,
        bDe1.value, bDe2.value, bPMin.value, bPMax.value, bG.value / 100,
        null, bProjZoomed.value ? 3 : 10,
      )
    } catch { /* give up */ }
  }
}

// ─── BX DE growth chart ───────────────────────────────────────
function renderBXDeChart() {
  if (!ChartJS) return
  const el = bDeCanvas.value
  if (!el) return
  const deData = [...bDeYears.value], distData = [...bDistYears.value]
  const g = gc()

  if (canPatchBarChart(bDeChart, el)) {
    try {
      bDeChart.data.datasets[0].data = deData
      bDeChart.data.datasets[1].data = distData
      bDeChart.options.scales.y.grid.color = g
      bDeChart.update(); return
    } catch { /* fall through */ }
  }
  safeDestroyChart(bDeChart); bDeChart = null
  try {
    bDeChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: ['Now', 'Year 1', 'Year 2', 'Year 3'],
        datasets: [
          { label: 'DE/share',   data: deData,   backgroundColor: '#378ADD', yAxisID: 'y' },
          { label: 'Dist/share', data: distData, type: 'line', borderColor: '#1D9E75', backgroundColor: 'transparent', pointBackgroundColor: '#1D9E75', pointRadius: 5, yAxisID: 'y2' },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y:  { grid: { color: g }, title: { display: true, text: 'DE per share ($)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y2: { position: 'right', title: { display: true, text: 'Distribution/share ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
          x:  { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── BX DE vs capital gain chart ───────────────────────────────
function renderBXDeGainChart() {
  if (!ChartJS) return
  const el = bDeGainCanvas.value
  if (!el) return
  safeDestroyChart(bDeGainChart); bDeGainChart = null
  const g = gc()
  const rows = bDeGainSeries.value
  const deColors = rows.map(d => d.projected ? '#7dd3fc' : '#378ADD')
  const capColors = rows.map(d => d.projected ? '#86efac' : '#1D9E75')

  try {
    bDeGainChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: rows.map(d => d.year),
        datasets: [
          { label: 'DE/share gain %', data: rows.map(d => d.deGain), backgroundColor: deColors },
          { label: 'Capital gain %', data: rows.map(d => d.cap), backgroundColor: capColors },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                const row = rows[c.dataIndex]
                const suffix = row?.projected ? ' (projected)' : ''
                return `${c.dataset.label}${suffix}: ${c.raw}%`
              },
              afterBody: items => {
                const row = rows[items?.[0]?.dataIndex]
                if (!row) return null
                const lines = [`DE/share: ${dlr(row.de)}`]
                if (row.projected) {
                  lines.push(`Implied price: ${dlr(row.expectedPrice)}`)
                  lines.push(`Distribution yield: ${row.distYield}%`)
                  lines.push(`DE source: ${row.source}`)
                  lines.push(`Price source: ${row.priceSource}`)
                }
                return lines
              },
            },
          },
        },
        scales: {
          y: { grid: { color: g }, ticks: { font: { size: 11 }, callback: v => v + '%' }, title: { display: true, text: 'Annual gain %', font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── BX Historical P/DE chart ─────────────────────────────────
function renderBXHistPDEChart() {
  if (!ChartJS) return
  const el = bHistPdeCanvas.value
  if (!el) return
  safeDestroyChart(bHistPdeChart); bHistPdeChart = null

  // Chronological order (oldest left), with a live current point at far right.
  const ordered  = [...bxHistPdeSeries.value].reverse()
  const labels   = ordered.map(d => d.label)
  const values   = ordered.map(d => d.value)
  const N        = values.length
  const g        = gc()
  const currentPriceLabel = dlr(bxPrice.value)
  const currentDeLabel = dlr(BX_LATEST_DE_SOURCE.dePerShare)

  // Fair range band (22–29×) and buy-zone line (20×)
  const fairHigh  = Array(N).fill(29)
  const fairLow   = Array(N).fill(22)
  const buyZone   = Array(N).fill(20)
  const avgLine   = Array(N).fill(+bxHistAvg.value.toFixed(2))

  try {
    bHistPdeChart = new ChartJS(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          // 0: fair range top (fills to dataset 1)
          { data: fairHigh, borderColor: 'rgba(55,138,221,0.25)', backgroundColor: 'rgba(55,138,221,0.07)', pointRadius: 0, fill: '+1', borderWidth: 1, borderDash: [2, 4], tension: 0 },
          // 1: fair range bottom
          { data: fairLow,  borderColor: 'rgba(55,138,221,0.25)', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1, borderDash: [2, 4], tension: 0 },
          // 2: buy-zone reference (20×)
          { data: buyZone,  borderColor: '#f59e0b', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1.5, borderDash: [4, 3], tension: 0 },
          // 3: all-time avg
          { data: avgLine,  borderColor: '#888780', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1.5, borderDash: [5, 4], tension: 0 },
          // 4: actual P/DE — amber below 20×, blue above
          {
            data: values,
            borderWidth: 2,
            pointRadius: ordered.map(d => d.isLive ? 5 : 3),
            pointHoverRadius: ordered.map(d => d.isLive ? 7 : 5),
            fill: false,
            tension: 0.1,
            spanGaps: false,
            segment: {
              borderColor: ctx => (ctx.p0.parsed.y < 20 || ctx.p1.parsed.y < 20) ? '#f59e0b' : '#378ADD',
            },
            pointBackgroundColor: values.map(v => v < 20 ? '#f59e0b' : '#378ADD'),
          },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                if (c.datasetIndex !== 4) return null
                const point = ordered[c.dataIndex]
                if (point?.isLive) return `Current: ${c.raw}×`
                return `${c.label}: ${c.raw}×`
              },
              afterLabel: c => {
                if (c.datasetIndex !== 4) return null
                const point = ordered[c.dataIndex]
                if (!point?.isLive) return null
                return [
                  `Price: ${currentPriceLabel}`,
                  `DE/share: ${currentDeLabel} (${BX_LATEST_DE_SOURCE.label})`,
                ]
              },
            },
          },
        },
        scales: {
          y: { grid: { color: g }, ticks: { font: { size: 11 }, callback: v => v + '×' }, title: { display: true, text: 'P/DE', font: { size: 11 } }, min: 0 },
          x: { grid: { color: g }, ticks: { font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 16 } },
        },
      },
    })
  } catch { /* give up */ }
}

function renderBXCharts() {
  renderBXProjChart()
  renderBXDeChart()
  renderBXDeGainChart()
  renderBXHistPDEChart()
}

// ─── GOOGL revenue chart ─────────────────────────────────────
function renderGOOGLRevChart() {
  if (!ChartJS) return
  const el = gRevCanvas.value
  if (!el) return
  const revData = gRevs.value.map(v => +v.toFixed(1))
  const epsData = gQEPS.value.map(v => +v.toFixed(2))
  const g = gc()

  if (canPatchBarChart(gRevChart, el)) {
    try {
      gRevChart.data.datasets[0].data = revData
      gRevChart.data.datasets[1].data = epsData
      gRevChart.options.scales.y.grid.color = g
      gRevChart.update(); return
    } catch { /* fall through */ }
  }
  safeDestroyChart(gRevChart); gRevChart = null
  try {
    gRevChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: ['Q1 Jan26', 'Q2 Apr26', 'Q3 Jul26', 'Q4 Oct26'],
        datasets: [
          { label: 'Revenue', data: revData, backgroundColor: '#378ADD', yAxisID: 'y' },
          { label: 'EPS', data: epsData, type: 'line', borderColor: '#BA7517', backgroundColor: 'transparent', pointBackgroundColor: '#BA7517', pointRadius: 5, yAxisID: 'y2' },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y:  { grid: { color: g }, title: { display: true, text: 'Revenue ($B)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y2: { position: 'right', title: { display: true, text: 'EPS ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
          x:  { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── GOOGL projection chart ───────────────────────────────────
function renderGOOGLProjChart() {
  if (!ChartJS) return
  const el = gProjCanvas.value
  if (!el) return
  try {
    gProjChart = buildProjectionChart(
      ChartJS, el, googlPrice.value,
      gEps1.value, gEps2.value, gPeMin.value, gPeMax.value, gG.value / 100,
      gProjChart, gProjZoomed.value ? 3 : 10,
    )
  } catch {
    safeDestroyChart(gProjChart); gProjChart = null
    try {
      gProjChart = buildProjectionChart(
        ChartJS, el, googlPrice.value,
        gEps1.value, gEps2.value, gPeMin.value, gPeMax.value, gG.value / 100,
        null, gProjZoomed.value ? 3 : 10,
      )
    } catch { /* give up */ }
  }
}

// ─── GOOGL Historical P/E chart ──────────────────────────────
function renderGOOGLHistPEChart() {
  if (!ChartJS) return
  const el = gHistPeCanvas.value
  if (!el) return
  safeDestroyChart(gHistPeChart); gHistPeChart = null

  const ordered = [...gHistPE.value].reverse()
  const labels  = ordered.map(d => d.label)
  const values  = ordered.map(d => d.value)
  const { avg, sigma } = gHistStats.value
  const N = values.length
  const upperBand = Array(N).fill(+(avg + sigma).toFixed(2))
  const lowerBand = Array(N).fill(+(avg - sigma).toFixed(2))
  const avgLine   = Array(N).fill(+avg.toFixed(2))
  const g = gc()
  const currentPriceLabel = dlr(googlPrice.value)

  try {
    gHistPeChart = new ChartJS(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { data: upperBand, borderColor: 'transparent', backgroundColor: 'rgba(55,138,221,0.10)', pointRadius: 0, fill: '+1', borderWidth: 0, tension: 0 },
          { data: lowerBand, borderColor: 'rgba(55,138,221,0.25)', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1, borderDash: [2, 4], tension: 0 },
          { data: avgLine, borderColor: '#888780', backgroundColor: 'transparent', pointRadius: 0, fill: false, borderWidth: 1.5, borderDash: [5, 4], tension: 0 },
          { data: values, borderColor: '#378ADD', backgroundColor: 'transparent', pointRadius: 4, pointBackgroundColor: '#378ADD', fill: false, borderWidth: 2, tension: 0.1, spanGaps: false },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                if (c.datasetIndex !== 3) return null
                return c.dataIndex === values.length - 1
                  ? `Current: ${c.raw}×`
                  : `${c.label}: ${c.raw}×`
              },
              afterLabel: c => {
                if (c.datasetIndex !== 3 || c.dataIndex !== values.length - 1) return null
                return `Price: ${currentPriceLabel}`
              },
            },
          },
        },
        scales: {
          y: { grid: { color: g }, ticks: { font: { size: 11 }, callback: v => v + '×' }, title: { display: true, text: 'TTM P/E', font: { size: 11 } } },
          x: { grid: { color: g }, ticks: { font: { size: 11 }, maxRotation: 45, autoSkip: true, maxTicksLimit: 12 } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── GOOGL EPS vs Capital Gain chart ─────────────────────────
function renderGOOGLEpsGainChart() {
  if (!ChartJS) return
  const el = gEpsGainCanvas.value
  if (!el) return
  safeDestroyChart(gEpsGainChart); gEpsGainChart = null
  const g = gc()
  const rows = gEpsGainSeries.value
  const epsColors = rows.map(d => d.projected ? '#7dd3fc' : '#378ADD')
  const capColors = rows.map(d => d.projected ? '#86efac' : '#1D9E75')

  try {
    gEpsGainChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: rows.map(d => d.year),
        datasets: [
          { label: 'EPS gain %', data: rows.map(d => d.eps), backgroundColor: epsColors },
          { label: 'Capital gain %', data: rows.map(d => d.cap), backgroundColor: capColors },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => {
                const row = rows[c.dataIndex]
                const suffix = row?.projected ? ' (projected)' : ''
                return `${c.dataset.label}${suffix}: ${c.raw}%`
              },
              afterBody: items => {
                const row = rows[items?.[0]?.dataIndex]
                if (!row?.projected) return null
                return [
                  `EPS estimate: ${dlr(row.epsEstimate)}`,
                  `Implied price: ${dlr(row.expectedPrice)}`,
                  `EPS source: ${row.source}`,
                  `Price source: ${row.priceSource}`,
                ]
              },
            },
          },
        },
        scales: {
          y: { grid: { color: g }, ticks: { font: { size: 11 }, callback: v => v + '%' }, title: { display: true, text: 'Annual gain %', font: { size: 11 } } },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    })
  } catch { /* give up */ }
}

// ─── GOOGL DCF EPS growth path chart ─────────────────────────
// Continuous line yr 0–10. Phase 1 (blue, yr 0–5) and Phase 2 (teal, yr 5–10)
// as separate datasets that share yr 5 to connect. Amber fill = PV of each
// year's EPS at d — the gap between EPS and PV widens with higher d.
function renderGOOGLDcfChart() {
  if (!ChartJS) return
  const el = gDcfCanvas.value
  if (!el) return
  safeDestroyChart(gDcfChart); gDcfChart = null

  const base = gBaseEPS.value
  const g5 = gG5.value / 100
  const h5 = gH5.value / 100
  const d  = gD.value  / 100

  const years = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  const epsAt = yr => {
    if (yr <= 5) return base * Math.pow(1 + g5, yr)
    return base * Math.pow(1 + g5, 5) * Math.pow(1 + h5, yr - 5)
  }

  // Phase 1: yr 0–5 visible, then null (no line drawn into phase 2)
  const phase1 = years.map(yr => yr <= 5 ? +epsAt(yr).toFixed(2) : null)
  // Phase 2: null up to yr 4, then yr 5–10 (shares yr 5 to connect segments)
  const phase2 = years.map(yr => yr >= 5 ? +epsAt(yr).toFixed(2) : null)
  // PV line: EPS discounted at d for each year
  const pvLine = years.map(yr => +(epsAt(yr) / Math.pow(1 + d, yr)).toFixed(2))

  const g = gc()

  try {
    gDcfChart = new ChartJS(el, {
      type: 'line',
      data: {
        labels: years.map(yr => `Yr ${yr}`),
        datasets: [
          {
            label: 'Phase 1 EPS (g5)',
            data: phase1,
            borderColor: '#378ADD',
            backgroundColor: 'transparent',
            pointRadius: years.map(yr => (yr === 0 || yr === 5) ? 5 : 3),
            pointBackgroundColor: '#378ADD',
            borderWidth: 2.5,
            tension: 0.2,
            spanGaps: false,
          },
          {
            label: 'Phase 2 EPS (h5)',
            data: phase2,
            borderColor: '#1D9E75',
            backgroundColor: 'transparent',
            pointRadius: years.map(yr => (yr === 5 || yr === 10) ? 5 : 3),
            pointBackgroundColor: '#1D9E75',
            borderWidth: 2.5,
            tension: 0.2,
            spanGaps: false,
          },
          {
            label: 'PV at d%',
            data: pvLine,
            borderColor: '#f59e0b',
            backgroundColor: 'rgba(245,158,11,0.08)',
            fill: true,
            pointRadius: 0,
            borderWidth: 1.5,
            borderDash: [4, 3],
            tension: 0.2,
          },
        ],
      },
      options: {
        animation: false, responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: c => `${c.dataset.label}: $${c.raw}`,
            },
          },
        },
        scales: {
          y: {
            grid: { color: g },
            ticks: { font: { size: 11 }, callback: v => '$' + v },
            title: { display: true, text: 'EPS ($)', font: { size: 11 } },
          },
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        },
      },
    })
  } catch { /* give up */ }
}

function renderGOOGLCharts() {
  renderGOOGLRevChart()
  renderGOOGLProjChart()
  renderGOOGLHistPEChart()
  renderGOOGLEpsGainChart()
  renderGOOGLDcfChart()
}

// ─── Finnhub via server routes (no key on client) ────────────
const allTickers = computed(() => {
  const extras = watchlist.value.filter(t => t !== 'NVDA' && t !== 'BX' && t !== 'GOOGL')
  return ['NVDA', 'BX', 'GOOGL', ...extras]
})

async function fetchQuotes(tickers) {
  if (!tickers.length) return
  try {
    const data = await $fetch(`/api/finnhub/quote?symbols=${tickers.join(',')}`)
    for (const ticker of tickers) {
      const q = data[ticker]
      if (q && Number.isFinite(q.c) && q.c > 0) {
        prices[ticker]      = q.c
        prevPrices[ticker]  = q.pc
        priceStates[ticker] = 'resolved'
      } else if (priceStates[ticker] !== 'resolved') {
        priceStates[ticker] = 'error'
      }
    }
  } catch {
    for (const ticker of tickers) {
      if (priceStates[ticker] !== 'resolved') priceStates[ticker] = 'error'
    }
  }
}

async function fetchNVDAMetrics() {
  try {
    const data = await $fetch('/api/finnhub/metrics?symbol=NVDA')
    const series = extractFinnhubPESeries(data, 8, 2016)
    if (series && series.length >= 8) {
      // Reverse to newest-first so the ref matches NVDA_PE_SEED orientation
      nHistPE.value = [...series].reverse()
    }
  } catch { /* keep seed data */ }
}

async function fetchGOOGLMetrics() {
  try {
    const data = await $fetch('/api/finnhub/metrics?symbol=GOOGL')
    const series = extractFinnhubPESeries(data, 8, 2016)
    if (series && series.length >= 8) {
      gHistPE.value = [...series].reverse()
    }
  } catch { /* keep seed data */ }
}

// ─── Polling (replaces WebSocket — API key stays server-only) ─
function startPolling() {
  stopPolling()
  pollTimer = setInterval(async () => {
    if (!livePaused.value) {
      await fetchQuotes(allTickers.value)
      statusText.value = 'Live (30s)'
    }
  }, POLL_INTERVAL_MS)
}

function stopPolling() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

async function toggleLiveStream() {
  if (livePaused.value) {
    livePaused.value = false
    statusText.value = 'Fetching...'
    await fetchQuotes(allTickers.value)
    statusText.value = 'Live (30s)'
    startPolling()
  } else {
    livePaused.value = true
    stopPolling()
    statusText.value = 'Paused'
  }
}

// ─── Watchlist actions ────────────────────────────────────────
async function addTicker() {
  const t = newTicker.value.trim().toUpperCase()
  if (!t || watchlist.value.includes(t)) { newTicker.value = ''; return }
  watchlist.value.push(t)
  newTicker.value = ''
  await fetchQuotes([t])
}

function removeTicker(t) {
  watchlist.value = watchlist.value.filter(x => x !== t)
}

// ─── Throttle for price-driven chart redraws ──────────────────
const CHART_PRICE_UPDATE_MS = 2000

function throttle(fn, ms) {
  let last = 0, timeout = null
  return () => {
    const now = Date.now()
    const run = () => { last = Date.now(); fn() }
    if (now - last >= ms) {
      if (timeout) { clearTimeout(timeout); timeout = null }
      run()
    } else if (!timeout) {
      timeout = setTimeout(() => { timeout = null; run() }, ms - (now - last))
    }
  }
}
const throttledNVDAPriceCharts = throttle(() => {
  if (activeTab.value !== 'nvda') return
  renderNVDAProjChart()
  renderNVDAHistPEChart()
  renderNVDAEpsGainChart()
}, CHART_PRICE_UPDATE_MS)
const throttledBXPriceCharts = throttle(() => {
  if (activeTab.value !== 'bx') return
  renderBXProjChart()
  renderBXDeGainChart()
  renderBXHistPDEChart()
}, CHART_PRICE_UPDATE_MS)
const throttledGOOGLPriceCharts = throttle(() => {
  if (activeTab.value !== 'googl') return
  renderGOOGLProjChart()
  renderGOOGLHistPEChart()
  renderGOOGLEpsGainChart()
}, CHART_PRICE_UPDATE_MS)

// ─── Lifecycle ────────────────────────────────────────────────
onMounted(async () => {
  // ─── Initialize reactive stores from config ─────────────────
  // Computed getters/setters now expose these to the template.
  // No watch() syncing needed — computed handles two-way binding.
  Object.assign(nvdaState, cloneConfigForReactive(TICKER_CONFIG.NVDA))
  Object.assign(bxState, cloneConfigForReactive(TICKER_CONFIG.BX))
  Object.assign(googlState, cloneConfigForReactive(TICKER_CONFIG.GOOGL))
  if (TICKER_CONFIG.NVDA.defaultScenario) applyNVDAScenario(TICKER_CONFIG.NVDA.defaultScenario)

  isLg.value = window.matchMedia('(min-width: 1024px)').matches
  sidebarOpen.value = isLg.value
  window.addEventListener('resize', checkBreakpoint)

  const { default: Chart } = await import('chart.js/auto')
  ChartJS = Chart

  // Render immediately with defaults
  renderNVDACharts()

  // Fetch quotes then start polling
  await fetchQuotes(allTickers.value)
  statusText.value = 'Live (30s)'
  startPolling()

  // Fetch metrics in background (updates historical P/E charts if Finnhub has enough data)
  fetchNVDAMetrics()
  fetchGOOGLMetrics()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkBreakpoint)
  stopPolling()
  ;[nProjChart, nRevChart, nHistPeChart, nEpsGainChart, nDcfChart,
    bProjChart, bDeChart, bDeGainChart, bHistPdeChart,
    gProjChart, gRevChart, gHistPeChart, gEpsGainChart, gDcfChart].forEach(safeDestroyChart)
})

// ─── Watchers ─────────────────────────────────────────────────
// NVDA P/E projection
watch([nEps1, nEps2, nPeMin, nPeMax, nG, nProjZoomed], () => {
  if (activeTab.value !== 'nvda') return
  renderNVDAProjChart()
  renderNVDAEpsGainChart()
})
// NVDA revenue model
watch([nR1, nR2, nR3, nR4], () => {
  if (activeTab.value === 'nvda') renderNVDARevChart()
})
// NVDA DCF chart
watch([nBaseEPS, nG5, nH5, nD], () => {
  if (activeTab.value !== 'nvda') return
  renderNVDADcfChart()
  renderNVDAEpsGainChart()
})
// NVDA historical P/E (updates when Finnhub data arrives)
watch(nHistPE, () => {
  if (activeTab.value === 'nvda') renderNVDAHistPEChart()
}, { deep: true })
// BX projection
watch([bDe1, bDe2, bPMin, bPMax, bG, bD, bProjZoomed], () => {
  if (activeTab.value !== 'bx') return
  renderBXProjChart()
  renderBXDeGainChart()
})
// BX DE growth
watch([bDe1, bDe2, bPay, bG], () => {
  if (activeTab.value !== 'bx') return
  renderBXDeChart()
  renderBXDeGainChart()
})
// Price throttle
watch(nvdaPrice, throttledNVDAPriceCharts)
watch(bxPrice, throttledBXPriceCharts)
watch(googlPrice, throttledGOOGLPriceCharts)
// GOOGL revenue model
watch([gR1, gR2, gR3, gR4], () => {
  if (activeTab.value === 'googl') renderGOOGLRevChart()
})
// GOOGL projection
watch([gEps1, gEps2, gPeMin, gPeMax, gG, gProjZoomed], () => {
  if (activeTab.value !== 'googl') return
  renderGOOGLProjChart()
  renderGOOGLEpsGainChart()
})
// GOOGL historical P/E (updates when Finnhub data arrives)
watch(gHistPE, () => {
  if (activeTab.value === 'googl') renderGOOGLHistPEChart()
}, { deep: true })
// GOOGL DCF chart
watch([gBaseEPS, gG5, gH5, gD], () => {
  if (activeTab.value !== 'googl') return
  renderGOOGLDcfChart()
  renderGOOGLEpsGainChart()
})
// Tab switch — render newly visible charts
watch(activeTab, (tab) => {
  if (tab === 'nvda')  renderNVDACharts()
  if (tab === 'bx')    renderBXCharts()
  if (tab === 'googl') renderGOOGLCharts()
}, { flush: 'post' })
// Persist watchlist
watch(watchlist, () => {
  if (!import.meta.client) return
  try { localStorage.setItem(WATCHLIST_KEY, JSON.stringify(watchlist.value)) } catch {}
}, { deep: true })
</script>

<template>
  <div class="sa-root relative flex flex-col lg:flex-row gap-0 h-full min-h-0">

    <!-- ── Mobile drawer ──────────────────────────────────────── -->
    <Teleport to="body">
      <div v-if="sidebarOpen && !isLg" class="lg:hidden fixed inset-0 z-[1100] bg-black/60" @click="toggleSidebar" aria-hidden="true" />
      <aside v-if="sidebarOpen && !isLg" class="lg:hidden fixed inset-y-0 left-0 z-[1101] w-[85vw] max-w-sm bg-zinc-950 backdrop-blur-xl flex flex-col overflow-hidden">
        <div class="flex-1 overflow-y-auto px-5 pt-8 pb-6 space-y-1">
          <div class="flex items-center justify-between mb-4">
            <span class="text-[12px] font-semibold tracking-widest uppercase text-zinc-400">Controls</span>
            <button @click="toggleSidebar" class="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <template v-for="group in currentSliders" :key="group.section + '-m'">
            <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">{{ group.section }}</p>
            <div v-for="s in group.items" :key="s.label + '-m'" class="py-1.5">
              <div class="flex items-baseline justify-between mb-1 gap-2">
                <span class="text-[12px] text-zinc-400 leading-tight">{{ s.label }}</span>
                <span class="text-[13px] font-medium text-zinc-200 tabular-nums whitespace-nowrap flex-shrink-0">{{ s.fmt(s.model.value) }}</span>
              </div>
              <input type="range" :min="s.min" :max="s.max" :step="s.step" v-model.number="s.model.value" class="w-full accent-blue-400" />
            </div>
          </template>
          <template v-if="activeTab === 'watchlist'">
            <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">Add Ticker</p>
            <div class="flex gap-2">
              <input type="text" v-model="newTicker" placeholder="e.g. MSFT" @keydown.enter="addTicker" class="flex-1 text-[13px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 placeholder-zinc-600" />
              <button @click="addTicker" class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-zinc-100 transition-colors">Add</button>
            </div>
          </template>
          <div class="pb-6" />
        </div>
      </aside>
    </Teleport>

    <!-- ── Desktop sidebar ────────────────────────────────────── -->
    <aside
      class="hidden lg:flex flex-shrink-0 flex-col overflow-hidden border-r border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm transition-[width] duration-300 ease-in-out"
      :class="sidebarOpen ? 'lg:w-80 xl:w-96' : 'lg:w-10'"
    >
      <button v-if="!sidebarOpen" @click="toggleSidebar" class="flex items-center justify-center w-10 h-10 mt-24 text-zinc-500 hover:text-zinc-200 transition-colors" title="Expand controls">
        <svg class="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
      </button>
      <div v-show="sidebarOpen" ref="sidebarScrollEl" class="flex-1 overflow-y-auto px-5 pt-24 pb-6 space-y-1">
        <template v-for="(group, gi) in currentSliders" :key="group.section">
          <div :class="gi === 0 ? 'flex items-center justify-between' : ''">
            <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">{{ group.section }}</p>
            <button v-if="gi === 0" @click="toggleSidebar" class="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors" title="Collapse controls">
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </button>
          </div>
          <div v-for="s in group.items" :key="s.label" class="py-1.5">
            <div class="flex items-baseline justify-between mb-1 gap-2">
              <span class="text-[12px] text-zinc-400 leading-tight">{{ s.label }}</span>
              <span class="text-[13px] font-medium text-zinc-200 tabular-nums whitespace-nowrap flex-shrink-0">{{ s.fmt(s.model.value) }}</span>
            </div>
            <input type="range" :min="s.min" :max="s.max" :step="s.step" v-model.number="s.model.value" class="w-full accent-blue-400" tabindex="-1" />
          </div>
        </template>
        <template v-if="activeTab === 'watchlist'">
          <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">Add Ticker</p>
          <div class="flex gap-2">
            <input type="text" v-model="newTicker" placeholder="e.g. MSFT" @keydown.enter="addTicker" class="flex-1 text-[13px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 placeholder-zinc-600" />
            <button @click="addTicker" class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-zinc-100 transition-colors">Add</button>
          </div>
        </template>
        <div class="pb-6" />
      </div>
    </aside>

    <!-- ── Main panel ─────────────────────────────────────────── -->
    <main class="flex-1 min-w-0 px-6 pt-24 pb-6 space-y-5 overflow-y-auto overflow-x-hidden">

      <!-- Mobile controls toggle -->
      <button @click="toggleSidebar" class="lg:hidden inline-flex items-center gap-2 text-[12px] px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-all">
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" /></svg>
        Controls
      </button>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'nvda' }" @click="activeTab = 'nvda'">NVDA</button>
        <button class="tab" :class="{ active: activeTab === 'bx' }" @click="activeTab = 'bx'">BX</button>
        <button class="tab" :class="{ active: activeTab === 'googl' }" @click="activeTab = 'googl'">GOOGL</button>
        <button class="tab" :class="{ active: activeTab === 'watchlist' }" @click="activeTab = 'watchlist'">Watchlist</button>
      </div>

      <!-- Live pill -->
      <div class="live-pill">
        <span class="live-dot" :class="{ paused: livePaused }" />
        <span>{{ statusText }}</span>
        <button type="button" class="live-toggle" @click="toggleLiveStream">{{ livePaused ? 'Resume' : 'Pause' }}</button>
      </div>

      <!-- ═══════════ NVDA TAB ═══════════ -->
      <div v-show="activeTab === 'nvda'" class="space-y-5">

        <!-- Metric cards -->
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div class="metric-card">
            <p class="mc-label">Current price</p>
            <p class="mc-value" v-if="nPriceReady">{{ dlr(nvdaPrice) }}</p>
            <p class="mc-value price-unavailable" v-else-if="nPriceState === 'error'">unavailable</p>
            <p class="mc-value" v-else><span class="skeleton-line" /></p>
            <p class="mc-sub" v-if="nPriceReady" :class="colCls(nvdaChg)">{{ absDlr(nvdaChg) }} ({{ pct(nvdaChgPct, 2) }})</p>
            <p class="mc-sub" v-else>{{ nPriceState === 'error' ? 'live quote failed' : 'fetching live price…' }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">1yr target range</p>
            <p class="mc-value">{{ n1Range }}</p>
            <p class="mc-sub" v-if="nPriceReady">{{ n1RangeSub }}</p>
            <p class="mc-sub" v-else-if="nPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
          <div class="metric-card">
            <p class="mc-label">2yr target range</p>
            <p class="mc-value">{{ n2Range }}</p>
            <p class="mc-sub" v-if="nPriceReady">{{ n2RangeSub }}</p>
            <p class="mc-sub" v-else-if="nPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
          <div class="metric-card metric-card-help">
            <div class="mc-head">
              <p class="mc-label">Two-phase DCF floor</p>
              <button type="button" class="help-dot" aria-label="Explain two-phase DCF floor">?</button>
              <div class="metric-help" role="tooltip">
                Present value estimate: {{ dlr(nDcfBreakdown.pvEarnings) }} discounted EPS + {{ dlr(nDcfBreakdown.pvTerminal) }} discounted terminal value.
              </div>
            </div>
            <p class="mc-value">{{ dlr(nFloor) }}</p>
            <p class="mc-sub" v-if="nPriceReady" :class="colCls(nVsFloor)">{{ nVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}</p>
            <p class="mc-sub" v-else-if="nPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
        </div>

        <!-- ── Conviction signal ──────────────────────────────────── -->
        <div v-if="nConviction" class="conviction-card" :class="`conviction-${nConviction.color}`">
          <div class="conviction-signal">{{ nConviction.signal }}</div>
          <div class="conviction-body">
            <div class="conviction-reason">{{ nConviction.reason }}</div>
            <div class="conviction-context">{{ nConviction.context }}</div>
          </div>
        </div>

        <!-- ── Scenario presets ───────────────────────────────────── -->
        <div class="card">
          <div class="card-title">Scenario presets — reconfigure the model</div>
          <div class="insight">Quick-load predefined scenarios: growth rates, terminal assumptions, and P/E multiples. Each preset applies a complete configuration to the DCF and valuation models. Click to apply; sliders adjust independently afterward.
            <span v-if="nActiveScenario.active" class="ml-2 text-zinc-400">
              Active: <strong>{{ nScenarioButtonLabel }}</strong>
              <button type="button" @click="applyNVDAScenario(nActiveScenario.active)" class="ml-1 text-blue-400 hover:text-blue-300 underline text-[12px]" v-if="nActiveScenario.isDirty">reset to {{ TICKER_CONFIG.NVDA.scenarios[nActiveScenario.active].label }}</button>
            </span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button v-for="(scenario, key) in TICKER_CONFIG.NVDA.scenarios" :key="key" class="scenario-btn" :class="{ active: nActiveScenario.active === key }" @click="applyNVDAScenario(key)">
              <div class="scenario-label">{{ scenario.label }}</div>
              <div class="scenario-desc">{{ scenario.description }}</div>
            </button>
          </div>
        </div>

        <!-- ── Scenario comparison strip ────────────────────────────── -->
        <div class="card">
          <div class="card-title">Scenario intrinsic floors</div>
          <div class="insight">{{ nScenarioCaption }}</div>

          <!-- Number line ─────────────────────────────────────────── -->
          <div class="scenario-numberline">
            <svg width="100%" height="40" preserveAspectRatio="none">
              <defs>
                <linearGradient id="nl-grad-bear">
                  <stop offset="0%" stop-color="#ef4444" />
                  <stop offset="100%" stop-color="#991b1b" />
                </linearGradient>
                <linearGradient id="nl-grad-base">
                  <stop offset="0%" stop-color="#f59e0b" />
                  <stop offset="100%" stop-color="#b45309" />
                </linearGradient>
                <linearGradient id="nl-grad-bull">
                  <stop offset="0%" stop-color="#10b981" />
                  <stop offset="100%" stop-color="#065f46" />
                </linearGradient>
              </defs>

              <!-- Baseline -->
              <line x1="2%" y1="50%" x2="98%" y2="50%" stroke="rgba(255,255,255,0.2)" stroke-width="1" />

              <!-- Bear marker -->
              <circle :cx="`${nScenarioLinePositions.bear}%`" cy="50%" r="2.5%" fill="url(#nl-grad-bear)" />
              <!-- Base marker -->
              <circle :cx="`${nScenarioLinePositions.base}%`" cy="50%" r="2.5%" fill="url(#nl-grad-base)" />
              <!-- Bull marker -->
              <circle :cx="`${nScenarioLinePositions.bull}%`" cy="50%" r="2.5%" fill="url(#nl-grad-bull)" />
              <!-- Price marker (hollow circle) — only once the live quote resolves -->
              <circle v-if="nPriceReady" :cx="`${nScenarioLinePositions.price}%`" cy="50%" r="2%" fill="none" stroke="#7dd3fc" stroke-width="0.3%" />
            </svg>
          </div>

          <!-- Legend ───────────────────────────────────────────────── -->
          <div class="chart-legend" style="margin-top: 1rem;">
            <span class="legend-item"><span class="legend-dot" style="background:#ef4444" />Bear</span>
            <span class="legend-item"><span class="legend-dot" style="background:#f59e0b" />Base</span>
            <span class="legend-item"><span class="legend-dot" style="background:#10b981" />Bull</span>
            <span class="legend-item"><span class="legend-circle" />Current price</span>
          </div>

          <!-- Comparison table ───────────────────────────────────── -->
          <table style="margin-top: 1.5rem;">
            <thead>
              <tr>
                <th>Scenario</th>
                <th style="text-align: right;">Yr-10 EPS</th>
                <th style="text-align: right;">Implied Revenue</th>
                <th style="text-align: right;">Floor</th>
                <th style="text-align: right;">Spot vs Floor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(label, key) in { bear: 'Bear', base: 'Base', bull: 'Bull' }" :key="key">
                <td><strong>{{ label }}</strong></td>
                <td style="text-align: right;">${{ nScenarioFloors[key]?.yr10EPS.toFixed(2) }}</td>
                <td style="text-align: right;">${{ (nScenarioImpliedRev[key] / 1000).toFixed(2) }}T</td>
                <td style="text-align: right;">${{ nScenarioFloors[key]?.floor.toFixed(2) }}</td>
                <td style="text-align: right;" :class="nPriceReady ? colCls(nvdaPrice - nScenarioFloors[key]?.floor) : ''">{{ nPriceReady ? pct((nvdaPrice - nScenarioFloors[key]?.floor) / nScenarioFloors[key]?.floor, 1) : '—' }}</td>
              </tr>
            </tbody>
          </table>

          <p class="note">Net margin computed from revenue model: 73% GM × (1 − 18.6% opex) × (1 − 15.88% tax) ÷ 24.432B shares = 16.39%. Implied revenue = Yr-10 EPS ÷ net margin.</p>
        </div>

        <!-- ── Historical P/E card ─────────────────────────────── -->
        <div class="card">
          <div class="card-title">Historical TTM P/E &mdash; context for your multiples</div>
          <div class="insight">Normal historical range: avg P/E plus or minus one standard deviation from the last {{ nHistPE.length }} quarters (Q4 2016 onward — pre-reorientation data excluded). In plain English, it shows the zone where NVDA&apos;s P/E has usually clustered. These bounds auto-seed the min/max P/E sliders. Override freely.</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
            <div class="tcard">
              <div class="tlabel">Avg TTM P/E</div>
              <div class="tprice">{{ nHistStats.avg.toFixed(1) }}&times;</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Typical spread</div>
              <div class="tprice">{{ nHistStats.sigma.toFixed(1) }}</div>
              <div class="tret">1 standard deviation</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">Low end of normal range</div>
              <div class="tprice">{{ nHistStats.low.toFixed(1) }}&times;</div>
              <div class="tret">current slider: {{ nPeMin.toFixed(1) }}&times;</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">High end of normal range</div>
              <div class="tprice">{{ nHistStats.high.toFixed(1) }}&times;</div>
              <div class="tret">current slider: {{ nPeMax.toFixed(1) }}&times;</div>
            </div>
          </div>

          <div class="chart-wrap" style="height:300px"><canvas ref="nHistPeCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />TTM P/E</span>
            <span class="legend-item"><span class="legend-dash" style="border-color:#888780" />Avg ({{ nHistStats.avg.toFixed(1) }}&times;)</span>
            <span class="legend-item"><span class="legend-fill" />Normal range</span>
          </div>
          <p class="note">Data from Finnhub basic-financials if &ge;8 quarters available since 2016; otherwise hardcoded 7-quarter seed. Pre-2016 data excluded — NVDA's business model changed fundamentally in FY2017.</p>
        </div>

        <!-- ── P/E Projection card ─────────────────────────────── -->
        <div class="card">
          <div class="card-title">P/E valuation &mdash; price targets &amp; 10-year projection</div>
          <div class="insight">Price target = Forward EPS &times; P/E multiple. Sliders default to the normal historical P/E range. Solid lines = 1yr/2yr targets; dotted = extrapolation.</div>

          <div class="section-label">1-year targets</div>
          <div class="targets">
            <div class="tcard hero"><div class="tlabel">High target</div><div class="tprice" :class="nPriceReady ? colCls(nP1h - nvdaPrice) : ''">{{ dlr(nP1h) }}</div><div class="tret" v-if="nPriceReady">{{ pct((nP1h - nvdaPrice) / nvdaPrice) }} from today</div><div class="tret" v-else-if="nPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard hero"><div class="tlabel">Low target</div><div class="tprice" :class="nPriceReady ? colCls(nP1l - nvdaPrice) : ''">{{ dlr(nP1l) }}</div><div class="tret" v-if="nPriceReady">{{ pct((nP1l - nvdaPrice) / nvdaPrice) }} from today</div><div class="tret" v-else-if="nPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
          </div>
          <div class="section-label">2-year targets</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">High target</div><div class="tprice" :class="nPriceReady ? colCls(nP2h - nvdaPrice) : ''">{{ dlr(nP2h) }}</div><div class="tret" v-if="nPriceReady">{{ pct((nP2h - nvdaPrice) / nvdaPrice) }} from today</div><div class="tret" v-else-if="nPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard"><div class="tlabel">Low target</div><div class="tprice" :class="nPriceReady ? colCls(nP2l - nvdaPrice) : ''">{{ dlr(nP2l) }}</div><div class="tret" v-if="nPriceReady">{{ pct((nP2l - nvdaPrice) / nvdaPrice) }} from today</div><div class="tret" v-else-if="nPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
          </div>

          <div class="chart-toolbar">
            <button class="zoom-btn" :class="{ active: nProjZoomed }" @click="nProjZoomed = !nProjZoomed">{{ nProjZoomed ? '\u21a9 Full 10yr' : '\uD83D\uDD0D Zoom 1\u20132yr' }}</button>
          </div>
          <div class="chart-wrap"><canvas ref="nProjCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#888780" />Today</span>
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />High (solid = targets)</span>
            <span v-if="!nProjZoomed" class="legend-item"><span class="legend-dash" style="border-color:#378ADD" />High (extrapolated)</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Low (solid = targets)</span>
            <span v-if="!nProjZoomed" class="legend-item"><span class="legend-dash" style="border-color:#1D9E75" />Low (extrapolated)</span>
          </div>
          <p class="note">Dotted lines extrapolate using projection growth g and the same P/E range &mdash; not a forecast.</p>
        </div>

        <!-- ── Two-phase DCF card ─────────────────────────────── -->
        <div class="card">
          <div class="card-title">Staged DCF &mdash; intrinsic floor</div>
          <div class="insight">This is a present-value estimate, not a price target. It grows consensus EPS for 2 years, then applies staged growth rates for 8 years, discounts those future dollars back at {{ nD }}%, and derives terminal value using the Rx formula.</div>
          <div class="insight">Current breakdown: {{ dlr(nDcfBreakdown.pvEarnings) }} from discounted year 1&ndash;10 EPS + {{ dlr(nDcfBreakdown.pvTerminal) }} from discounted terminal value = {{ dlr(nDcfBreakdown.floor) }}.</div>
          <div class="insight" :class="nDcfImpliedRev.flagged ? 'rev-sanity-warning' : ''">
            <strong>Yr-10 implied revenue:</strong> {{ dlr(nDcfImpliedRev.value / 1e12) }}T
            <span v-if="nDcfImpliedRev.flagged" class="rev-sanity-flag" title="This growth path implies annual revenue larger than the entire current global semiconductor industry. Confirm this is intended.">
              ⚠️ Exceeds sanity ceiling ($1.5T)
            </span>
          </div>
          <div class="targets">
            <div class="tcard">
              <div class="tlabel">Intrinsic floor</div>
              <div class="tprice">{{ dlr(nFloor) }}</div>
              <div class="tret">g5 {{ nG5 }}% &rarr; h5 {{ nH5 }}% &rarr; d {{ nD }}%</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Price vs floor</div>
              <div class="tprice" :class="colCls(nVsFloor)">{{ pct(nVsFloor) }}</div>
              <div class="tret">{{ nVsFloor >= 0 ? 'Stock below DCF floor' : 'Stock above DCF floor' }}</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Yr-5 EPS (g5)</div>
              <div class="tprice">{{ dlr(nDcfBreakdown.yr5EPS) }}</div>
              <div class="tret">from ${{ nBaseEPS.toFixed(2) }} base</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Yr-10 EPS (h5)</div>
              <div class="tprice">{{ dlr(nDcfBreakdown.yr10EPS) }}</div>
              <div class="tret">terminal &times; 10</div>
            </div>
          </div>
          <div class="chart-wrap"><canvas ref="nDcfCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />Phase 1 EPS &mdash; g5 (yr 0&ndash;5)</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Phase 2 EPS &mdash; h5 (yr 5&ndash;10)</span>
            <span class="legend-item"><span class="legend-dash" style="border-color:#f59e0b" />PV at d% (filled below)</span>
          </div>
          <p class="note">The amber fill shows each year&apos;s EPS discounted to present value at rate d. The gap between the EPS line and the fill widens with higher d &mdash; that compression is what sets the intrinsic floor.</p>
        </div>

        <!-- Revenue model -->
        <div class="card">
          <div class="card-title">FY2027 revenue model</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">FY2027 revenue</div><div class="tprice" :class="nRevHit1T ? 'pos' : ''">${{ nRevTotal.toFixed(0) }}B</div><div class="tret">{{ nRevHit1T ? 'Meets $1T' : `$${(1000 - nRevTotal).toFixed(0)}B short` }}</div></div>
            <div class="tcard"><div class="tlabel">FY2027 EPS (est.)</div><div class="tprice">{{ dlr(nRevEPSTotal) }}</div></div>
            <div class="tcard"><div class="tlabel">Implied P/E today</div><div class="tprice">{{ (nvdaPrice / nRevEPSTotal).toFixed(1) }}&times;</div></div>
            <div class="tcard"><div class="tlabel">QoQ avg growth</div><div class="tprice">{{ nRevQoQ.toFixed(1) }}%</div></div>
          </div>
          <div class="chart-wrap"><canvas ref="nRevCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />Revenue ($B)</span>
            <span class="legend-item"><span class="legend-line" style="background:#BA7517" />Quarterly EPS (right axis)</span>
          </div>
          <p class="note">73% gross margin &middot; 18.6% opex &middot; 15.88% tax &middot; 24.432B diluted shares</p>
        </div>

        <!-- ── EPS drives price card ───────────────────────────── -->
        <div class="card">
          <div class="card-title">EPS / normalized EPS drives price &mdash; historical evidence (FY2017&ndash;FY2026)</div>
          <div class="insight">From FY2017 to present, EPS and stock price CAGR are near-identical (70% vs 72%). Every 1% EPS gain translates to ~0.42% price rise. The multiple is earned, not speculative.</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
            <div class="tcard hero">
              <div class="tlabel">EPS / Price correlation</div>
              <div class="tprice">71%</div>
              <div class="tret">FY2017–present</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">Price beta to EPS</div>
              <div class="tprice">0.42&times;</div>
              <div class="tret">per 1% EPS gain</div>
            </div>
            <div class="tcard">
              <div class="tlabel">EPS CAGR (11yr)</div>
              <div class="tprice">~70%</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Price CAGR (11yr)</div>
              <div class="tprice">~72%</div>
            </div>
          </div>

          <div class="chart-wrap" style="height:220px"><canvas ref="nEpsGainCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />EPS gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Capital gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#7dd3fc" />Projected EPS gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#86efac" />Projected capital gain %</span>
          </div>
          <p class="note">FY2019 shows the negative-correlation test: EPS fell &minus;48%, stock fell &minus;31%. Even in drawdowns, price tracks EPS direction.</p>
          <p class="note">FY2023 exception: GAAP EPS fell again (down-cycle continued), yet the stock surged +239% as the market priced the AI inflection ahead of earnings &mdash; price led EPS by ~12 months. FY2026 is a partial year (YTD through March 30).</p>
          <p class="note">Projected years use Yahoo normalized consensus EPS seeds as slider defaults, with capital gain based on midpoint target prices from the current P/E range.</p>
        </div>

        <!-- NVDA Glossary -->
        <button class="glossary-toggle" @click="nvdaGlossaryOpen = !nvdaGlossaryOpen">
          <span>Key terms &mdash; NVDA analyzer</span>
          <span class="toggle-arrow" :class="{ open: nvdaGlossaryOpen }">&blacktriangledown;</span>
        </button>
        <div class="glossary-body" :class="{ open: nvdaGlossaryOpen }">
          <div class="gterm"><span class="gterm-name">EPS</span><span class="gterm-def">Earnings per share &mdash; the company's net profit divided by total shares.</span></div>
          <div class="gterm"><span class="gterm-name">Forward EPS</span><span class="gterm-def">An analyst's estimate of EPS over the next 12 months &mdash; projected, not yet reported.</span></div>
          <div class="gterm"><span class="gterm-name">P/E multiple</span><span class="gterm-def">Price-to-earnings &mdash; how much investors pay per $1 of earnings. Sliders now default to the normal historical range.</span></div>
          <div class="gterm"><span class="gterm-name">Two-phase DCF</span><span class="gterm-def">A discounted cash flow model split into a high-growth phase (yr 1&ndash;5 at g5) and a deceleration phase (yr 6&ndash;10 at h5). More realistic than a single-rate model for hyper-growth companies.</span></div>
          <div class="gterm"><span class="gterm-name">Discount rate d</span><span class="gterm-def">The annual return you require to justify holding this stock. Set at 12% &mdash; the most conservative benchmark used by any major analyst.</span></div>
          <div class="gterm"><span class="gterm-name">Intrinsic floor</span><span class="gterm-def">The minimum a stock should be worth based on DCF. A margin-of-safety check, not a price target.</span></div>
          <div class="gterm"><span class="gterm-name">Terminal value</span><span class="gterm-def">A lump-sum estimate of the business's value beyond year 10: year-10 EPS &times; 10, discounted to present.</span></div>
        </div>
      </div>

      <!-- ═══════════ BX TAB ═══════════ -->
      <div v-show="activeTab === 'bx'" class="space-y-5">

        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div class="metric-card">
            <p class="mc-label">Current price</p>
            <p class="mc-value" v-if="bPriceReady">{{ dlr(bxPrice) }}</p>
            <p class="mc-value price-unavailable" v-else-if="bPriceState === 'error'">unavailable</p>
            <p class="mc-value" v-else><span class="skeleton-line" /></p>
            <p class="mc-sub" v-if="bPriceReady" :class="colCls(bxChg)">{{ absDlr(bxChg) }} ({{ pct(bxChgPct, 2) }})</p>
            <p class="mc-sub" v-else>{{ bPriceState === 'error' ? 'live quote failed' : 'fetching live price…' }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">1yr target range</p>
            <p class="mc-value">{{ b1Range }}</p>
            <p class="mc-sub" v-if="bPriceReady">{{ b1RangeSub }}</p>
            <p class="mc-sub" v-else-if="bPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
          <div class="metric-card">
            <p class="mc-label">2yr target range</p>
            <p class="mc-value">{{ b2Range }}</p>
            <p class="mc-sub" v-if="bPriceReady">{{ b2RangeSub }}</p>
            <p class="mc-sub" v-else-if="bPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
          <div class="metric-card">
            <p class="mc-label">10yr intrinsic floor</p>
            <p class="mc-value">{{ dlr(bFloor) }}</p>
            <p class="mc-sub" v-if="bPriceReady" :class="colCls(bVsFloor)">{{ bVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}</p>
            <p class="mc-sub" v-else-if="bPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
        </div>

        <!-- ── Conviction signal ──────────────────────────────────── -->
        <div v-if="bConviction" class="conviction-card" :class="`conviction-${bConviction.color}`">
          <div class="conviction-signal">{{ bConviction.signal }}</div>
          <div class="conviction-body">
            <div class="conviction-reason">{{ bConviction.reason }}</div>
            <div class="conviction-context">{{ bConviction.context }}</div>
          </div>
        </div>

        <!-- ── Historical P/DE card ────────────────────────────── -->
        <div class="card">
          <div class="card-title">Historical Non-GAAP TTM P/DE &mdash; {{ bxQuarterCount }} quarters + live</div>
          <div class="insight">Full BX P/DE history from Q4 2014, plus a live current point using Finnhub price / latest reported {{ BX_LATEST_DE_SOURCE.label }} DE per share. Amber segments = below 20&times;. Blue band = 22&ndash;29&times; fair range.</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
            <div class="tcard">
              <div class="tlabel">All-time avg P/DE</div>
              <div class="tprice">{{ bxHistAvg.toFixed(1) }}&times;</div>
              <div class="tret">across {{ bxQuarterCount }} quarters</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Live P/DE</div>
              <div class="tprice" v-if="bPriceReady" :class="bxCurrentPde < 20 ? 'amber' : ''">{{ bxCurrentPde.toFixed(2) }}&times;</div>
              <div class="tprice price-unavailable" v-else-if="bPriceState === 'error'">unavailable</div>
              <div class="tprice" v-else><span class="skeleton-line" /></div>
              <div class="tret">{{ BX_LATEST_DE_SOURCE.label }} DE/share {{ dlr(BX_LATEST_DE_SOURCE.dePerShare) }}</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">Fair range</div>
              <div class="tprice">22&ndash;29&times;</div>
              <div class="tret">sourced from historical analysis</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">Buy-zone touches</div>
              <div class="tprice">{{ bxHistBelowBuyZone }}&thinsp;/&thinsp;{{ bxQuarterCount }}</div>
              <div class="tret">{{ bPriceReady && bxCurrentBelowBuyZone ? 'live point also below 20×' : 'historical quarters below 20×' }}</div>
            </div>
          </div>

          <div class="bx-hist-note">
            P/DE has touched below 20&times; in {{ bxHistBelowBuyZone }} of {{ bxQuarterCount }} completed quarters &mdash; historically a strong re-entry signal. Live reading: <strong v-if="bPriceReady">{{ bxCurrentPde.toFixed(2) }}&times;</strong><span v-else>{{ bPriceState === 'error' ? 'unavailable' : 'pending…' }}</span>.
          </div>

          <div class="chart-wrap" style="height:340px"><canvas ref="bHistPdeCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />P/DE (above 20&times;)</span>
            <span class="legend-item"><span class="legend-line" style="background:#f59e0b" />P/DE (below 20&times; — buy zone)</span>
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />Current = live price / DE</span>
            <span class="legend-item"><span class="legend-dash" style="border-color:#f59e0b" />20&times; threshold</span>
            <span class="legend-item"><span class="legend-fill" />22&ndash;29&times; fair range</span>
            <span class="legend-item"><span class="legend-dash" style="border-color:#888780" />All-time avg ({{ bxHistAvg.toFixed(1) }}&times;)</span>
          </div>
          <p class="note">Latest DE checked against Blackstone Q1 2026 earnings release: DE was $1.36/share in Q1 and $5.84/share over the LTM. Q4 2025 uses FY2025 DE/share of $5.57 and year-end price. 22&times;&ndash;29&times; range sourced from 10-year DE growth analysis.</p>
        </div>

        <!-- P/DE Projection -->
        <div class="card">
          <div class="card-title">P/DE valuation &mdash; price targets &amp; 10-year projection</div>
          <div class="insight">P/DE works like P/E but uses Distributable Earnings (DE) &mdash; a truer measure of BX cash generation than GAAP earnings. Total return = price appreciation + yield from distributions.</div>

          <div class="section-label">1-year targets</div>
          <div class="targets">
            <div class="tcard hero"><div class="tlabel">High target</div><div class="tprice" :class="bPriceReady ? colCls(bP1h - bxPrice) : ''">{{ dlr(bP1h) }}</div><template v-if="bPriceReady"><div class="tret">{{ pct((bP1h - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld1) }} yield = {{ pct((bP1h - bxPrice) / bxPrice + bYld1) }} total return</div></template><div class="tret" v-else-if="bPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard hero"><div class="tlabel">Low target</div><div class="tprice" :class="bPriceReady ? colCls(bP1l - bxPrice) : ''">{{ dlr(bP1l) }}</div><template v-if="bPriceReady"><div class="tret">{{ pct((bP1l - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld1) }} yield = {{ pct((bP1l - bxPrice) / bxPrice + bYld1) }} total return</div></template><div class="tret" v-else-if="bPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
          </div>
          <div class="section-label">2-year targets</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">High target</div><div class="tprice" :class="bPriceReady ? colCls(bP2h - bxPrice) : ''">{{ dlr(bP2h) }}</div><template v-if="bPriceReady"><div class="tret">{{ pct((bP2h - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld2) }} yield = {{ pct((bP2h - bxPrice) / bxPrice + bYld2) }} total return</div></template><div class="tret" v-else-if="bPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard"><div class="tlabel">Low target</div><div class="tprice" :class="bPriceReady ? colCls(bP2l - bxPrice) : ''">{{ dlr(bP2l) }}</div><template v-if="bPriceReady"><div class="tret">{{ pct((bP2l - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld2) }} yield = {{ pct((bP2l - bxPrice) / bxPrice + bYld2) }} total return</div></template><div class="tret" v-else-if="bPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
          </div>

          <div class="chart-toolbar">
            <button class="zoom-btn" :class="{ active: bProjZoomed }" @click="bProjZoomed = !bProjZoomed">{{ bProjZoomed ? '\u21a9 Full 10yr' : '\uD83D\uDD0D Zoom 1\u20132yr' }}</button>
          </div>
          <div class="chart-wrap"><canvas ref="bProjCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#888780" />Today</span>
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />High (solid = targets)</span>
            <span v-if="!bProjZoomed" class="legend-item"><span class="legend-dash" style="border-color:#378ADD" />High (extrapolated)</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Low (solid = targets)</span>
            <span v-if="!bProjZoomed" class="legend-item"><span class="legend-dash" style="border-color:#1D9E75" />Low (extrapolated)</span>
          </div>
          <p class="note">Dotted lines extrapolate using growth rate g and the same P/DE range &mdash; not a forecast.</p>
        </div>

        <!-- BX DCF -->
        <div class="card">
          <div class="card-title">20yr staged DCF (DpS-based) &mdash; intrinsic floor</div>
          <div class="insight">This uses Distributions per Share (not DE) and applies the Rx-derived terminal formula over 20 years. Terminal growth (12%) exceeds discount rate (10.78%), so terminal value grows with each additional year &mdash; this is intentional per the source analysis.</div>
          <div class="insight" style="background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e;">
            <strong>⚠️ Divergent terminal:</strong> Terminal value represents ~{{ (bTerminalPercent * 100).toFixed(0) }}% of intrinsic floor. The 20-year terminal count is a material assumption; adjust it to stress-test the floor.
          </div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">Intrinsic floor</div><div class="tprice">{{ dlr(bFloor) }}</div><div class="tret">DpS discounted to today</div></div>
            <div class="tcard"><div class="tlabel">Price vs floor</div><div class="tprice" :class="colCls(bVsFloor)">{{ pct(bVsFloor) }}</div><div class="tret">{{ bVsFloor >= 0 ? 'Appears undervalued vs floor' : 'Trades above DCF floor' }}</div></div>
          </div>
        </div>

        <!-- BX DE growth -->
        <div class="card">
          <div class="card-title">DE growth projection &mdash; 3-year outlook</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">Yr 3 DE/share</div><div class="tprice">{{ dlr(bDeYears[3]) }}</div><div class="tret">{{ pct(Math.pow(1 + bG / 100, 3) - 1) }} cumulative growth</div></div>
            <div class="tcard"><div class="tlabel">Yr 3 distribution</div><div class="tprice">{{ dlr(bDistYears[3]) }}</div><div class="tret" v-if="bPriceReady">{{ bYr3Yield.toFixed(1) }}% yield on today's price</div><div class="tret" v-else-if="bPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard"><div class="tlabel">Yr 1 yield</div><div class="tprice" v-if="bPriceReady">{{ (bYld1 * 100).toFixed(2) }}%</div><div class="tprice" v-else-if="bPriceState === 'error'">—</div><div class="tprice" v-else><span class="skeleton-line" /></div><div class="tret">{{ dlr(bPay / 100 * bDe1) }}/share</div></div>
            <div class="tcard"><div class="tlabel">10yr intrinsic floor</div><div class="tprice">{{ dlr(bFloor) }}</div></div>
          </div>
          <div class="chart-wrap"><canvas ref="bDeCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />DE per share</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Distribution per share (right axis)</span>
          </div>
        </div>

        <!-- BX DE drives price -->
        <div class="card">
          <div class="card-title">DE drives price &mdash; historical evidence (2021&ndash;2025)</div>
          <div class="insight">BX is better analyzed with non-GAAP Distributable Earnings than GAAP EPS. This chart mirrors the NVDA/GOOGL EPS chart, but swaps EPS for DE/share and keeps capital gain separate from distributions.</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
            <div class="tcard hero">
              <div class="tlabel">Latest LTM DE/share</div>
              <div class="tprice">{{ dlr(BX_LATEST_DE_SOURCE.dePerShare) }}</div>
              <div class="tret">{{ BX_LATEST_DE_SOURCE.label }}</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">2026E DE/share</div>
              <div class="tprice">{{ dlr(bDe1) }}</div>
              <div class="tret">{{ pct(bDe1 / BX_LATEST_DE_SOURCE.dePerShare - 1) }} vs LTM</div>
            </div>
            <div class="tcard">
              <div class="tlabel">2027E DE/share</div>
              <div class="tprice">{{ dlr(bDe2) }}</div>
              <div class="tret">{{ pct(bDe2 / bDe1 - 1) }} vs 2026E</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Projected yield</div>
              <div class="tprice" v-if="bPriceReady">{{ (bYld1 * 100).toFixed(1) }}%</div>
              <div class="tprice" v-else-if="bPriceState === 'error'">—</div>
              <div class="tprice" v-else><span class="skeleton-line" /></div>
              <div class="tret">based on payout slider</div>
            </div>
          </div>

          <div class="chart-wrap" style="height:240px"><canvas ref="bDeGainCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />DE/share gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Capital gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#7dd3fc" />Projected DE/share gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#86efac" />Projected capital gain %</span>
          </div>
          <p class="note">Historical DE/share uses Blackstone non-GAAP DE per common share. Capital gain excludes dividends, which are a major part of BX total return.</p>
          <p class="note">Projected years use explicit DE/share seeds in the sliders, not Yahoo normalized EPS. Tooltip shows DE/share, implied price, and distribution yield.</p>
        </div>

        <!-- BX Glossary -->
        <button class="glossary-toggle" @click="bxGlossaryOpen = !bxGlossaryOpen">
          <span>Key terms &mdash; BX analyzer</span>
          <span class="toggle-arrow" :class="{ open: bxGlossaryOpen }">&blacktriangledown;</span>
        </button>
        <div class="glossary-body" :class="{ open: bxGlossaryOpen }">
          <div class="gterm"><span class="gterm-name">DE (distributable earnings)</span><span class="gterm-def">The cash BX actually generates and can pay out. All Wall Street analysts use DE when valuing Blackstone.</span></div>
          <div class="gterm"><span class="gterm-name">P/DE multiple</span><span class="gterm-def">Price-to-distributable-earnings &mdash; BX's equivalent of a P/E ratio.</span></div>
          <div class="gterm"><span class="gterm-name">Payout ratio</span><span class="gterm-def">The percentage of DE paid out to shareholders as cash distributions. BX historically pays ~85%.</span></div>
          <div class="gterm"><span class="gterm-name">Distribution</span><span class="gterm-def">Cash paid regularly to shareholders. Equal to DE &times; payout ratio. The yield component of total return.</span></div>
          <div class="gterm"><span class="gterm-name">Total return</span><span class="gterm-def">Price appreciation plus yield (distributions received). For BX, yield is a meaningful part of the investment case.</span></div>
          <div class="gterm"><span class="gterm-name">Buy zone (&lt;20&times;)</span><span class="gterm-def">Historically, P/DE below 20&times; has been a reliable re-entry signal. It has occurred in {{ bxHistBelowBuyZone }} of {{ bxQuarterCount }} completed quarters.</span></div>
          <div class="gterm"><span class="gterm-name">DCF intrinsic floor</span><span class="gterm-def">The minimum BX should be worth based on future DE discounted to today's dollars.</span></div>
        </div>
      </div>

      <!-- ═══════════ GOOGL TAB ═══════════ -->
      <div v-show="activeTab === 'googl'" class="space-y-5">

        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div class="metric-card">
            <p class="mc-label">Current price</p>
            <p class="mc-value" v-if="gPriceReady">{{ dlr(googlPrice) }}</p>
            <p class="mc-value price-unavailable" v-else-if="gPriceState === 'error'">unavailable</p>
            <p class="mc-value" v-else><span class="skeleton-line" /></p>
            <p class="mc-sub" v-if="gPriceReady" :class="colCls(googlChg)">{{ absDlr(googlChg) }} ({{ pct(googlChgPct, 2) }})</p>
            <p class="mc-sub" v-else>{{ gPriceState === 'error' ? 'live quote failed' : 'fetching live price…' }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">1yr target range</p>
            <p class="mc-value">{{ g1Range }}</p>
            <p class="mc-sub" v-if="gPriceReady">{{ g1RangeSub }}</p>
            <p class="mc-sub" v-else-if="gPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
          <div class="metric-card">
            <p class="mc-label">2yr target range</p>
            <p class="mc-value">{{ g2Range }}</p>
            <p class="mc-sub" v-if="gPriceReady">{{ g2RangeSub }}</p>
            <p class="mc-sub" v-else-if="gPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
          <div class="metric-card metric-card-help">
            <div class="mc-head">
              <p class="mc-label">Two-phase DCF floor</p>
              <button type="button" class="help-dot" aria-label="Explain two-phase DCF floor">?</button>
              <div class="metric-help" role="tooltip">
                Present value estimate: {{ dlr(gDcfBreakdown.pvEarnings) }} discounted EPS + {{ dlr(gDcfBreakdown.pvTerminal) }} discounted terminal value.
              </div>
            </div>
            <p class="mc-value">{{ dlr(gFloor) }}</p>
            <p class="mc-sub" v-if="gPriceReady" :class="colCls(gVsFloor)">{{ gVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}</p>
            <p class="mc-sub" v-else-if="gPriceState === 'error'">price unavailable</p>
            <p class="mc-sub" v-else><span class="skeleton-line skeleton-sm" /></p>
          </div>
        </div>

        <!-- ── Conviction signal ──────────────────────────────────── -->
        <div v-if="gConviction" class="conviction-card" :class="`conviction-${gConviction.color}`">
          <div class="conviction-signal">{{ gConviction.signal }}</div>
          <div class="conviction-body">
            <div class="conviction-reason">{{ gConviction.reason }}</div>
            <div class="conviction-context">{{ gConviction.context }}</div>
          </div>
        </div>

        <!-- ── Historical P/E card ─────────────────────────────── -->
        <div class="card">
          <div class="card-title">Historical TTM P/E &mdash; context for your multiples</div>
          <div class="insight">Normal historical range: avg P/E plus or minus one standard deviation from the last {{ gHistPE.length }} quarters. In plain English, it shows the zone where GOOGL&apos;s P/E has usually clustered. Seeded with 7-quarter hardcoded data; overridden by Finnhub if &ge;8 quarters available since 2016.</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
            <div class="tcard">
              <div class="tlabel">Avg TTM P/E</div>
              <div class="tprice">{{ gHistStats.avg.toFixed(1) }}&times;</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Typical spread</div>
              <div class="tprice">{{ gHistStats.sigma.toFixed(1) }}</div>
              <div class="tret">1 standard deviation</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">Low end of normal range</div>
              <div class="tprice">{{ gHistStats.low.toFixed(1) }}&times;</div>
              <div class="tret">current slider: {{ gPeMin.toFixed(1) }}&times;</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">High end of normal range</div>
              <div class="tprice">{{ gHistStats.high.toFixed(1) }}&times;</div>
              <div class="tret">current slider: {{ gPeMax.toFixed(1) }}&times;</div>
            </div>
          </div>

          <div class="chart-wrap" style="height:300px"><canvas ref="gHistPeCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />TTM P/E</span>
            <span class="legend-item"><span class="legend-dash" style="border-color:#888780" />Avg ({{ gHistStats.avg.toFixed(1) }}&times;)</span>
            <span class="legend-item"><span class="legend-fill" />Normal range</span>
          </div>
          <p class="note">GOOGL fiscal year = calendar year. P/E has been more stable than NVDA &mdash; 20&ndash;35&times; for most of the post-2017 period, briefly dipping below 20&times; in 2022.</p>
        </div>

        <!-- ── P/E Projection card ─────────────────────────────── -->
        <div class="card">
          <div class="card-title">P/E valuation &mdash; price targets &amp; 10-year projection</div>
          <div class="insight">Price target = Forward EPS &times; P/E multiple. Sliders default to the normal historical P/E range. Solid lines = 1yr/2yr targets; dotted = extrapolation.</div>

          <div class="section-label">1-year targets</div>
          <div class="targets">
            <div class="tcard hero"><div class="tlabel">High target</div><div class="tprice" :class="gPriceReady ? colCls(gP1h - googlPrice) : ''">{{ dlr(gP1h) }}</div><div class="tret" v-if="gPriceReady">{{ pct((gP1h - googlPrice) / googlPrice) }} from today</div><div class="tret" v-else-if="gPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard hero"><div class="tlabel">Low target</div><div class="tprice" :class="gPriceReady ? colCls(gP1l - googlPrice) : ''">{{ dlr(gP1l) }}</div><div class="tret" v-if="gPriceReady">{{ pct((gP1l - googlPrice) / googlPrice) }} from today</div><div class="tret" v-else-if="gPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
          </div>
          <div class="section-label">2-year targets</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">High target</div><div class="tprice" :class="gPriceReady ? colCls(gP2h - googlPrice) : ''">{{ dlr(gP2h) }}</div><div class="tret" v-if="gPriceReady">{{ pct((gP2h - googlPrice) / googlPrice) }} from today</div><div class="tret" v-else-if="gPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
            <div class="tcard"><div class="tlabel">Low target</div><div class="tprice" :class="gPriceReady ? colCls(gP2l - googlPrice) : ''">{{ dlr(gP2l) }}</div><div class="tret" v-if="gPriceReady">{{ pct((gP2l - googlPrice) / googlPrice) }} from today</div><div class="tret" v-else-if="gPriceState === 'error'">price unavailable</div><div class="tret" v-else><span class="skeleton-line skeleton-sm" /></div></div>
          </div>

          <div class="chart-toolbar">
            <button class="zoom-btn" :class="{ active: gProjZoomed }" @click="gProjZoomed = !gProjZoomed">{{ gProjZoomed ? '\u21a9 Full 10yr' : '\uD83D\uDD0D Zoom 1\u20132yr' }}</button>
          </div>
          <div class="chart-wrap"><canvas ref="gProjCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#888780" />Today</span>
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />High (solid = targets)</span>
            <span v-if="!gProjZoomed" class="legend-item"><span class="legend-dash" style="border-color:#378ADD" />High (extrapolated)</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Low (solid = targets)</span>
            <span v-if="!gProjZoomed" class="legend-item"><span class="legend-dash" style="border-color:#1D9E75" />Low (extrapolated)</span>
          </div>
          <p class="note">Dotted lines extrapolate using projection growth g and the same P/E range &mdash; not a forecast.</p>
        </div>

        <!-- ── Staged DCF card ─────────────────────────────── -->
        <div class="card">
          <div class="card-title">Staged DCF &mdash; intrinsic floor</div>
          <div class="insight">This is a present-value estimate, not a price target. It grows EPS in two stages (20% for 5 years, then 12% for 5 years), discounts those future dollars back at {{ gD }}%, and derives terminal value using the Rx formula (not a fixed multiple).</div>
          <div class="insight">⚠️ <strong>Economics changed from the previous fixed-10x method.</strong> Floor shifted from $341.65 to {{ dlr(gFloor) }} (+5.7%) due to the terminal method. Terminal value is now derived from the Rx formula rather than hardcoded. Growth inputs remain unreconciled to a source analysis.</div>
          <div v-if="gTerminalDiverges" class="insight" style="background: #fef3c7; border-left: 4px solid #f59e0b; color: #92400e;">
            <strong>⚠️ Divergent terminal:</strong> Terminal growth ({{ (TICKER_CONFIG.GOOGL.terminal.growth * 100).toFixed(1) }}%) exceeds discount rate ({{ gD }}%), so terminal value grows with each additional year. Terminal value represents ~{{ (gTerminalPercent * 100).toFixed(0) }}% of intrinsic floor.
          </div>
          <div class="insight">Current breakdown: {{ dlr(gDcfBreakdown.pvEarnings) }} from discounted year 1&ndash;10 EPS + {{ dlr(gDcfBreakdown.pvTerminal) }} from discounted terminal value = {{ dlr(gDcfBreakdown.floor) }}.</div>
          <div class="targets">
            <div class="tcard">
              <div class="tlabel">Intrinsic floor</div>
              <div class="tprice">{{ dlr(gFloor) }}</div>
              <div class="tret">g5 {{ gG5 }}% &rarr; h5 {{ gH5 }}% &rarr; d {{ gD }}%</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Price vs floor</div>
              <div class="tprice" :class="colCls(gVsFloor)">{{ pct(gVsFloor) }}</div>
              <div class="tret">{{ gVsFloor >= 0 ? 'Stock below DCF floor' : 'Stock above DCF floor' }}</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Yr-5 EPS (g5)</div>
              <div class="tprice">{{ dlr(gDcfBreakdown.yr5EPS) }}</div>
              <div class="tret">from ${{ gBaseEPS.toFixed(2) }} base</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Yr-10 EPS (h5)</div>
              <div class="tprice">{{ dlr(gDcfBreakdown.yr10EPS) }}</div>
              <div class="tret">terminal &times; 10</div>
            </div>
          </div>
          <div class="chart-wrap"><canvas ref="gDcfCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />Phase 1 EPS &mdash; g5 (yr 0&ndash;5)</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Phase 2 EPS &mdash; h5 (yr 5&ndash;10)</span>
            <span class="legend-item"><span class="legend-dash" style="border-color:#f59e0b" />PV at d% (filled below)</span>
          </div>
          <p class="note">The amber fill shows each year&apos;s EPS discounted to present value at rate d. The gap between the EPS line and the fill widens with higher d &mdash; that compression is what sets the intrinsic floor.</p>
        </div>

        <!-- Revenue model -->
        <div class="card">
          <div class="card-title">FY2026 revenue model</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">FY2026 revenue</div><div class="tprice">${{ gRevTotal.toFixed(0) }}B</div><div class="tret">calendar year 2026</div></div>
            <div class="tcard"><div class="tlabel">FY2026 EPS (est.)</div><div class="tprice">{{ dlr(gRevEPSTotal) }}</div></div>
            <div class="tcard"><div class="tlabel">Implied P/E today</div><div class="tprice">{{ (googlPrice / gRevEPSTotal).toFixed(1) }}&times;</div></div>
            <div class="tcard"><div class="tlabel">QoQ avg growth</div><div class="tprice">{{ gRevQoQ.toFixed(1) }}%</div></div>
          </div>
          <div class="chart-wrap"><canvas ref="gRevCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />Revenue ($B)</span>
            <span class="legend-item"><span class="legend-line" style="background:#BA7517" />Quarterly EPS (right axis)</span>
          </div>
          <p class="note">58% gross margin &middot; 44.9% opex/gross &middot; 14% tax &middot; 12.3B diluted shares. Calibrated to Q4 2025 actuals ($96.5B rev, $2.15 EPS).</p>
        </div>

        <!-- ── EPS drives price card ───────────────────────────── -->
        <div class="card">
          <div class="card-title">EPS / normalized EPS drives price &mdash; historical evidence (2017&ndash;2025)</div>
          <div class="insight">GOOGL's EPS and stock price track each other more tightly than NVDA &mdash; higher correlation, beta closer to 1.0. Fiscal year = calendar year, so no lag between EPS reporting period and price return.</div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-1">
            <div class="tcard hero">
              <div class="tlabel">2022 test</div>
              <div class="tprice neg">&minus;21% / &minus;39%</div>
              <div class="tret">EPS fell, stock overcorrected</div>
            </div>
            <div class="tcard hero">
              <div class="tlabel">2021 divergence</div>
              <div class="tprice">+91% / +65%</div>
              <div class="tret">EPS led stock &mdash; mkt pre-priced</div>
            </div>
            <div class="tcard">
              <div class="tlabel">2025 re-rate</div>
              <div class="tprice pos">+65%</div>
              <div class="tret">AI momentum + EPS +34%</div>
            </div>
            <div class="tcard">
              <div class="tlabel">Fiscal year end</div>
              <div class="tprice" style="font-size:15px">December</div>
              <div class="tret">calendar year &mdash; no offset</div>
            </div>
          </div>

          <div class="chart-wrap" style="height:220px"><canvas ref="gEpsGainCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />EPS gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Capital gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#7dd3fc" />Projected EPS gain %</span>
            <span class="legend-item"><span class="legend-line" style="background:#86efac" />Projected capital gain %</span>
          </div>
          <p class="note">2022: EPS fell &minus;21%, stock fell &minus;39% &mdash; market overcorrected, setting up the +58% rebound in 2023 on +27% EPS growth.</p>
          <p class="note">2021: EPS surged +91% but stock gained only +65% &mdash; the market had already priced in growth ahead of earnings, mirror image of NVDA&apos;s 2023.</p>
          <p class="note">Yahoo consensus currently implies a near-flat 2027 EPS step: $14.24 in 2026 to $14.49 in 2027, or roughly +1.8% growth.</p>
          <p class="note">Projected years use Yahoo normalized consensus EPS seeds as slider defaults, with capital gain based on midpoint target prices from the current P/E range.</p>
        </div>

        <!-- GOOGL Glossary -->
        <button class="glossary-toggle" @click="googlGlossaryOpen = !googlGlossaryOpen">
          <span>Key terms &mdash; GOOGL analyzer</span>
          <span class="toggle-arrow" :class="{ open: googlGlossaryOpen }">&blacktriangledown;</span>
        </button>
        <div class="glossary-body" :class="{ open: googlGlossaryOpen }">
          <div class="gterm"><span class="gterm-name">EPS</span><span class="gterm-def">Earnings per share &mdash; net profit divided by shares outstanding.</span></div>
          <div class="gterm"><span class="gterm-name">Forward EPS</span><span class="gterm-def">Analyst consensus estimate of EPS over the next 12 months.</span></div>
          <div class="gterm"><span class="gterm-name">P/E multiple</span><span class="gterm-def">Price-to-earnings &mdash; how much investors pay per $1 of earnings. GOOGL's range is more stable than NVDA's (20&ndash;35&times; for most of the post-2017 period).</span></div>
          <div class="gterm"><span class="gterm-name">Two-phase DCF</span><span class="gterm-def">A discounted cash flow model split into a high-growth phase (yr 1&ndash;5 at g5) and a deceleration phase (yr 6&ndash;10 at h5).</span></div>
          <div class="gterm"><span class="gterm-name">Fiscal year end</span><span class="gterm-def">December 31 &mdash; unlike NVDA (late January), GOOGL's fiscal year aligns with the calendar year. No offset needed between EPS period and stock return period.</span></div>
          <div class="gterm"><span class="gterm-name">Intrinsic floor</span><span class="gterm-def">The minimum GOOGL should be worth based on future EPS discounted to today's dollars. A margin-of-safety check, not a price target.</span></div>
        </div>
      </div>

      <!-- ═══════════ WATCHLIST TAB ═══════════ -->
      <div v-show="activeTab === 'watchlist'" class="space-y-4">
        <div class="lg:hidden add-row">
          <input type="text" v-model="newTicker" placeholder="Add ticker (e.g. MSFT)" @keydown.enter="addTicker" />
          <button @click="addTicker">Add</button>
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:13%">Ticker</th>
              <th style="width:15%">Price</th>
              <th style="width:15%">Day chg</th>
              <th style="width:12%">Day %</th>
              <th style="width:18%">vs basis</th>
              <th style="width:18%">Basis</th>
              <th style="width:9%" />
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in watchlistRows" :key="row.ticker">
              <td><span class="badge">{{ row.ticker }}</span></td>
              <td style="font-weight:500">{{ row.price > 0 ? dlr(row.price) : '\u2014' }}</td>
              <td :class="colCls(row.change)">{{ row.price > 0 ? absDlr(row.change) : '\u2014' }}</td>
              <td :class="colCls(row.changePct)">{{ row.price > 0 ? pct(row.changePct) : '\u2014' }}</td>
              <td :class="row.vsBasis !== null ? colCls(row.vsBasis) : ''">{{ row.vsBasis !== null ? pct(row.vsBasis) : '\u2014' }}</td>
              <td class="basis-cell">{{ row.basis ? dlr(row.basis) : '\u2014' }}</td>
              <td><button class="remove-btn" @click="removeTicker(row.ticker)">&times;</button></td>
            </tr>
          </tbody>
        </table>
        <p class="note">Basis prices loaded from spreadsheet. vs basis shows total gain/loss since original purchase price.</p>
      </div>

    </main>
  </div>
</template>

<style scoped>
.sa-root {
  --c-bg: #09090b;
  --c-bg2: #18181b;
  --c-border: rgba(255,255,255,0.08);
  --c-border2: rgba(255,255,255,0.13);
  --c-text: #f4f4f5;
  --c-text2: #a1a1aa;
  --c-text3: #71717a;
  --c-pos: #4ade80;
  --c-neg: #f87171;
  --c-amber: #f59e0b;
  --c-info-text: #7dd3fc;
  --c-info-bg: rgba(56,189,248,0.08);
  --r-md: 6px;
  --r-lg: 12px;
}

/* ─── Tabs ───────────────────────────────────────────────────── */
.tabs { display: flex; gap: 2px; border-bottom: 0.5px solid var(--c-border); }
.tab { padding: 8px 18px; font-size: 14px; cursor: pointer; border: none; background: none; color: var(--c-text2); border-bottom: 2px solid transparent; margin-bottom: -0.5px; font-family: inherit; transition: color 0.15s; }
.tab.active { color: var(--c-text); border-bottom-color: var(--c-text); font-weight: 500; }
.tab:hover:not(.active) { color: var(--c-text); }

/* ─── Metric cards ───────────────────────────────────────────── */
.metric-card { background: var(--c-bg2); border-radius: var(--r-md); padding: 12px 14px; border: 0.5px solid var(--c-border); }
.metric-card-help { position: relative; }
.mc-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
.mc-label { font-size: 11px; color: var(--c-text2); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
.mc-head .mc-label { margin-bottom: 0; }
.mc-value { font-size: 22px; font-weight: 500; color: var(--c-text); line-height: 1.2; }
.mc-sub { font-size: 12px; margin-top: 3px; color: var(--c-text2); }
.help-dot {
  width: 17px;
  height: 17px;
  border-radius: 999px;
  border: 0.5px solid var(--c-border2);
  background: var(--c-bg);
  color: var(--c-info-text);
  font-size: 11px;
  line-height: 1;
  cursor: help;
  font-family: inherit;
  flex-shrink: 0;
}
.metric-help {
  position: absolute;
  top: 36px;
  right: 10px;
  z-index: 20;
  width: min(280px, calc(100vw - 48px));
  padding: 10px 12px;
  border-radius: var(--r-md);
  border: 0.5px solid rgba(125,211,252,0.35);
  background: rgba(9,9,11,0.96);
  color: var(--c-info-text);
  font-size: 12px;
  line-height: 1.45;
  box-shadow: 0 14px 30px rgba(0,0,0,0.35);
  opacity: 0;
  pointer-events: none;
  transform: translateY(-4px);
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.help-dot:hover + .metric-help,
.help-dot:focus-visible + .metric-help,
.metric-help:hover {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.pos   { color: var(--c-pos)   !important; }
.neg   { color: var(--c-neg)   !important; }
.amber { color: var(--c-amber) !important; }

/* ─── Cards ──────────────────────────────────────────────────── */
.card { background: var(--c-bg); border: 0.5px solid var(--c-border); border-radius: var(--r-lg); padding: 1.25rem; }
.card-title { font-size: 11px; font-weight: 500; color: var(--c-text2); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }

/* ─── Target cards ───────────────────────────────────────────── */
.targets { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 10px; margin-top: 1rem; }
.tcard { background: var(--c-bg2); border-radius: var(--r-md); padding: 12px; }
.tcard.hero { background: var(--c-bg); border: 0.5px solid var(--c-border2); }
.tlabel { font-size: 11px; color: var(--c-text3); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
.tprice { font-size: 22px; font-weight: 500; line-height: 1.2; color: var(--c-text); }
.tret { font-size: 12px; margin-top: 3px; color: var(--c-text2); }
.tyield { font-size: 11px; margin-top: 2px; color: var(--c-text2); }

/* ─── Charts ─────────────────────────────────────────────────── */
.chart-toolbar { display: flex; justify-content: flex-end; margin-top: 1.25rem; }
.zoom-btn { font-size: 11px; padding: 4px 10px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); color: var(--c-text2); cursor: pointer; font-family: inherit; transition: background 0.15s, color 0.15s; }
.zoom-btn:hover { background: var(--c-bg2); color: var(--c-text); }
.zoom-btn.active { background: var(--c-bg2); color: var(--c-text); border-color: var(--c-text2); }
.chart-wrap { position: relative; width: 100%; height: 260px; margin-top: 0.5rem; }
.chart-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--c-text2); flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-line { width: 18px; height: 2px; display: inline-block; }
.legend-dash { width: 18px; height: 0; border-top: 2px dashed; display: inline-block; }
.legend-fill { width: 18px; height: 10px; display: inline-block; background: rgba(55,138,221,0.15); border: 0.5px solid rgba(55,138,221,0.3); border-radius: 2px; }
.legend-dot { width: 10px; height: 10px; display: inline-block; border-radius: 50%; }
.legend-circle { width: 10px; height: 10px; display: inline-block; border-radius: 50%; border: 2px solid #7dd3fc; background: transparent; }

/* ─── Scenario comparison ──────────────────────────────────── */
.scenario-numberline { margin: 1rem 0; }
.scenario-numberline svg { display: block; width: 100%; }

/* ─── Table ──────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
th { text-align: left; font-size: 11px; font-weight: 500; color: var(--c-text2); padding: 6px 8px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 0.5px solid var(--c-border); }
td { padding: 9px 8px; border-bottom: 0.5px solid var(--c-border); color: var(--c-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--c-bg2); }
.basis-cell { color: var(--c-text2); font-size: 12px; }

/* ─── Misc ───────────────────────────────────────────────────── */
.badge { font-size: 11px; font-weight: 500; background: var(--c-bg2); padding: 2px 8px; border-radius: 4px; color: var(--c-text2); }
.live-pill { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 11px; color: var(--c-text2); background: var(--c-bg2); padding: 4px 10px 4px 12px; border-radius: 20px; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; flex-shrink: 0; }
.live-dot.paused { animation: none; background: var(--c-text3); }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.live-toggle { font-size: 11px; padding: 3px 10px; margin-left: 2px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); color: var(--c-text); cursor: pointer; font-family: inherit; transition: background 0.15s; }
.live-toggle:hover { background: var(--c-bg2); }

.add-row { display: flex; gap: 8px; }
.add-row input[type=text] { flex: 1; font-size: 13px; padding: 6px 10px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); color: var(--c-text); font-family: inherit; }
.add-row input[type=text]::placeholder { color: var(--c-text3); }
.add-row button { font-size: 13px; padding: 6px 14px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); cursor: pointer; color: var(--c-text); font-family: inherit; transition: background 0.15s; }
.add-row button:hover { background: var(--c-bg2); }
.remove-btn { font-size: 11px; color: var(--c-neg); padding: 3px 8px; border: none; background: transparent; cursor: pointer; }
.remove-btn:hover { opacity: 0.7; }

.insight { background: var(--c-info-bg); border-radius: var(--r-md); padding: 10px 14px; font-size: 12px; color: var(--c-info-text); margin-bottom: 1rem; line-height: 1.6; }
.note { font-size: 12px; color: var(--c-text2); margin-top: 8px; line-height: 1.5; }
.section-label { font-size: 11px; font-weight: 500; color: var(--c-text2); text-transform: uppercase; letter-spacing: 0.05em; margin: 1.25rem 0 0.75rem; }
.bx-hist-note { background: rgba(245,158,11,0.08); border-radius: var(--r-md); padding: 10px 14px; font-size: 12px; color: #fbbf24; margin-bottom: 0.75rem; line-height: 1.6; }
.bx-hist-note strong { font-weight: 600; }

/* ─── Conviction signal ──────────────────────────────────────── */
.conviction-card { display: flex; align-items: center; gap: 1rem; padding: 14px 18px; border-radius: var(--r-md); border: 1px solid; }
.conviction-card.conviction-emerald { background: rgba(16,185,129,0.08); border-color: rgba(16,185,129,0.35); }
.conviction-card.conviction-green   { background: rgba(34,197,94,0.08);  border-color: rgba(34,197,94,0.35); }
.conviction-card.conviction-yellow  { background: rgba(234,179,8,0.08);  border-color: rgba(234,179,8,0.35); }
.conviction-card.conviction-red     { background: rgba(239,68,68,0.08);  border-color: rgba(239,68,68,0.35); }
.conviction-signal { font-size: 17px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; }
.conviction-emerald .conviction-signal { color: #34d399; }
.conviction-green   .conviction-signal { color: #4ade80; }
.conviction-yellow  .conviction-signal { color: #facc15; }
.conviction-red     .conviction-signal { color: #f87171; }
.conviction-body { flex: 1; min-width: 0; }
.conviction-reason  { font-size: 13px; font-weight: 500; color: var(--c-text); line-height: 1.4; }
.conviction-context { font-size: 11.5px; color: var(--c-text2); margin-top: 3px; line-height: 1.4; }

/* ─── Glossary ───────────────────────────────────────────────── */
.glossary-toggle { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: var(--c-bg2); border: none; border-radius: var(--r-md); cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; color: var(--c-text2); transition: background 0.15s; }
.glossary-toggle:hover { background: var(--c-bg); border: 0.5px solid var(--c-border2); }
.toggle-arrow { font-size: 11px; transition: transform 0.2s; display: inline-block; }
.toggle-arrow.open { transform: rotate(180deg); }
.glossary-body { display: none; background: var(--c-bg2); border-radius: var(--r-md); padding: 0 1rem; overflow: hidden; }
.glossary-body.open { display: block; padding: 0.5rem 1rem 1rem; }
.gterm { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,2fr); gap: 8px 16px; padding: 8px 0; border-bottom: 0.5px solid var(--c-border); align-items: baseline; }
.gterm:last-child { border-bottom: none; }
.gterm-name { font-size: 13px; font-weight: 500; color: var(--c-text); }
.gterm-def { font-size: 13px; color: var(--c-text2); line-height: 1.5; }

/* ─── Scenario buttons ───────────────────────────────────────── */
.scenario-btn {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  padding: 14px 16px;
  background: var(--c-bg2);
  border: 0.5px solid var(--c-border2);
  border-radius: var(--r-md);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
  text-align: left;
}
.scenario-btn:hover {
  background: var(--c-bg);
  border-color: var(--c-border);
}
.scenario-btn.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgb(59, 130, 246);
  box-shadow: inset 0 0 0 0.5px rgb(59, 130, 246);
}
.scenario-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--c-text);
}
.scenario-desc {
  font-size: 11px;
  color: var(--c-text2);
  line-height: 1.4;
}

/* ─── Revenue sanity check ───────────────────────────────────────── */
.rev-sanity-warning {
  border-left: 2px solid var(--c-amber);
  padding-left: 12px;
  background: rgba(217, 119, 6, 0.05);
}
.rev-sanity-flag {
  color: var(--c-amber);
  font-size: 12px;
  font-weight: 500;
  margin-left: 6px;
  cursor: help;
}

/* ── Price-resolution skeletons ─────────────────────────────── */
.skeleton-line {
  display: inline-block;
  width: 84px;
  height: 1em;
  border-radius: 4px;
  vertical-align: middle;
  background: linear-gradient(90deg, rgba(255,255,255,0.05), rgba(255,255,255,0.12), rgba(255,255,255,0.05));
  background-size: 200% 100%;
  animation: skeleton-shimmer 1.4s ease-in-out infinite;
}
.skeleton-sm { width: 64px; height: 0.8em; }
@keyframes skeleton-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.price-unavailable {
  color: #71717a;
  font-style: italic;
  font-size: 15px;
}
</style>
