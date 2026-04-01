<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { buildProjectionChart } from '~/composables/useProjectionChart.js'

let ChartJS = null
let nProjChart = null, nRevChart = null
let bProjChart = null, bDeChart = null

const config = useRuntimeConfig()
const FINNHUB_KEY = config.public.finnhubApiKey
let ws = null

const activeTab = ref('nvda')

const prices = reactive({})
const prevPrices = reactive({})
const statusText = ref('Connecting to Finnhub...')
const livePaused = ref(false)
let closingWsForPause = false
const CHART_PRICE_UPDATE_MS = 2000

// ─── Sidebar (matches CompoundCalculator pattern) ─────────────
const isLg = ref(true)
const sidebarOpen = ref(false)
const sidebarScrollEl = ref(null)

function checkBreakpoint() {
  const wasLg = isLg.value
  isLg.value = window.matchMedia('(min-width: 1024px)').matches
  if (wasLg !== isLg.value) sidebarOpen.value = isLg.value
}
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

// ─── Cost bases ───────────────────────────────────────────────
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
const nG = ref(33.6)
const nD = ref(10)
const nR1 = ref(78)
const nR2 = ref(93.5)
const nR3 = ref(112.5)
const nR4 = ref(140)

// ─── BX sliders ───────────────────────────────────────────────
const bDe1 = ref(6.33)
const bDe2 = ref(7.90)
const bPay = ref(85)
const bPMin = ref(22)
const bPMax = ref(29)
const bG = ref(10)
const bD = ref(8)

// ─── Slider configs (rendered in sidebar via v-for) ───────────
const dlr = n => '$' + n.toFixed(2)
const pct = (n, d = 1) => (n >= 0 ? '+' : '') + (n * 100).toFixed(d) + '%'
const colCls = n => n >= 0 ? 'pos' : 'neg'
const absDlr = n => (n >= 0 ? '+$' : '\u2212$') + Math.abs(n).toFixed(2)

const nvdaSliders = [
  {
    section: 'P/E Valuation',
    items: [
      { label: '1-year forward EPS', model: nEps1, min: 5, max: 15, step: 0.01, fmt: v => dlr(v) },
      { label: '2-year forward EPS', model: nEps2, min: 5, max: 20, step: 0.01, fmt: v => dlr(v) },
      { label: 'Min P/E multiple', model: nPeMin, min: 15, max: 80, step: 0.1, fmt: v => v.toFixed(1) + '\u00d7' },
      { label: 'Max P/E multiple', model: nPeMax, min: 15, max: 120, step: 0.1, fmt: v => v.toFixed(1) + '\u00d7' },
      { label: 'Growth rate g', model: nG, min: 10, max: 80, step: 0.1, fmt: v => v.toFixed(1) + '%' },
      { label: 'Discount rate d', model: nD, min: 5, max: 20, step: 0.1, fmt: v => v.toFixed(1) + '%' },
    ],
  },
  {
    section: 'FY2027 Revenue Model',
    items: [
      { label: 'Q1 Apr 2026 ($B)', model: nR1, min: 40, max: 130, step: 0.5, fmt: v => '$' + v.toFixed(1) + 'B' },
      { label: 'Q2 Jul 2026 ($B)', model: nR2, min: 50, max: 160, step: 0.5, fmt: v => '$' + v.toFixed(1) + 'B' },
      { label: 'Q3 Oct 2026 ($B)', model: nR3, min: 60, max: 190, step: 0.5, fmt: v => '$' + v.toFixed(1) + 'B' },
      { label: 'Q4 Jan 2027 ($B)', model: nR4, min: 80, max: 230, step: 0.5, fmt: v => '$' + v.toFixed(1) + 'B' },
    ],
  },
]

const bxSliders = [
  {
    section: 'P/DE Valuation',
    items: [
      { label: '1-year forward DE', model: bDe1, min: 3, max: 12, step: 0.01, fmt: v => dlr(v) },
      { label: '2-year forward DE', model: bDe2, min: 3, max: 15, step: 0.01, fmt: v => dlr(v) },
      { label: 'Payout ratio', model: bPay, min: 50, max: 100, step: 1, fmt: v => v + '%' },
      { label: 'Min P/DE multiple', model: bPMin, min: 10, max: 40, step: 0.1, fmt: v => v.toFixed(1) + '\u00d7' },
      { label: 'Max P/DE multiple', model: bPMax, min: 10, max: 50, step: 0.1, fmt: v => v.toFixed(1) + '\u00d7' },
      { label: 'Growth rate g', model: bG, min: 5, max: 25, step: 0.1, fmt: v => v.toFixed(1) + '%' },
      { label: 'Discount rate d', model: bD, min: 4, max: 15, step: 0.1, fmt: v => v.toFixed(1) + '%' },
    ],
  },
]

const currentSliders = computed(() => {
  if (activeTab.value === 'nvda') return nvdaSliders
  if (activeTab.value === 'bx') return bxSliders
  return []
})

// ─── Watchlist ────────────────────────────────────────────────
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
  } catch { /* ignore */ }
}
const newTicker = ref('')

// ─── Template refs for canvases (safer than getElementById) ───
const nProjCanvas = ref(null)
const nRevCanvas = ref(null)
const bProjCanvas = ref(null)
const bDeCanvas = ref(null)

// ─── Misc state ───────────────────────────────────────────────
const nvdaGlossaryOpen = ref(false)
const bxGlossaryOpen = ref(false)
const nProjZoomed = ref(false)
const bProjZoomed = ref(false)

// ─── NVDA computed ────────────────────────────────────────────
const nvdaPrice = computed(() => prices['NVDA'] || 176.63)
const nvdaPrev = computed(() => prevPrices['NVDA'] || nvdaPrice.value)
const nvdaChg = computed(() => nvdaPrice.value - nvdaPrev.value)
const nvdaChgPct = computed(() => nvdaChg.value / nvdaPrev.value)

const nP1h = computed(() => nEps1.value * nPeMax.value)
const nP1l = computed(() => nEps1.value * nPeMin.value)
const nP2h = computed(() => nEps2.value * nPeMax.value)
const nP2l = computed(() => nEps2.value * nPeMin.value)

const n1Range = computed(() => `${dlr(nP1l.value)}\u2013${dlr(nP1h.value)}`)
const n2Range = computed(() => `${dlr(nP2l.value)}\u2013${dlr(nP2h.value)}`)
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

const b1Range = computed(() => `${dlr(bP1l.value)}\u2013${dlr(bP1h.value)}`)
const b2Range = computed(() => `${dlr(bP2l.value)}\u2013${dlr(bP2h.value)}`)
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

// ─── Chart rendering (sync, template refs, try/catch recovery) ─
function canPatchBarChart(chart, canvasEl) {
  if (!ChartJS || !chart?.canvas || !canvasEl) return false
  try {
    if (chart.canvas !== canvasEl) return false
    const reg = ChartJS.getChart(canvasEl)
    if (reg != null && reg !== chart) return false
    return chart.config?.type === 'bar' && chart.data?.datasets?.length === 2
  } catch { return false }
}

function safeDestroyChart(chart) {
  try { chart?.destroy() } catch { /* ignore */ }
}

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
    safeDestroyChart(nProjChart)
    nProjChart = null
    try {
      nProjChart = buildProjectionChart(
        ChartJS, el, nvdaPrice.value,
        nEps1.value, nEps2.value, nPeMin.value, nPeMax.value, nG.value / 100,
        null, nProjZoomed.value ? 3 : 10,
      )
    } catch { /* give up */ }
  }
}

function renderNVDARevChart() {
  if (!ChartJS) return
  const el = nRevCanvas.value
  if (!el) return
  const gc = window.matchMedia('(prefers-color-scheme:dark)').matches
    ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const revData = nRevs.value.map(v => +v.toFixed(1))
  const epsData = nQEPS.value.map(v => +v.toFixed(2))

  if (canPatchBarChart(nRevChart, el)) {
    try {
      nRevChart.data.datasets[0].data = revData
      nRevChart.data.datasets[1].data = epsData
      nRevChart.options.scales.y.grid.color = gc
      nRevChart.update()
      return
    } catch { /* fall through to recreate */ }
  }

  safeDestroyChart(nRevChart)
  nRevChart = null
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
        animation: false,
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gc }, title: { display: true, text: 'Revenue ($B)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y2: { position: 'right', title: { display: true, text: 'EPS ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    })
  } catch { /* give up */ }
}

function renderNVDACharts() {
  renderNVDAProjChart()
  renderNVDARevChart()
}

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
    safeDestroyChart(bProjChart)
    bProjChart = null
    try {
      bProjChart = buildProjectionChart(
        ChartJS, el, bxPrice.value,
        bDe1.value, bDe2.value, bPMin.value, bPMax.value, bG.value / 100,
        null, bProjZoomed.value ? 3 : 10,
      )
    } catch { /* give up */ }
  }
}

function renderBXDeChart() {
  if (!ChartJS) return
  const el = bDeCanvas.value
  if (!el) return
  const gc = window.matchMedia('(prefers-color-scheme:dark)').matches
    ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'
  const deData = [...bDeYears.value]
  const distData = [...bDistYears.value]

  if (canPatchBarChart(bDeChart, el)) {
    try {
      bDeChart.data.datasets[0].data = deData
      bDeChart.data.datasets[1].data = distData
      bDeChart.options.scales.y.grid.color = gc
      bDeChart.update()
      return
    } catch { /* fall through */ }
  }

  safeDestroyChart(bDeChart)
  bDeChart = null
  try {
    bDeChart = new ChartJS(el, {
      type: 'bar',
      data: {
        labels: ['Now', 'Year 1', 'Year 2', 'Year 3'],
        datasets: [
          { label: 'DE/share', data: deData, backgroundColor: '#378ADD', yAxisID: 'y' },
          { label: 'Dist/share', data: distData, type: 'line', borderColor: '#1D9E75', backgroundColor: 'transparent', pointBackgroundColor: '#1D9E75', pointRadius: 5, yAxisID: 'y2' },
        ],
      },
      options: {
        animation: false,
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: gc }, title: { display: true, text: 'DE per share ($)', font: { size: 11 } }, ticks: { font: { size: 11 } } },
          y2: { position: 'right', title: { display: true, text: 'Distribution/share ($)', font: { size: 11 } }, ticks: { font: { size: 11 } }, grid: { drawOnChartArea: false } },
          x: { grid: { display: false }, ticks: { font: { size: 11 }, autoSkip: false } },
        },
      },
    })
  } catch { /* give up */ }
}

function renderBXCharts() {
  renderBXProjChart()
  renderBXDeChart()
}

// ─── Finnhub REST + WebSocket (with auto-reconnect) ──────────
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
  if (ws) { ws.close(); ws = null }
}

let reconnectTimer = null
let reconnectDelay = 2000

function scheduleReconnect() {
  if (livePaused.value || reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    if (!livePaused.value) connectWS()
    reconnectDelay = Math.min(reconnectDelay * 2, 30000)
  }, reconnectDelay)
}

function connectWS() {
  if (!FINNHUB_KEY) { statusText.value = 'No API key configured'; return }
  if (livePaused.value) return
  disconnectWS()
  ws = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_KEY}`)
  ws.onopen = () => {
    reconnectDelay = 2000
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
    if (closingWsForPause) { closingWsForPause = false; return }
    statusText.value = 'Reconnecting...'
    scheduleReconnect()
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
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null }
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
  isLg.value = window.matchMedia('(min-width: 1024px)').matches
  sidebarOpen.value = isLg.value
  window.addEventListener('resize', checkBreakpoint)

  const { default: Chart } = await import('chart.js/auto')
  ChartJS = Chart
  renderNVDACharts()
  await fetchQuotes(allTickers.value)
  connectWS()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkBreakpoint)
  if (reconnectTimer) clearTimeout(reconnectTimer)
  disconnectWS()
  ;[nProjChart, nRevChart, bProjChart, bDeChart].forEach(c => safeDestroyChart(c))
})

// ─── Throttle ─────────────────────────────────────────────────
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
const throttledNVDAProj = throttle(() => { if (activeTab.value === 'nvda') renderNVDAProjChart() }, CHART_PRICE_UPDATE_MS)
const throttledBXProj = throttle(() => { if (activeTab.value === 'bx') renderBXProjChart() }, CHART_PRICE_UPDATE_MS)

// ─── Watchers ─────────────────────────────────────────────────
watch([nEps1, nEps2, nPeMin, nPeMax, nG, nD, nProjZoomed], () => {
  if (activeTab.value === 'nvda') renderNVDAProjChart()
})
watch([nR1, nR2, nR3, nR4], () => {
  if (activeTab.value === 'nvda') renderNVDARevChart()
})
watch([bDe1, bDe2, bPMin, bPMax, bG, bD, bProjZoomed], () => {
  if (activeTab.value === 'bx') renderBXProjChart()
})
watch([bDe1, bPay, bG], () => {
  if (activeTab.value === 'bx') renderBXDeChart()
})
watch(nvdaPrice, throttledNVDAProj)
watch(bxPrice, throttledBXProj)

watch(activeTab, (tab) => {
  if (tab === 'nvda') renderNVDACharts()
  if (tab === 'bx') renderBXCharts()
}, { flush: 'post' })

watch(watchlist, () => {
  if (!import.meta.client) return
  try { localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(watchlist.value)) } catch {}
}, { deep: true })
</script>

<template>
  <div class="sa-root relative flex flex-col lg:flex-row gap-0 h-full min-h-0">

    <!-- ── Mobile drawer (teleported above navbar) ──────────── -->
    <Teleport to="body">
      <div
        v-if="sidebarOpen && !isLg"
        class="lg:hidden fixed inset-0 z-[1100] bg-black/60"
        @click="toggleSidebar"
        aria-hidden="true"
      />
      <aside
        v-if="sidebarOpen && !isLg"
        class="lg:hidden fixed inset-y-0 left-0 z-[1101] w-[85vw] max-w-sm bg-zinc-950 backdrop-blur-xl flex flex-col overflow-hidden"
      >
        <div class="flex-1 overflow-y-auto px-5 pt-8 pb-6 space-y-1">
          <div class="flex items-center justify-between mb-4">
            <span class="text-[12px] font-semibold tracking-widest uppercase text-zinc-400">Controls</span>
            <button @click="toggleSidebar" class="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
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
              <input type="text" v-model="newTicker" placeholder="e.g. MSFT" @keydown.enter="addTicker"
                class="flex-1 text-[13px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 placeholder-zinc-600" />
              <button @click="addTicker" class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-zinc-100 transition-colors">Add</button>
            </div>
          </template>

          <div class="pb-6" />
        </div>
      </aside>
    </Teleport>

    <!-- ── Desktop sidebar ─────────────────────────────────── -->
    <aside
      class="hidden lg:flex flex-shrink-0 flex-col overflow-hidden border-r border-zinc-800/60 bg-zinc-950/60 backdrop-blur-sm transition-[width] duration-300 ease-in-out"
      :class="sidebarOpen ? 'lg:w-80 xl:w-96' : 'lg:w-10'"
    >
      <button
        v-if="!sidebarOpen"
        @click="toggleSidebar"
        class="flex items-center justify-center w-10 h-10 mt-24 text-zinc-500 hover:text-zinc-200 transition-colors"
        title="Expand controls"
      >
        <svg class="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div v-show="sidebarOpen" ref="sidebarScrollEl" class="flex-1 overflow-y-auto px-5 pt-24 pb-6 space-y-1">
        <template v-for="(group, gi) in currentSliders" :key="group.section">
          <div :class="gi === 0 ? 'flex items-center justify-between' : ''">
            <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">{{ group.section }}</p>
            <button
              v-if="gi === 0"
              @click="toggleSidebar"
              class="flex items-center gap-1 text-zinc-500 hover:text-zinc-200 transition-colors"
              title="Collapse controls"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
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
            <input type="text" v-model="newTicker" placeholder="e.g. MSFT" @keydown.enter="addTicker"
              class="flex-1 text-[13px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 text-zinc-200 placeholder-zinc-600" />
            <button @click="addTicker" class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-300 hover:text-zinc-100 transition-colors">Add</button>
          </div>
        </template>

        <div class="pb-6" />
      </div>
    </aside>

    <!-- ── Main panel ──────────────────────────────────────── -->
    <main class="flex-1 min-w-0 px-6 pt-24 pb-6 space-y-5 overflow-y-auto overflow-x-hidden">

      <!-- Mobile controls toggle -->
      <button
        @click="toggleSidebar"
        class="lg:hidden inline-flex items-center gap-2 text-[12px] px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900/80 text-zinc-300 hover:text-zinc-100 hover:border-zinc-500 transition-all"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
        </svg>
        Controls
      </button>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'nvda' }" @click="activeTab = 'nvda'">NVDA</button>
        <button class="tab" :class="{ active: activeTab === 'bx' }" @click="activeTab = 'bx'">BX</button>
        <button class="tab" :class="{ active: activeTab === 'watchlist' }" @click="activeTab = 'watchlist'">Watchlist</button>
      </div>

      <!-- Live pill (shared) -->
      <div class="live-pill">
        <span class="live-dot" :class="{ paused: livePaused }" />
        <span>{{ statusText }}</span>
        <button type="button" class="live-toggle" @click="toggleLiveStream">{{ livePaused ? 'Start' : 'Pause' }}</button>
      </div>

      <!-- ═══════════ NVDA TAB ═══════════ -->
      <div v-show="activeTab === 'nvda'" class="space-y-5">

        <!-- Metric cards -->
        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div class="metric-card">
            <p class="mc-label">Current price</p>
            <p class="mc-value">{{ dlr(nvdaPrice) }}</p>
            <p class="mc-sub" :class="colCls(nvdaChg)">{{ absDlr(nvdaChg) }} ({{ pct(nvdaChgPct, 2) }})</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">1yr target range</p>
            <p class="mc-value">{{ n1Range }}</p>
            <p class="mc-sub">{{ n1RangeSub }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">2yr target range</p>
            <p class="mc-value">{{ n2Range }}</p>
            <p class="mc-sub">{{ n2RangeSub }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">10yr intrinsic floor</p>
            <p class="mc-value">{{ dlr(nFloor) }}</p>
            <p class="mc-sub" :class="colCls(nVsFloor)">{{ nVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}</p>
          </div>
        </div>

        <!-- P/E Projection -->
        <div class="card">
          <div class="card-title">P/E valuation &mdash; price targets &amp; 10-year projection</div>
          <div class="insight">Price target = Forward EPS &times; P/E multiple. Solid lines show the 1yr and 2yr targets from your sliders. Dotted lines extrapolate forward using growth rate g.</div>

          <div class="section-label">1-year targets</div>
          <div class="targets">
            <div class="tcard hero"><div class="tlabel">High target</div><div class="tprice" :class="colCls(nP1h - nvdaPrice)">{{ dlr(nP1h) }}</div><div class="tret">{{ pct((nP1h - nvdaPrice) / nvdaPrice) }} from today</div></div>
            <div class="tcard hero"><div class="tlabel">Low target</div><div class="tprice" :class="colCls(nP1l - nvdaPrice)">{{ dlr(nP1l) }}</div><div class="tret">{{ pct((nP1l - nvdaPrice) / nvdaPrice) }} from today</div></div>
          </div>
          <div class="section-label">2-year targets</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">High target</div><div class="tprice" :class="colCls(nP2h - nvdaPrice)">{{ dlr(nP2h) }}</div><div class="tret">{{ pct((nP2h - nvdaPrice) / nvdaPrice) }} from today</div></div>
            <div class="tcard"><div class="tlabel">Low target</div><div class="tprice" :class="colCls(nP2l - nvdaPrice)">{{ dlr(nP2l) }}</div><div class="tret">{{ pct((nP2l - nvdaPrice) / nvdaPrice) }} from today</div></div>
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
          <p class="note">Dotted lines extrapolate using growth rate g and the same P/E range &mdash; not a forecast, an illustration of the range if assumptions hold.</p>
        </div>

        <!-- DCF -->
        <div class="card">
          <div class="card-title">10yr intrinsic floor &mdash; DCF result</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">Intrinsic floor</div><div class="tprice">{{ dlr(nFloor) }}</div><div class="tret">what future earnings are worth today</div></div>
            <div class="tcard"><div class="tlabel">Price vs floor</div><div class="tprice" :class="colCls(nVsFloor)">{{ pct(nVsFloor) }}</div><div class="tret">{{ nVsFloor >= 0 ? 'Stock below DCF floor' : 'Stock above DCF floor' }}</div></div>
          </div>
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

        <!-- NVDA Glossary -->
        <button class="glossary-toggle" @click="nvdaGlossaryOpen = !nvdaGlossaryOpen">
          <span>Key terms &mdash; NVDA analyzer</span>
          <span class="toggle-arrow" :class="{ open: nvdaGlossaryOpen }">&blacktriangledown;</span>
        </button>
        <div class="glossary-body" :class="{ open: nvdaGlossaryOpen }">
          <div class="gterm"><span class="gterm-name">EPS</span><span class="gterm-def">Earnings per share &mdash; the company's net profit divided by total shares.</span></div>
          <div class="gterm"><span class="gterm-name">Forward EPS</span><span class="gterm-def">An analyst's estimate of EPS over the next 12 months &mdash; projected, not yet reported.</span></div>
          <div class="gterm"><span class="gterm-name">P/E multiple</span><span class="gterm-def">Price-to-earnings &mdash; how much investors pay per $1 of earnings. A P/E of 35&times; means the stock costs 35&times; its annual earnings.</span></div>
          <div class="gterm"><span class="gterm-name">Growth rate g</span><span class="gterm-def">The assumed annual rate at which EPS will grow over the next 10 years.</span></div>
          <div class="gterm"><span class="gterm-name">Discount rate d</span><span class="gterm-def">The annual return you require to justify holding this stock. 10% is a common benchmark.</span></div>
          <div class="gterm"><span class="gterm-name">DCF</span><span class="gterm-def">Discounted cash flow &mdash; converts all future projected earnings into today's dollars.</span></div>
          <div class="gterm"><span class="gterm-name">Intrinsic floor</span><span class="gterm-def">The minimum a stock should be worth based on DCF. A margin-of-safety check, not a price target.</span></div>
          <div class="gterm"><span class="gterm-name">Terminal value</span><span class="gterm-def">A lump-sum estimate of the business's value beyond year 10, added to the DCF.</span></div>
        </div>
      </div>

      <!-- ═══════════ BX TAB ═══════════ -->
      <div v-show="activeTab === 'bx'" class="space-y-5">

        <div class="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <div class="metric-card">
            <p class="mc-label">Current price</p>
            <p class="mc-value">{{ dlr(bxPrice) }}</p>
            <p class="mc-sub" :class="colCls(bxChg)">{{ absDlr(bxChg) }} ({{ pct(bxChgPct, 2) }})</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">1yr target range</p>
            <p class="mc-value">{{ b1Range }}</p>
            <p class="mc-sub">{{ b1RangeSub }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">2yr target range</p>
            <p class="mc-value">{{ b2Range }}</p>
            <p class="mc-sub">{{ b2RangeSub }}</p>
          </div>
          <div class="metric-card">
            <p class="mc-label">10yr intrinsic floor</p>
            <p class="mc-value">{{ dlr(bFloor) }}</p>
            <p class="mc-sub" :class="colCls(bVsFloor)">{{ bVsFloor >= 0 ? 'Price BELOW floor' : 'Price above floor' }}</p>
          </div>
        </div>

        <!-- P/DE Projection -->
        <div class="card">
          <div class="card-title">P/DE valuation &mdash; price targets &amp; 10-year projection</div>
          <div class="insight">P/DE works like P/E but uses Distributable Earnings (DE) &mdash; a truer measure of BX cash generation than GAAP earnings. Total return = price appreciation + yield from distributions.</div>

          <div class="section-label">1-year targets</div>
          <div class="targets">
            <div class="tcard hero"><div class="tlabel">High target</div><div class="tprice" :class="colCls(bP1h - bxPrice)">{{ dlr(bP1h) }}</div><div class="tret">{{ pct((bP1h - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld1) }} yield = {{ pct((bP1h - bxPrice) / bxPrice + bYld1) }} total return</div></div>
            <div class="tcard hero"><div class="tlabel">Low target</div><div class="tprice" :class="colCls(bP1l - bxPrice)">{{ dlr(bP1l) }}</div><div class="tret">{{ pct((bP1l - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld1) }} yield = {{ pct((bP1l - bxPrice) / bxPrice + bYld1) }} total return</div></div>
          </div>
          <div class="section-label">2-year targets</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">High target</div><div class="tprice" :class="colCls(bP2h - bxPrice)">{{ dlr(bP2h) }}</div><div class="tret">{{ pct((bP2h - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld2) }} yield = {{ pct((bP2h - bxPrice) / bxPrice + bYld2) }} total return</div></div>
            <div class="tcard"><div class="tlabel">Low target</div><div class="tprice" :class="colCls(bP2l - bxPrice)">{{ dlr(bP2l) }}</div><div class="tret">{{ pct((bP2l - bxPrice) / bxPrice) }} from today</div><div class="tyield">+ {{ pct(bYld2) }} yield = {{ pct((bP2l - bxPrice) / bxPrice + bYld2) }} total return</div></div>
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
          <p class="note">Dotted lines extrapolate using growth rate g and the same P/DE range &mdash; not a forecast, an illustration of the range if assumptions hold.</p>
        </div>

        <!-- BX DCF -->
        <div class="card">
          <div class="card-title">10yr intrinsic floor &mdash; DCF result</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">Intrinsic floor</div><div class="tprice">{{ dlr(bFloor) }}</div><div class="tret">what future DE is worth today</div></div>
            <div class="tcard"><div class="tlabel">Price vs floor</div><div class="tprice" :class="colCls(bVsFloor)">{{ pct(bVsFloor) }}</div><div class="tret">{{ bVsFloor >= 0 ? 'Appears undervalued vs floor' : 'Trades above DCF floor' }}</div></div>
          </div>
        </div>

        <!-- BX DE growth -->
        <div class="card">
          <div class="card-title">DE growth projection &mdash; 3-year outlook</div>
          <div class="targets">
            <div class="tcard"><div class="tlabel">Yr 3 DE/share</div><div class="tprice">{{ dlr(bDeYears[3]) }}</div><div class="tret">{{ pct(Math.pow(1 + bG / 100, 3) - 1) }} cumulative growth</div></div>
            <div class="tcard"><div class="tlabel">Yr 3 distribution</div><div class="tprice">{{ dlr(bDistYears[3]) }}</div><div class="tret">{{ bYr3Yield.toFixed(1) }}% yield on today's price</div></div>
            <div class="tcard"><div class="tlabel">Yr 1 yield</div><div class="tprice">{{ (bYld1 * 100).toFixed(2) }}%</div><div class="tret">{{ dlr(bPay / 100 * bDe1) }}/share</div></div>
            <div class="tcard"><div class="tlabel">10yr intrinsic floor</div><div class="tprice">{{ dlr(bFloor) }}</div></div>
          </div>
          <div class="chart-wrap"><canvas ref="bDeCanvas" /></div>
          <div class="chart-legend">
            <span class="legend-item"><span class="legend-line" style="background:#378ADD" />DE per share</span>
            <span class="legend-item"><span class="legend-line" style="background:#1D9E75" />Distribution per share (right axis)</span>
          </div>
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
          <div class="gterm"><span class="gterm-name">Growth rate g</span><span class="gterm-def">Assumed annual DE growth rate. Set at 10% based on historical DE growth over the past decade.</span></div>
          <div class="gterm"><span class="gterm-name">Discount rate d</span><span class="gterm-def">Your required annual return. Set lower than NVDA (8% vs 10%) because BX cash flows are more predictable.</span></div>
          <div class="gterm"><span class="gterm-name">DCF intrinsic floor</span><span class="gterm-def">The minimum BX should be worth based on future DE discounted to today's dollars.</span></div>
        </div>
      </div>

      <!-- ═══════════ WATCHLIST TAB ═══════════ -->
      <div v-show="activeTab === 'watchlist'" class="space-y-4">

        <!-- Mobile-only add row (desktop uses sidebar) -->
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
  --c-info-text: #7dd3fc;
  --c-info-bg: rgba(56,189,248,0.08);
  --r-md: 6px;
  --r-lg: 12px;
}

/* ─── Tabs ───────────────────────────────────────────────────── */
.tabs { display: flex; gap: 2px; border-bottom: 0.5px solid var(--c-border); }
.tab {
  padding: 8px 18px; font-size: 14px; cursor: pointer; border: none; background: none;
  color: var(--c-text2); border-bottom: 2px solid transparent; margin-bottom: -0.5px;
  font-family: inherit; transition: color 0.15s;
}
.tab.active { color: var(--c-text); border-bottom-color: var(--c-text); font-weight: 500; }
.tab:hover:not(.active) { color: var(--c-text); }

/* ─── Metric cards ───────────────────────────────────────────── */
.metric-card { background: var(--c-bg2); border-radius: var(--r-md); padding: 12px 14px; border: 0.5px solid var(--c-border); }
.mc-label { font-size: 11px; color: var(--c-text2); margin-bottom: 5px; text-transform: uppercase; letter-spacing: 0.04em; }
.mc-value { font-size: 22px; font-weight: 500; color: var(--c-text); line-height: 1.2; }
.mc-sub { font-size: 12px; margin-top: 3px; color: var(--c-text2); }

.pos { color: var(--c-pos) !important; }
.neg { color: var(--c-neg) !important; }

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
.live-toggle { font-size: 11px; padding: 3px 10px; margin-left: 2px; border: 0.5px solid var(--c-border2); border-radius: var(--r-md); background: var(--c-bg); color: var(--c-text); cursor: pointer; font-family: inherit; transition: background 0.15s, color 0.15s; }
.live-toggle:hover { background: var(--c-bg2); color: var(--c-text); }

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
</style>
