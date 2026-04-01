<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { buildProjectionChart } from '~/composables/useProjectionChart.js'

// ─── Chart.js (dynamic import — SSR-safe) ─────────────────────
let ChartJS = null
let nProjChart = null, nRevChart = null
let bProjChart = null, bDeChart = null

// ─── Finnhub config ───────────────────────────────────────────
const config = useRuntimeConfig()
const FINNHUB_KEY = config.public.finnhubApiKey
let ws = null

// ─── Tab ──────────────────────────────────────────────────────
const activeTab = ref('nvda')

// ─── Prices (reactive so Vue tracks dynamic key additions) ────
const prices = reactive({})
const prevPrices = reactive({})
const statusText = ref('Connecting to Finnhub...')
/** When true, WebSocket is closed and live ticks are ignored. Initial load (REST) still runs on mount / resume. */
const livePaused = ref(false)
let closingWsForPause = false

/** Live price → projection chart refresh. Patches Chart.js in place (no destroy); 1–2s is usually smooth. */
const CHART_PRICE_UPDATE_MS = 2000

// ─── Cost bases (personal watchlist basis prices) ─────────────
const BASES = {
  BX: 154.14, GOOGL: 313, NVDA: 186.5, IGM: 129.16, PRME: 3.47,
  APO: 144.76, AAPL: 271.86, AKRE: 65.51, ALNY: 397.65, AMZN: 230.82,
  ARES: 161.63, ARKG: 28.97, BEAM: 27.72, CG: 59.11, CRWV: 71.61,
  CRSP: 52.44, CRWD: 468.76,
}

// ─── NVDA sliders ─────────────────────────────────────────────
const nEps1 = ref(8.29)
const nEps2 = ref(11.12)
const nPeMin = ref(31.9)
const nPeMax = ref(38.7)
const nG = ref(33.6)   // %
const nD = ref(10)     // %
const nR1 = ref(78)
const nR2 = ref(93.5)
const nR3 = ref(112.5)
const nR4 = ref(140)

// ─── BX sliders ───────────────────────────────────────────────
const bDe1 = ref(6.33)
const bDe2 = ref(7.90)
const bPay = ref(85)   // %
const bPMin = ref(22)
const bPMax = ref(29)
const bG = ref(10)     // %
const bD = ref(8)      // %

// ─── Watchlist (persisted in localStorage on this browser) ─────
const WATCHLIST_STORAGE_KEY = 'sa-stock-watchlist-v1'
const DEFAULT_WATCHLIST = Object.freeze([
  'NVDA', 'BX', 'AAPL', 'AMZN', 'GOOGL', 'CRWD', 'APO', 'ARES', 'ARKG', 'PRME', 'ALNY',
])

function normalizeWatchlist(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const item of raw) {
    const t = String(item).trim().toUpperCase()
    if (!t || !/^[A-Z0-9.\-]{1,16}$/.test(t)) continue
    if (seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

const watchlist = ref([...DEFAULT_WATCHLIST])
if (import.meta.client) {
  try {
    const stored = localStorage.getItem(WATCHLIST_STORAGE_KEY)
    if (stored) {
      const normalized = normalizeWatchlist(JSON.parse(stored))
      if (normalized.length) watchlist.value = normalized
    }
  } catch {
    /* ignore corrupt storage */
  }
}

const newTicker = ref('')

// ─── Glossary toggles ─────────────────────────────────────────
const nvdaGlossaryOpen = ref(false)
const bxGlossaryOpen = ref(false)

// ─── Projection chart zoom (false = 10yr, true = focus on yr 0–3) ─
const nProjZoomed = ref(false)
const bProjZoomed = ref(false)

// ─── Helpers ──────────────────────────────────────────────────
const dlr = n => '$' + n.toFixed(2)
const pct = (n, d = 1) => (n >= 0 ? '+' : '') + (n * 100).toFixed(d) + '%'
const colCls = n => n >= 0 ? 'pos' : 'neg'
const absDlr = n => (n >= 0 ? '+$' : '−$') + Math.abs(n).toFixed(2)

// ─── NVDA computed ────────────────────────────────────────────
const nvdaPrice = computed(() => prices['NVDA'] || 176.63)
const nvdaPrev = computed(() => prevPrices['NVDA'] || nvdaPrice.value)
const nvdaChg = computed(() => nvdaPrice.value - nvdaPrev.value)
const nvdaChgPct = computed(() => nvdaChg.value / nvdaPrev.value)

const nP1h = computed(() => nEps1.value * nPeMax.value)
const nP1l = computed(() => nEps1.value * nPeMin.value)
const nP2h = computed(() => nEps2.value * nPeMax.value)
const nP2l = computed(() => nEps2.value * nPeMin.value)

const n1Range = computed(() => `${dlr(nP1l.value)}–${dlr(nP1h.value)}`)
const n2Range = computed(() => `${dlr(nP2l.value)}–${dlr(nP2h.value)}`)
const n1RangeSub = computed(() => `${pct((nP1l.value - nvdaPrice.value) / nvdaPrice.value)} to ${pct((nP1h.value - nvdaPrice.value) / nvdaPrice.value)}`)
const n2RangeSub = computed(() => `${pct((nP2l.value - nvdaPrice.value) / nvdaPrice.value)} to ${pct((nP2h.value - nvdaPrice.value) / nvdaPrice.value)}`)

const nFloor = computed(() => {
  const d = nD.value / 100, g = nG.value / 100
  let floor = 0, ann = nEps1.value
  for (let y = 1; y <= 10; y++) { floor += ann / Math.pow(1 + d, y); ann *= (1 + g) }
  floor += ann * 10 / Math.pow(1 + d, 10)
  return floor
})
const nVsFloor = computed(() => (nFloor.value - nvdaPrice.value) / nvdaPrice.value)

const nRevs = computed(() => [nR1.value, nR2.value, nR3.value, nR4.value])
const nRevTotal = computed(() => nRevs.value.reduce((a, b) => a + b, 0))
const nQEPS = computed(() => {
  const gm = 0.73, ox = 0.186, tx = 0.1588, sh = 24.432
  return nRevs.value.map(r => (r * gm * (1 - ox)) * (1 - tx) / sh)
})
const nRevEPSTotal = computed(() => nQEPS.value.reduce((a, b) => a + b, 0))
const nRevQoQ = computed(() => ((nR4.value / nR1.value) ** (1 / 3) - 1) * 100)
const nRevHit1T = computed(() => nRevTotal.value >= 1000)

// ─── BX computed ──────────────────────────────────────────────
const bxPrice = computed(() => prices['BX'] || 114.52)
const bxPrev = computed(() => prevPrices['BX'] || bxPrice.value)
const bxChg = computed(() => bxPrice.value - bxPrev.value)
const bxChgPct = computed(() => bxChg.value / bxPrev.value)

const bP1h = computed(() => bDe1.value * bPMax.value)
const bP1l = computed(() => bDe1.value * bPMin.value)
const bP2h = computed(() => bDe2.value * bPMax.value)
const bP2l = computed(() => bDe2.value * bPMin.value)

const b1Range = computed(() => `${dlr(bP1l.value)}–${dlr(bP1h.value)}`)
const b2Range = computed(() => `${dlr(bP2l.value)}–${dlr(bP2h.value)}`)
const b1RangeSub = computed(() => `${pct((bP1l.value - bxPrice.value) / bxPrice.value)} to ${pct((bP1h.value - bxPrice.value) / bxPrice.value)}`)
const b2RangeSub = computed(() => `${pct((bP2l.value - bxPrice.value) / bxPrice.value)} to ${pct((bP2h.value - bxPrice.value) / bxPrice.value)}`)

const bYld1 = computed(() => (bPay.value / 100 * bDe1.value) / bxPrice.value)
const bYld2 = computed(() => (bPay.value / 100 * bDe2.value) / bxPrice.value)

const bFloor = computed(() => {
  const d = bD.value / 100, g = bG.value / 100
  let floor = 0, ann = bDe1.value
  for (let y = 1; y <= 10; y++) { floor += ann / Math.pow(1 + d, y); ann *= (1 + g) }
  floor += ann * 20 / Math.pow(1 + d, 10)
  return floor
})
const bVsFloor = computed(() => (bFloor.value - bxPrice.value) / bxPrice.value)

const bDeYears = computed(() => {
  const g = bG.value / 100
  return [0, 1, 2, 3].map(y => +(bDe1.value * Math.pow(1 + g, y)).toFixed(2))
})
const bDistYears = computed(() => bDeYears.value.map(v => +(v * bPay.value / 100).toFixed(2)))
const bYr3Yield = computed(() => (bDistYears.value[3] / bxPrice.value) * 100)

// ─── Watchlist rows ───────────────────────────────────────────
const watchlistRows = computed(() =>
  watchlist.value.map(t => {
    const p = prices[t] || 0
    const pp = prevPrices[t] || p
    const c = p - pp
    const pc = p > 0 ? c / pp : 0
    const basis = BASES[t]
    const bp = basis && p > 0 ? (p - basis) / basis : null
    return { ticker: t, price: p, change: c, changePct: pc, vsBasis: bp, basis }
  })
)

// ─── Chart rendering ──────────────────────────────────────────
async function renderNVDAProjChart() {
  if (!ChartJS) return
  await nextTick()
  const nProjEl = document.getElementById('n-proj-chart')
  if (!nProjEl) return
  nProjChart = buildProjectionChart(
    ChartJS, nProjEl, nvdaPrice.value,
    nEps1.value, nEps2.value, nPeMin.value, nPeMax.value, nG.value / 100,
    nProjChart, nProjZoomed.value ? 3 : 10,
  )
}

function canPatchBarComboChart(chart, canvasEl, chartType) {
  if (!ChartJS || !chart?.canvas || !canvasEl) return false
  try {
    if (chart.canvas !== canvasEl) return false
    const reg = ChartJS.getChart(canvasEl)
    if (reg != null && reg !== chart) return false
    return chart.config?.type === chartType && chart.data?.datasets?.length === 2
  } catch {
    return false
  }
}

async function renderNVDARevChart() {
  if (!ChartJS) return
  await nextTick()
  const nRevEl = document.getElementById('n-rev-chart')
  if (!nRevEl) return
  const gc = window.matchMedia('(prefers-color-scheme:dark)').matches
    ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const revData = nRevs.value.map(v => +v.toFixed(1))
  const epsData = nQEPS.value.map(v => +v.toFixed(2))

  if (canPatchBarComboChart(nRevChart, nRevEl, 'bar')) {
    nRevChart.data.datasets[0].data = revData
    nRevChart.data.datasets[1].data = epsData
    nRevChart.options.scales.y.grid.color = gc
    nRevChart.update()
    return
  }

  if (nRevChart) {
    try { nRevChart.destroy() } catch { /* ignore */ }
  }
  nRevChart = new ChartJS(nRevEl, {
    type: 'bar',
    animation: false,
    data: {
      labels: ['Q1 Apr26', 'Q2 Jul26', 'Q3 Oct26', 'Q4 Jan27'],
      datasets: [
        { label: 'Revenue', data: revData, backgroundColor: '#378ADD', yAxisID: 'y' },
        { label: 'EPS', data: epsData, type: 'line', borderColor: '#BA7517', backgroundColor: 'transparent', pointBackgroundColor: '#BA7517', pointRadius: 5, yAxisID: 'y2' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: gc }, title: { display: true, text: 'Revenue ($B)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
        y2: { position: 'right', title: { display: true, text: 'EPS ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
        x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
      },
    },
  })
}

async function renderNVDACharts() {
  await renderNVDAProjChart()
  await renderNVDARevChart()
}

async function renderBXProjChart() {
  if (!ChartJS) return
  await nextTick()
  const bProjEl = document.getElementById('b-proj-chart')
  if (!bProjEl) return
  bProjChart = buildProjectionChart(
    ChartJS, bProjEl, bxPrice.value,
    bDe1.value, bDe2.value, bPMin.value, bPMax.value, bG.value / 100,
    bProjChart, bProjZoomed.value ? 3 : 10,
  )
}

async function renderBXDeChart() {
  if (!ChartJS) return
  await nextTick()
  const bDeEl = document.getElementById('b-de-chart')
  if (!bDeEl) return
  const gc = window.matchMedia('(prefers-color-scheme:dark)').matches
    ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'

  const deData = [...bDeYears.value]
  const distData = [...bDistYears.value]

  if (canPatchBarComboChart(bDeChart, bDeEl, 'bar')) {
    bDeChart.data.datasets[0].data = deData
    bDeChart.data.datasets[1].data = distData
    bDeChart.options.scales.y.grid.color = gc
    bDeChart.update()
    return
  }

  if (bDeChart) {
    try { bDeChart.destroy() } catch { /* ignore */ }
  }
  bDeChart = new ChartJS(bDeEl, {
    type: 'bar',
    animation: false,
    data: {
      labels: ['Now', 'Year 1', 'Year 2', 'Year 3'],
      datasets: [
        { label: 'DE/share', data: deData, backgroundColor: '#378ADD', yAxisID: 'y' },
        { label: 'Dist/share', data: distData, type: 'line', borderColor: '#1D9E75', backgroundColor: 'transparent', pointBackgroundColor: '#1D9E75', pointRadius: 5, yAxisID: 'y2' },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { grid: { color: gc }, title: { display: true, text: 'DE per share ($)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
        y2: { position: 'right', title: { display: true, text: 'Distribution/share ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
        x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
      },
    },
  })
}

async function renderBXCharts() {
  await renderBXProjChart()
  await renderBXDeChart()
}

// ─── Finnhub REST + WebSocket ─────────────────────────────────
const allTickers = computed(() => {
  const extras = watchlist.value.filter(t => t !== 'NVDA' && t !== 'BX')
  return ['NVDA', 'BX', ...extras]
})

async function fetchQuotes(tickers) {
  if (!FINNHUB_KEY) return
  await Promise.all(
    tickers.map(async t => {
      try {
        const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${t}&token=${FINNHUB_KEY}`)
        const d = await res.json()
        if (d.c) {
          prices[t] = +d.c.toFixed(2)
          prevPrices[t] = +d.pc.toFixed(2)
        }
      } catch {}
    })
  )
}

function disconnectWS() {
  if (ws) {
    ws.close()
    ws = null
  }
}

function connectWS() {
  if (!FINNHUB_KEY) { statusText.value = 'No API key configured'; return }
  if (livePaused.value) return
  disconnectWS()
  ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`)
  ws.onopen = () => {
    allTickers.value.forEach(t => ws.send(JSON.stringify({ type: 'subscribe', symbol: t })))
    statusText.value = 'Live'
  }
  ws.onmessage = (e) => {
    if (livePaused.value) return
    try {
      const msg = JSON.parse(e.data)
      if (msg.type === 'trade' && msg.data) {
        msg.data.forEach(trade => {
          const t = trade.s
          if (prices[t] !== undefined) prices[t] = +trade.p.toFixed(2)
        })
      }
    } catch {}
  }
  ws.onerror = () => { if (!livePaused.value) statusText.value = 'Connection error' }
  ws.onclose = () => {
    if (closingWsForPause) {
      closingWsForPause = false
      return
    }
    if (statusText.value === 'Live') statusText.value = 'Disconnected'
  }
}

async function toggleLiveStream() {
  if (livePaused.value) {
    livePaused.value = false
    statusText.value = 'Connecting...'
    await fetchQuotes(allTickers.value)
    connectWS()
  } else {
    closingWsForPause = true
    livePaused.value = true
    disconnectWS()
    statusText.value = 'Paused'
  }
}

// ─── Watchlist actions ────────────────────────────────────────
async function addTicker() {
  const t = newTicker.value.trim().toUpperCase()
  if (!t || watchlist.value.includes(t)) { newTicker.value = ''; return }
  watchlist.value.push(t)
  newTicker.value = ''
  if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'subscribe', symbol: t }))
  await fetchQuotes([t])
}

function removeTicker(t) {
  watchlist.value = watchlist.value.filter(x => x !== t)
}

// ─── Lifecycle ────────────────────────────────────────────────
onMounted(async () => {
  const { default: Chart } = await import('chart.js/auto')
  ChartJS = Chart
  await fetchQuotes(allTickers.value)
  connectWS()
  renderNVDACharts()
})

onUnmounted(() => {
  disconnectWS()
  ;[nProjChart, nRevChart, bProjChart, bDeChart].forEach(c => { if (c) c.destroy() })
})

// ─── Throttle: projection charts from live price (at most every CHART_PRICE_UPDATE_MS) ─
function throttle(fn, ms) {
  let last = 0
  let timeout = null
  return () => {
    const now = Date.now()
    const run = () => { last = Date.now(); fn() }
    if (now - last >= ms) {
      if (timeout) { clearTimeout(timeout); timeout = null }
      run()
    } else if (!timeout) {
      timeout = setTimeout(() => {
        timeout = null
        run()
      }, ms - (now - last))
    }
  }
}
const throttledNVDAProj = throttle(() => {
  if (activeTab.value === 'nvda') renderNVDAProjChart()
}, CHART_PRICE_UPDATE_MS)
const throttledBXProj = throttle(() => {
  if (activeTab.value === 'bx') renderBXProjChart()
}, CHART_PRICE_UPDATE_MS)

// ─── Watchers ─────────────────────────────────────────────────
// NVDA: P/E sliders → projection only; revenue sliders → FY2027 bar chart only (no cross-calls)
watch([nEps1, nEps2, nPeMin, nPeMax, nG, nD, nProjZoomed], () => {
  if (activeTab.value === 'nvda') renderNVDAProjChart()
})
watch([nR1, nR2, nR3, nR4], () => {
  if (activeTab.value === 'nvda') renderNVDARevChart()
})
// BX: P/DE + zoom → projection only; DE growth card sliders → DE/dist bar chart only (bDe1/bG/bPay affect both)
watch([bDe1, bDe2, bPMin, bPMax, bG, bD, bProjZoomed], () => {
  if (activeTab.value === 'bx') renderBXProjChart()
})
watch([bDe1, bPay, bG], () => {
  if (activeTab.value === 'bx') renderBXDeChart()
})
// Live price: only P/E projection chart (throttled); bar charts do not use spot price
watch(nvdaPrice, throttledNVDAProj)
watch(bxPrice, throttledBXProj)
// Tab switch: render the newly visible tab
watch(activeTab, (tab) => {
  if (tab === 'nvda') renderNVDACharts()
  if (tab === 'bx') renderBXCharts()
})

watch(watchlist, () => {
  if (!import.meta.client) return
  try {
    localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist.value))
  } catch {
    /* quota / private mode */
  }
}, { deep: true })
</script>

<template>
  <div class="sa-wrap max-w-3xl mx-auto px-4 pb-16 pt-24">

    <!-- TABS -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'nvda' }" @click="activeTab = 'nvda'">NVDA analyzer</button>
      <button class="tab" :class="{ active: activeTab === 'bx' }" @click="activeTab = 'bx'">BX analyzer</button>
      <button class="tab" :class="{ active: activeTab === 'watchlist' }" @click="activeTab = 'watchlist'">Watchlist</button>
    </div>

    <!-- ══════════════ NVDA TAB ══════════════ -->
    <div v-show="activeTab === 'nvda'">
      <div class="live-pill">
        <span class="live-dot" :class="{ paused: livePaused }" />
        <span>{{ statusText }}</span>
        <button type="button" class="live-toggle" @click="toggleLiveStream">
          {{ livePaused ? 'Start' : 'Pause' }}
        </button>
      </div>

      <!-- Metric cards -->
      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Current price</div>
          <div class="metric-value">{{ dlr(nvdaPrice) }}</div>
          <div class="metric-sub" :class="colCls(nvdaChg)">
            {{ absDlr(nvdaChg) }} ({{ pct(nvdaChgPct, 2) }})
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">1yr target range</div>
          <div class="metric-value">{{ n1Range }}</div>
          <div class="metric-sub">{{ n1RangeSub }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">2yr target range</div>
          <div class="metric-value">{{ n2Range }}</div>
          <div class="metric-sub">{{ n2RangeSub }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">10yr intrinsic floor</div>
          <div class="metric-value">{{ dlr(nFloor) }}</div>
          <div class="metric-sub" :class="colCls(nVsFloor)">
            {{ nVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}
          </div>
        </div>
      </div>

      <!-- P/E valuation card -->
      <div class="card">
        <div class="card-title">P/E valuation — price targets &amp; 10-year projection</div>
        <div class="insight">Price target = Forward EPS × P/E multiple. Solid lines show the 1yr and 2yr targets from your sliders. Dotted lines extrapolate forward using growth rate g, showing a plausible 10-year price range.</div>

        <div class="slider-row">
          <span class="slider-label">1-year forward EPS</span>
          <input type="range" min="5" max="15" step="0.01" v-model.number="nEps1">
          <span class="slider-val">{{ dlr(nEps1) }}</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">2-year forward EPS</span>
          <input type="range" min="5" max="20" step="0.01" v-model.number="nEps2">
          <span class="slider-val">{{ dlr(nEps2) }}</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Min P/E multiple</span>
          <input type="range" min="15" max="80" step="0.1" v-model.number="nPeMin">
          <span class="slider-val">{{ nPeMin.toFixed(1) }}×</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Max P/E multiple</span>
          <input type="range" min="15" max="120" step="0.1" v-model.number="nPeMax">
          <span class="slider-val">{{ nPeMax.toFixed(1) }}×</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Growth rate g</span>
          <input type="range" min="10" max="80" step="0.1" v-model.number="nG">
          <span class="slider-val">{{ nG.toFixed(1) }}%</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Discount rate d</span>
          <input type="range" min="5" max="20" step="0.1" v-model.number="nD">
          <span class="slider-val">{{ nD.toFixed(1) }}%</span>
        </div>

        <div class="section-label">1-year targets</div>
        <div class="targets">
          <div class="tcard hero">
            <div class="tlabel">High target</div>
            <div class="tprice" :class="colCls(nP1h - nvdaPrice)">{{ dlr(nP1h) }}</div>
            <div class="tret">{{ pct((nP1h - nvdaPrice) / nvdaPrice) }} from today</div>
          </div>
          <div class="tcard hero">
            <div class="tlabel">Low target</div>
            <div class="tprice" :class="colCls(nP1l - nvdaPrice)">{{ dlr(nP1l) }}</div>
            <div class="tret">{{ pct((nP1l - nvdaPrice) / nvdaPrice) }} from today</div>
          </div>
        </div>

        <div class="section-label">2-year targets</div>
        <div class="targets">
          <div class="tcard">
            <div class="tlabel">High target</div>
            <div class="tprice" :class="colCls(nP2h - nvdaPrice)">{{ dlr(nP2h) }}</div>
            <div class="tret">{{ pct((nP2h - nvdaPrice) / nvdaPrice) }} from today</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Low target</div>
            <div class="tprice" :class="colCls(nP2l - nvdaPrice)">{{ dlr(nP2l) }}</div>
            <div class="tret">{{ pct((nP2l - nvdaPrice) / nvdaPrice) }} from today</div>
          </div>
        </div>

        <div class="chart-toolbar">
          <button class="zoom-btn" :class="{ active: nProjZoomed }" @click="nProjZoomed = !nProjZoomed">
            {{ nProjZoomed ? '↩ Full 10yr' : '🔍 Zoom 1–2yr' }}
          </button>
        </div>
        <div class="chart-wrap"><canvas id="n-proj-chart" /></div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-line" style="background:#888780" />Today</span>
          <span class="legend-item"><span class="legend-line" style="background:#378ADD" />High (solid = targets)</span>
          <span class="legend-item" v-if="!nProjZoomed"><span class="legend-dash" style="border-color:#378ADD" />High (extrapolated)</span>
          <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Low (solid = targets)</span>
          <span class="legend-item" v-if="!nProjZoomed"><span class="legend-dash" style="border-color:#1D9E75" />Low (extrapolated)</span>
        </div>
        <p class="note">Dotted lines extrapolate using growth rate g and the same P/E range — not a forecast, an illustration of the range if assumptions hold.</p>
      </div>

      <!-- DCF card -->
      <div class="card">
        <div class="card-title">10yr intrinsic floor — DCF result</div>
        <div class="targets">
          <div class="tcard">
            <div class="tlabel">Intrinsic floor</div>
            <div class="tprice">{{ dlr(nFloor) }}</div>
            <div class="tret">what future earnings are worth today</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Price vs floor</div>
            <div class="tprice" :class="colCls(nVsFloor)">{{ pct(nVsFloor) }}</div>
            <div class="tret">{{ nVsFloor >= 0 ? 'Stock below DCF floor' : 'Stock above DCF floor' }}</div>
          </div>
        </div>
      </div>

      <!-- Revenue model card -->
      <div class="card">
        <div class="card-title">FY2027 revenue model — Jensen's $1T path</div>
        <div class="slider-row">
          <span class="slider-label">Q1 Apr 2026 ($B)</span>
          <input type="range" min="40" max="130" step="0.5" v-model.number="nR1">
          <span class="slider-val">${{ nR1.toFixed(1) }}B</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Q2 Jul 2026 ($B)</span>
          <input type="range" min="50" max="160" step="0.5" v-model.number="nR2">
          <span class="slider-val">${{ nR2.toFixed(1) }}B</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Q3 Oct 2026 ($B)</span>
          <input type="range" min="60" max="190" step="0.5" v-model.number="nR3">
          <span class="slider-val">${{ nR3.toFixed(1) }}B</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Q4 Jan 2027 ($B)</span>
          <input type="range" min="80" max="230" step="0.5" v-model.number="nR4">
          <span class="slider-val">${{ nR4.toFixed(1) }}B</span>
        </div>

        <div class="targets">
          <div class="tcard">
            <div class="tlabel">FY2027 revenue</div>
            <div class="tprice" :class="nRevHit1T ? 'pos' : ''">${{ nRevTotal.toFixed(0) }}B</div>
            <div class="tret">{{ nRevHit1T ? 'Meets $1T' : `$${(1000 - nRevTotal).toFixed(0)}B short` }}</div>
          </div>
          <div class="tcard">
            <div class="tlabel">FY2027 EPS (est.)</div>
            <div class="tprice">{{ dlr(nRevEPSTotal) }}</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Implied P/E today</div>
            <div class="tprice">{{ (nvdaPrice / nRevEPSTotal).toFixed(1) }}×</div>
          </div>
          <div class="tcard">
            <div class="tlabel">QoQ avg growth</div>
            <div class="tprice">{{ nRevQoQ.toFixed(1) }}%</div>
          </div>
        </div>

        <div class="chart-wrap"><canvas id="n-rev-chart" /></div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-line" style="background:#378ADD" />Revenue ($B)</span>
          <span class="legend-item"><span class="legend-line" style="background:#BA7517" />Quarterly EPS (right axis)</span>
        </div>
        <p class="note">73% gross margin · 18.6% opex · 15.88% tax · 24.432B diluted shares</p>
      </div>

      <!-- NVDA Glossary -->
      <button class="glossary-toggle" @click="nvdaGlossaryOpen = !nvdaGlossaryOpen">
        <span>Key terms — NVDA analyzer</span>
        <span class="toggle-arrow" :class="{ open: nvdaGlossaryOpen }">▼</span>
      </button>
      <div class="glossary-body" :class="{ open: nvdaGlossaryOpen }">
        <div class="gterm"><span class="gterm-name">EPS</span><span class="gterm-def">Earnings per share — the company's net profit divided by total shares. A higher EPS means more profit per share you own.</span></div>
        <div class="gterm"><span class="gterm-name">Forward EPS</span><span class="gterm-def">An analyst's estimate of EPS over the next 12 months — projected, not yet reported.</span></div>
        <div class="gterm"><span class="gterm-name">P/E multiple</span><span class="gterm-def">Price-to-earnings — how much investors pay per $1 of earnings. A P/E of 35× means the stock costs 35× its annual earnings. Higher P/E reflects higher growth expectations.</span></div>
        <div class="gterm"><span class="gterm-name">Growth rate g</span><span class="gterm-def">The assumed annual rate at which EPS will grow over the next 10 years. Set at half NVDA's actual 11-year historical CAGR — a deliberately conservative assumption.</span></div>
        <div class="gterm"><span class="gterm-name">Discount rate d</span><span class="gterm-def">The annual return you require to justify holding this stock. 10% is a common benchmark. A higher discount rate produces a lower intrinsic floor.</span></div>
        <div class="gterm"><span class="gterm-name">DCF (discounted cash flow)</span><span class="gterm-def">A valuation method that converts all future projected earnings into today's dollars. The core insight: a dollar earned in year 10 is worth less than a dollar today.</span></div>
        <div class="gterm"><span class="gterm-name">Intrinsic floor</span><span class="gterm-def">The minimum a stock should be worth based on DCF. Not a price target — a margin-of-safety check. If today's price is below the floor, the stock looks undervalued even under conservative assumptions.</span></div>
        <div class="gterm"><span class="gterm-name">Terminal value</span><span class="gterm-def">A lump-sum estimate of the business's value beyond year 10, added to the DCF. Represents ongoing earnings after the forecast window closes.</span></div>
      </div>
    </div>

    <!-- ══════════════ BX TAB ══════════════ -->
    <div v-show="activeTab === 'bx'">
      <div class="live-pill">
        <span class="live-dot" :class="{ paused: livePaused }" />
        <span>{{ statusText }}</span>
        <button type="button" class="live-toggle" @click="toggleLiveStream">
          {{ livePaused ? 'Start' : 'Pause' }}
        </button>
      </div>

      <div class="metrics">
        <div class="metric">
          <div class="metric-label">Current price</div>
          <div class="metric-value">{{ dlr(bxPrice) }}</div>
          <div class="metric-sub" :class="colCls(bxChg)">
            {{ absDlr(bxChg) }} ({{ pct(bxChgPct, 2) }})
          </div>
        </div>
        <div class="metric">
          <div class="metric-label">1yr target range</div>
          <div class="metric-value">{{ b1Range }}</div>
          <div class="metric-sub">{{ b1RangeSub }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">2yr target range</div>
          <div class="metric-value">{{ b2Range }}</div>
          <div class="metric-sub">{{ b2RangeSub }}</div>
        </div>
        <div class="metric">
          <div class="metric-label">10yr intrinsic floor</div>
          <div class="metric-value">{{ dlr(bFloor) }}</div>
          <div class="metric-sub" :class="colCls(bVsFloor)">
            {{ bVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}
          </div>
        </div>
      </div>

      <!-- P/DE valuation card -->
      <div class="card">
        <div class="card-title">P/DE valuation — price targets &amp; 10-year projection</div>
        <div class="insight">P/DE works like P/E but uses Distributable Earnings (DE) — a truer measure of BX's cash generation than GAAP earnings. Total return = price appreciation + yield from distributions.</div>

        <div class="slider-row">
          <span class="slider-label">1-year forward DE</span>
          <input type="range" min="3" max="12" step="0.01" v-model.number="bDe1">
          <span class="slider-val">{{ dlr(bDe1) }}</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">2-year forward DE</span>
          <input type="range" min="3" max="15" step="0.01" v-model.number="bDe2">
          <span class="slider-val">{{ dlr(bDe2) }}</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Payout ratio</span>
          <input type="range" min="50" max="100" step="1" v-model.number="bPay">
          <span class="slider-val">{{ bPay }}%</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Min P/DE multiple</span>
          <input type="range" min="10" max="40" step="0.1" v-model.number="bPMin">
          <span class="slider-val">{{ bPMin.toFixed(1) }}×</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Max P/DE multiple</span>
          <input type="range" min="10" max="50" step="0.1" v-model.number="bPMax">
          <span class="slider-val">{{ bPMax.toFixed(1) }}×</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Growth rate g</span>
          <input type="range" min="5" max="25" step="0.1" v-model.number="bG">
          <span class="slider-val">{{ bG.toFixed(1) }}%</span>
        </div>
        <div class="slider-row">
          <span class="slider-label">Discount rate d</span>
          <input type="range" min="4" max="15" step="0.1" v-model.number="bD">
          <span class="slider-val">{{ bD.toFixed(1) }}%</span>
        </div>

        <div class="section-label">1-year targets</div>
        <div class="targets">
          <div class="tcard hero">
            <div class="tlabel">High target</div>
            <div class="tprice" :class="colCls(bP1h - bxPrice)">{{ dlr(bP1h) }}</div>
            <div class="tret">{{ pct((bP1h - bxPrice) / bxPrice) }} from today</div>
            <div class="tyield">+ {{ pct(bYld1) }} yield = {{ pct((bP1h - bxPrice) / bxPrice + bYld1) }} total return</div>
          </div>
          <div class="tcard hero">
            <div class="tlabel">Low target</div>
            <div class="tprice" :class="colCls(bP1l - bxPrice)">{{ dlr(bP1l) }}</div>
            <div class="tret">{{ pct((bP1l - bxPrice) / bxPrice) }} from today</div>
            <div class="tyield">+ {{ pct(bYld1) }} yield = {{ pct((bP1l - bxPrice) / bxPrice + bYld1) }} total return</div>
          </div>
        </div>

        <div class="section-label">2-year targets</div>
        <div class="targets">
          <div class="tcard">
            <div class="tlabel">High target</div>
            <div class="tprice" :class="colCls(bP2h - bxPrice)">{{ dlr(bP2h) }}</div>
            <div class="tret">{{ pct((bP2h - bxPrice) / bxPrice) }} from today</div>
            <div class="tyield">+ {{ pct(bYld2) }} yield = {{ pct((bP2h - bxPrice) / bxPrice + bYld2) }} total return</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Low target</div>
            <div class="tprice" :class="colCls(bP2l - bxPrice)">{{ dlr(bP2l) }}</div>
            <div class="tret">{{ pct((bP2l - bxPrice) / bxPrice) }} from today</div>
            <div class="tyield">+ {{ pct(bYld2) }} yield = {{ pct((bP2l - bxPrice) / bxPrice + bYld2) }} total return</div>
          </div>
        </div>

        <div class="chart-toolbar">
          <button class="zoom-btn" :class="{ active: bProjZoomed }" @click="bProjZoomed = !bProjZoomed">
            {{ bProjZoomed ? '↩ Full 10yr' : '🔍 Zoom 1–2yr' }}
          </button>
        </div>
        <div class="chart-wrap"><canvas id="b-proj-chart" /></div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-line" style="background:#888780" />Today</span>
          <span class="legend-item"><span class="legend-line" style="background:#378ADD" />High (solid = targets)</span>
          <span class="legend-item" v-if="!bProjZoomed"><span class="legend-dash" style="border-color:#378ADD" />High (extrapolated)</span>
          <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Low (solid = targets)</span>
          <span class="legend-item" v-if="!bProjZoomed"><span class="legend-dash" style="border-color:#1D9E75" />Low (extrapolated)</span>
        </div>
        <p class="note">Dotted lines extrapolate using growth rate g and the same P/DE range — not a forecast, an illustration of the range if assumptions hold.</p>
      </div>

      <!-- BX DCF card -->
      <div class="card">
        <div class="card-title">10yr intrinsic floor — DCF result</div>
        <div class="targets">
          <div class="tcard">
            <div class="tlabel">Intrinsic floor</div>
            <div class="tprice">{{ dlr(bFloor) }}</div>
            <div class="tret">what future DE is worth today</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Price vs floor</div>
            <div class="tprice" :class="colCls(bVsFloor)">{{ pct(bVsFloor) }}</div>
            <div class="tret">{{ bVsFloor >= 0 ? 'Appears undervalued vs floor' : 'Trades above DCF floor' }}</div>
          </div>
        </div>
      </div>

      <!-- BX DE growth card -->
      <div class="card">
        <div class="card-title">DE growth projection — 3-year outlook</div>
        <div class="targets">
          <div class="tcard">
            <div class="tlabel">Yr 3 DE/share</div>
            <div class="tprice">{{ dlr(bDeYears[3]) }}</div>
            <div class="tret">{{ pct(Math.pow(1 + bG / 100, 3) - 1) }} cumulative growth</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Yr 3 distribution</div>
            <div class="tprice">{{ dlr(bDistYears[3]) }}</div>
            <div class="tret">{{ bYr3Yield.toFixed(1) }}% yield on today's price</div>
          </div>
          <div class="tcard">
            <div class="tlabel">Yr 1 yield</div>
            <div class="tprice">{{ (bYld1 * 100).toFixed(2) }}%</div>
            <div class="tret">{{ dlr(bPay / 100 * bDe1) }}/share</div>
          </div>
          <div class="tcard">
            <div class="tlabel">10yr intrinsic floor</div>
            <div class="tprice">{{ dlr(bFloor) }}</div>
          </div>
        </div>
        <div class="chart-wrap"><canvas id="b-de-chart" /></div>
        <div class="chart-legend">
          <span class="legend-item"><span class="legend-line" style="background:#378ADD" />DE per share</span>
          <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Distribution per share (right axis)</span>
        </div>
      </div>

      <!-- BX Glossary -->
      <button class="glossary-toggle" @click="bxGlossaryOpen = !bxGlossaryOpen">
        <span>Key terms — BX analyzer</span>
        <span class="toggle-arrow" :class="{ open: bxGlossaryOpen }">▼</span>
      </button>
      <div class="glossary-body" :class="{ open: bxGlossaryOpen }">
        <div class="gterm"><span class="gterm-name">DE (distributable earnings)</span><span class="gterm-def">The cash BX actually generates and can pay out. Unlike GAAP earnings, DE strips out non-cash accounting items. All Wall Street analysts use DE — not GAAP EPS — when valuing Blackstone.</span></div>
        <div class="gterm"><span class="gterm-name">P/DE multiple</span><span class="gterm-def">Price-to-distributable-earnings — BX's equivalent of a P/E ratio. A P/DE of 22× means the stock costs 22× its annual distributable earnings.</span></div>
        <div class="gterm"><span class="gterm-name">Payout ratio</span><span class="gterm-def">The percentage of DE paid out to shareholders as cash distributions. BX historically pays ~85%, retaining the rest.</span></div>
        <div class="gterm"><span class="gterm-name">Distribution</span><span class="gterm-def">Cash paid regularly to shareholders — BX's equivalent of a dividend. Equal to DE × payout ratio. This is the yield component of your total return.</span></div>
        <div class="gterm"><span class="gterm-name">Total return</span><span class="gterm-def">Price appreciation plus yield (distributions received). For BX, yield is a meaningful part of the investment case — not just price upside.</span></div>
        <div class="gterm"><span class="gterm-name">Growth rate g</span><span class="gterm-def">Assumed annual DE growth rate. Set at 10% based on BX's historical DE growth over the past decade.</span></div>
        <div class="gterm"><span class="gterm-name">Discount rate d</span><span class="gterm-def">Your required annual return. Set lower than NVDA (8% vs 10%) because BX's cash flows are more predictable and income-like.</span></div>
        <div class="gterm"><span class="gterm-name">DCF intrinsic floor</span><span class="gterm-def">The minimum BX should be worth based on future DE discounted to today's dollars. A margin-of-safety check, not a price target.</span></div>
        <div class="gterm"><span class="gterm-name">GAAP earnings</span><span class="gterm-def">Officially reported accounting earnings. For alternative asset managers like BX, GAAP is distorted by non-cash items — making DE the more useful valuation metric.</span></div>
      </div>
    </div>

    <!-- ══════════════ WATCHLIST TAB ══════════════ -->
    <div v-show="activeTab === 'watchlist'">
      <div class="live-pill">
        <span class="live-dot" :class="{ paused: livePaused }" />
        <span>{{ statusText }}</span>
        <button type="button" class="live-toggle" @click="toggleLiveStream">
          {{ livePaused ? 'Start' : 'Pause' }}
        </button>
      </div>

      <div class="add-row">
        <input
          type="text"
          v-model="newTicker"
          placeholder="Add ticker (e.g. MSFT)"
          @keydown.enter="addTicker"
        >
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
            <td style="font-weight:500">{{ row.price > 0 ? dlr(row.price) : '—' }}</td>
            <td :class="colCls(row.change)">{{ row.price > 0 ? absDlr(row.change) : '—' }}</td>
            <td :class="colCls(row.changePct)">{{ row.price > 0 ? pct(row.changePct) : '—' }}</td>
            <td :class="row.vsBasis !== null ? colCls(row.vsBasis) : ''">{{ row.vsBasis !== null ? pct(row.vsBasis) : '—' }}</td>
            <td class="basis-cell">{{ row.basis ? dlr(row.basis) : '—' }}</td>
            <td><button class="remove-btn" @click="removeTicker(row.ticker)">✕</button></td>
          </tr>
        </tbody>
      </table>
      <p class="note" style="margin-top:12px">Basis prices loaded from spreadsheet. "vs basis" shows total gain/loss since original purchase price.</p>
    </div>

  </div>
</template>

<style scoped>
/* ─── CSS variable definitions (dark theme) ──────────────────── */
.sa-wrap {
  --c-bg: #09090b;
  --c-bg2: #18181b;
  --c-border: rgba(255,255,255,0.08);
  --c-border2: rgba(255,255,255,0.13);
  --c-text: #f4f4f5;
  --c-text2: #a1a1aa;
  --c-text3: #71717a;
  --c-pos: #4ade80;
  --c-neg: #f87171;
  --c-info-text: #7dd3fc;
  --c-info-bg: rgba(56,189,248,0.08);
  --r-md: 6px;
  --r-lg: 12px;
}

/* ─── Tabs ───────────────────────────────────────────────────── */
.tabs {
  display: flex;
  gap: 2px;
  border-bottom: 0.5px solid var(--c-border);
  margin-bottom: 1.5rem;
}
.tab {
  padding: 8px 18px;
  font-size: 14px;
  cursor: pointer;
  border: none;
  background: none;
  color: var(--c-text2);
  border-bottom: 2px solid transparent;
  margin-bottom: -0.5px;
  font-family: inherit;
  transition: color 0.15s;
}
.tab.active { color: var(--c-text); border-bottom-color: var(--c-text); font-weight: 500; }
.tab:hover:not(.active) { color: var(--c-text); }

/* ─── Metric cards ───────────────────────────────────────────── */
.metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 10px;
  margin-bottom: 1.25rem;
}
.metric {
  background: var(--c-bg2);
  border-radius: var(--r-md);
  padding: 12px 14px;
}
.metric-label { font-size: 11px; color: var(--c-text2); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
.metric-value { font-size: 22px; font-weight: 500; color: var(--c-text); line-height: 1.2; }
.metric-sub { font-size: 12px; margin-top: 3px; color: var(--c-text2); }

/* ─── Pos / neg ──────────────────────────────────────────────── */
.pos { color: var(--c-pos) !important; }
.neg { color: var(--c-neg) !important; }

/* ─── Cards ──────────────────────────────────────────────────── */
.card {
  background: var(--c-bg);
  border: 0.5px solid var(--c-border);
  border-radius: var(--r-lg);
  padding: 1.25rem;
  margin-bottom: 1rem;
}
.card-title { font-size: 11px; font-weight: 500; color: var(--c-text2); margin-bottom: 1rem; text-transform: uppercase; letter-spacing: 0.05em; }

/* ─── Sliders ────────────────────────────────────────────────── */
.slider-row { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.slider-label { font-size: 13px; color: var(--c-text2); width: 200px; flex-shrink: 0; }
.slider-val { font-size: 13px; font-weight: 500; min-width: 64px; text-align: right; color: var(--c-text); }
input[type=range] { flex: 1; min-width: 0; accent-color: #378ADD; }

/* ─── Target cards ───────────────────────────────────────────── */
.targets {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 10px;
  margin-top: 1rem;
}
.tcard { background: var(--c-bg2); border-radius: var(--r-md); padding: 12px; }
.tcard.hero { background: var(--c-bg); border: 0.5px solid var(--c-border2); }
.tlabel { font-size: 11px; color: var(--c-text3); margin-bottom: 3px; text-transform: uppercase; letter-spacing: 0.04em; }
.tprice { font-size: 22px; font-weight: 500; line-height: 1.2; color: var(--c-text); }
.tret { font-size: 12px; margin-top: 3px; color: var(--c-text2); }
.tyield { font-size: 11px; margin-top: 2px; color: var(--c-text2); }

/* ─── Charts ─────────────────────────────────────────────────── */
.chart-toolbar { display: flex; justify-content: flex-end; margin-top: 1.25rem; }
.zoom-btn {
  font-size: 11px;
  padding: 4px 10px;
  border: 0.5px solid var(--c-border2);
  border-radius: var(--r-md);
  background: var(--c-bg);
  color: var(--c-text2);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.zoom-btn:hover { background: var(--c-bg2); color: var(--c-text); }
.zoom-btn.active { background: var(--c-bg2); color: var(--c-text); border-color: var(--c-text2); }
.chart-wrap { position: relative; width: 100%; height: 260px; margin-top: 0.5rem; }
.chart-legend { display: flex; gap: 16px; margin-top: 10px; font-size: 12px; color: var(--c-text2); flex-wrap: wrap; }
.legend-item { display: flex; align-items: center; gap: 5px; }
.legend-line { width: 18px; height: 2px; display: inline-block; }
.legend-dash { width: 18px; height: 0; border-top: 2px dashed; display: inline-block; }

/* ─── Table ──────────────────────────────────────────────────── */
table { width: 100%; border-collapse: collapse; font-size: 13px; table-layout: fixed; }
th { text-align: left; font-size: 11px; font-weight: 500; color: var(--c-text2); padding: 6px 8px; text-transform: uppercase; letter-spacing: 0.04em; border-bottom: 0.5px solid var(--c-border); }
td { padding: 9px 8px; border-bottom: 0.5px solid var(--c-border); color: var(--c-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--c-bg2); }
.basis-cell { color: var(--c-text2); font-size: 12px; }

/* ─── Misc components ────────────────────────────────────────── */
.badge { font-size: 11px; font-weight: 500; background: var(--c-bg2); padding: 2px 8px; border-radius: 4px; color: var(--c-text2); }
.live-pill { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 8px; font-size: 11px; color: var(--c-text2); background: var(--c-bg2); padding: 4px 10px 4px 12px; border-radius: 20px; margin-bottom: 1.25rem; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: pulse 2s infinite; flex-shrink: 0; }
.live-dot.paused { animation: none; background: var(--c-text3); }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
.live-toggle {
  font-size: 11px;
  padding: 3px 10px;
  margin-left: 2px;
  border: 0.5px solid var(--c-border2);
  border-radius: var(--r-md);
  background: var(--c-bg);
  color: var(--c-text);
  cursor: pointer;
  font-family: inherit;
  transition: background 0.15s, color 0.15s;
}
.live-toggle:hover { background: var(--c-bg2); color: var(--c-text); }

.add-row { display: flex; gap: 8px; margin-bottom: 1rem; }
.add-row input[type=text] { flex: 1; font-size: 13px; padding: 6px 10px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); color: var(--c-text); font-family: inherit; }
.add-row input[type=text]::placeholder { color: var(--c-text3); }
.add-row button { font-size: 13px; padding: 6px 14px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); cursor: pointer; color: var(--c-text); font-family: inherit; transition: background 0.15s; }
.add-row button:hover { background: var(--c-bg2); }
.remove-btn { font-size: 11px; color: var(--c-neg); padding: 3px 8px; border: none; background: transparent; cursor: pointer; }
.remove-btn:hover { opacity: 0.7; }

.insight { background: var(--c-info-bg); border-radius: var(--r-md); padding: 10px 14px; font-size: 12px; color: var(--c-info-text); margin-bottom: 1rem; line-height: 1.6; }
.note { font-size: 12px; color: var(--c-text2); margin-top: 8px; line-height: 1.5; }
.section-label { font-size: 11px; font-weight: 500; color: var(--c-text2); text-transform: uppercase; letter-spacing: 0.05em; margin: 1.25rem 0 0.75rem; }

/* ─── Glossary ───────────────────────────────────────────────── */
.glossary-toggle {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--c-bg2);
  border: none;
  border-radius: var(--r-md);
  cursor: pointer;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: var(--c-text2);
  margin-bottom: 1rem;
  transition: background 0.15s;
}
.glossary-toggle:hover { background: var(--c-bg); border: 0.5px solid var(--c-border2); }
.toggle-arrow { font-size: 11px; transition: transform 0.2s; display: inline-block; }
.toggle-arrow.open { transform: rotate(180deg); }
.glossary-body { display: none; background: var(--c-bg2); border-radius: var(--r-md); padding: 0 1rem; margin-bottom: 1rem; overflow: hidden; }
.glossary-body.open { display: block; padding: 0.5rem 1rem 1rem; }
.gterm { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,2fr); gap: 8px 16px; padding: 8px 0; border-bottom: 0.5px solid var(--c-border); align-items: baseline; }
.gterm:last-child { border-bottom: none; }
.gterm-name { font-size: 13px; font-weight: 500; color: var(--c-text); }
.gterm-def { font-size: 13px; color: var(--c-text2); line-height: 1.5; }
</style>
