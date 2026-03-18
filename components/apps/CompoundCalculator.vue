<script setup>
// components/apps/CompoundCalculator.vue
// Two-column desktop layout: controls (left, scrollable) + chart panel (right, sticky).

import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import {
  SCENARIOS,
  calcSmooth,
  runCustomPath,
  calcVolPaths,
  correlation,
  fmtShort,
  fmtFull,
} from '~/composables/usePortfolioSim.js'

// ── Sliders ────────────────────────────────────────────────────────────
const P      = ref(500000)
const mo     = ref(0)
const cg     = ref(0)
const yrs    = ref(30)
const rate   = ref(8)
const fees   = ref(0.15)
const spend  = ref(4)
const infl   = ref(3)
const tax    = ref(0)
const vol    = ref(15)
const nPaths = ref(20)
const seed   = ref(42)

// ── Curve editors ──────────────────────────────────────────────────────
const retEnabled  = ref(false)
const spendEnabled = ref(false)
const retData     = ref([])
const spendData   = ref([])

function initRetData()   { retData.value   = Array.from({ length: yrs.value }, () => rate.value / 100) }
function initSpendData() { spendData.value = Array.from({ length: yrs.value }, () => spend.value / 100) }

function syncDataLength(dataRef, defFn) {
  const cur = dataRef.value
  if (cur.length === yrs.value) return
  const next = Array.from({ length: yrs.value }, (_, i) => i < cur.length ? cur[i] : defFn())
  dataRef.value = next
}

watch(yrs, () => {
  syncDataLength(retData,   () => rate.value / 100)
  syncDataLength(spendData, () => spend.value / 100)
})

function toggleRet() {
  retEnabled.value = !retEnabled.value
  if (retEnabled.value && retData.value.length !== yrs.value) initRetData()
}
function toggleSpend() {
  spendEnabled.value = !spendEnabled.value
  if (spendEnabled.value && spendData.value.length !== yrs.value) initSpendData()
}

// ── Named scenarios ────────────────────────────────────────────────────
const activeScen = ref(null)
function toggleScen(name) {
  activeScen.value = activeScen.value === name ? null : name
}

// ── Computed simulation outputs ────────────────────────────────────────
const smooth = computed(() => calcSmooth({
  P: P.value, rate: rate.value, yrs: yrs.value, mo: mo.value, cg: cg.value,
  fees: fees.value, infl: infl.value, tax: tax.value, spend: spend.value,
}))

const volResult = computed(() => {
  if (nPaths.value === 0 || vol.value === 0) return { paths: [], solventCount: 0 }
  return calcVolPaths({
    P: P.value, rate: rate.value, yrs: yrs.value, mo: mo.value, cg: cg.value,
    fees: fees.value, infl: infl.value, tax: tax.value, spend: spend.value,
    vol: vol.value, nPaths: nPaths.value, seed: seed.value,
  })
})

const scenPath = computed(() => {
  if (!activeScen.value) return null
  const sc = SCENARIOS[activeScen.value]
  const flatSpend = Array.from({ length: yrs.value }, () => spend.value / 100)
  return runCustomPath({
    P: P.value, yrs: yrs.value, mo: mo.value, cg: cg.value,
    fees: fees.value, tax: tax.value,
    annualReturns: sc.getReturns(rate.value, yrs.value),
    annualSpends: flatSpend,
  })
})

const scenColor = computed(() => activeScen.value ? SCENARIOS[activeScen.value].color : '#9B59B6')

// Custom return path (purple) — drawn returns + flat or drawn spend
const customRetPath = computed(() => {
  if (!retEnabled.value || retData.value.length !== yrs.value) return null
  const spendArr = spendEnabled.value && spendData.value.length === yrs.value
    ? spendData.value
    : Array.from({ length: yrs.value }, () => spend.value / 100)
  return runCustomPath({
    P: P.value, yrs: yrs.value, mo: mo.value, cg: cg.value,
    fees: fees.value, tax: tax.value,
    annualReturns: retData.value,
    annualSpends: spendArr,
  })
})

// Custom spend path (orange) — only shown when spend active and return NOT active
const customSpendPath = computed(() => {
  if (!spendEnabled.value || retEnabled.value || spendData.value.length !== yrs.value) return null
  const retArr = Array.from({ length: yrs.value }, () => rate.value / 100)
  return runCustomPath({
    P: P.value, yrs: yrs.value, mo: mo.value, cg: cg.value,
    fees: fees.value, tax: tax.value,
    annualReturns: retArr,
    annualSpends: spendData.value,
  })
})

// ── Metric cards ───────────────────────────────────────────────────────
const finalNom     = computed(() => smooth.value.noms.at(-1))
const finalReal    = computed(() => smooth.value.reals.at(-1))
const finalContrib = computed(() => smooth.value.conts.at(-1))
const solventPct   = computed(() => {
  if (nPaths.value === 0 || vol.value === 0) return null
  return Math.round(volResult.value.solventCount / nPaths.value * 100)
})

const alignmentLabel = computed(() => {
  if (!retEnabled.value || !spendEnabled.value) return null
  const corr = correlation(retData.value, spendData.value)
  if (corr < -0.4) return { val: (corr * 100).toFixed(0) + '%', sub: 'Counter-cyclical (adaptive)' }
  if (corr >  0.4) return { val: (corr * 100).toFixed(0) + '%', sub: 'Pro-cyclical spending' }
  return { val: (corr * 100).toFixed(0) + '%', sub: 'Uncorrelated' }
})

// ── Slider config ──────────────────────────────────────────────────────
const sliders = [
  {
    section: 'Portfolio',
    items: [
      { label: 'Initial investment',      model: P,      min: 1000,  max: 3000000, step: 5000,  fmt: v => fmtFull(v) },
      { label: 'Monthly contribution',    model: mo,     min: 0,     max: 10000,   step: 100,   fmt: v => fmtFull(v) },
      { label: 'Contribution growth/yr',  model: cg,     min: 0,     max: 10,      step: 0.5,   fmt: v => v.toFixed(1) + '%' },
      { label: 'Time horizon',            model: yrs,    min: 5,     max: 50,      step: 1,     fmt: v => v + ' yrs' },
    ],
  },
  {
    section: 'Returns',
    items: [
      { label: 'Gross annual return',     model: rate,   min: 1,     max: 20,      step: 0.5,   fmt: v => v.toFixed(1) + '%' },
      { label: 'Annual fees',             model: fees,   min: 0,     max: 2,       step: 0.05,  fmt: v => v.toFixed(2) + '%' },
      { label: 'Annual spend / withdrawal', model: spend, min: 0,   max: 12,      step: 0.25,  fmt: v => v.toFixed(2) + '% / yr' },
    ],
  },
  {
    section: 'Macro',
    items: [
      { label: 'Inflation rate',          model: infl,   min: 0,     max: 8,       step: 0.25,  fmt: v => v.toFixed(2) + '%' },
      { label: 'Tax on gains (annual)',   model: tax,    min: 0,     max: 40,      step: 1,     fmt: v => v === 0 ? '0% (tax-deferred)' : v + '%' },
    ],
  },
  {
    section: 'Volatility',
    items: [
      { label: 'Annual volatility (σ)',   model: vol,    min: 0,     max: 40,      step: 1,     fmt: v => v === 0 ? '0% (off)' : v + '% σ' },
      { label: 'Random paths',            model: nPaths, min: 0,     max: 50,      step: 1,     fmt: v => v === 0 ? '0 (off)' : v + ' paths' },
      { label: 'Random seed',             model: seed,   min: 1,     max: 100,     step: 1,     fmt: v => '#' + v },
    ],
  },
]

// ── Sidebar collapse ────────────────────────────────────────────────────
const isLg = ref(true)
const sidebarOpen = ref(false)

function checkBreakpoint() {
  const wasLg = isLg.value
  isLg.value = window.matchMedia('(min-width: 1024px)').matches
  if (wasLg !== isLg.value) {
    sidebarOpen.value = isLg.value
  }
}
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

// ── Sidebar scroll reset ───────────────────────────────────────────────
const sidebarScroll = ref(null)
onMounted(() => {
  isLg.value = window.matchMedia('(min-width: 1024px)').matches
  sidebarOpen.value = isLg.value
  window.addEventListener('resize', checkBreakpoint)
  if (sidebarScroll.value) sidebarScroll.value.scrollTop = 0
})
onUnmounted(() => {
  window.removeEventListener('resize', checkBreakpoint)
})
</script>

<template>
  <div class="relative flex flex-col lg:flex-row gap-0 h-full min-h-0">

    <!-- ── Mobile drawer: teleported to body so it can stack above navbar (z-1000) ── -->
    <Teleport to="body">
      <div
        v-if="sidebarOpen && !isLg"
        class="lg:hidden fixed inset-0 z-[1100] bg-black/60"
        @click="toggleSidebar"
        aria-hidden="true"
      />
      <aside
        v-if="sidebarOpen && !isLg"
        class="
          lg:hidden fixed inset-y-0 left-0 z-[1101] w-[85vw] max-w-sm
          bg-zinc-950 backdrop-blur-xl
          flex flex-col overflow-hidden
        "
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

        <template v-for="group in sliders" :key="group.section + '-mobile'">
          <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
            {{ group.section }}
          </p>
          <div v-for="s in group.items" :key="s.label + '-mobile'" class="py-1.5">
            <div class="flex items-baseline justify-between mb-1 gap-2">
              <span class="text-[12px] text-zinc-400 leading-tight">{{ s.label }}</span>
              <span class="text-[13px] font-medium text-zinc-200 tabular-nums whitespace-nowrap flex-shrink-0">
                {{ s.fmt(s.model.value) }}
              </span>
            </div>
            <input
              type="range"
              :min="s.min" :max="s.max" :step="s.step"
              v-model.number="s.model.value"
              class="w-full accent-indigo-400"
            />
          </div>
        </template>

        <p class="pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          Custom Return Curve
        </p>
        <div class="flex items-center gap-2 mb-3">
          <button
            @click="toggleRet"
            class="text-[12px] px-3 py-1.5 rounded-md border transition-all"
            :class="retEnabled
              ? 'bg-fuchsia-500 border-fuchsia-500 text-white'
              : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
          >{{ retEnabled ? 'On' : 'Enable' }}</button>
          <button
            @click="initRetData"
            class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-all"
          >Clear</button>
        </div>

        <p class="pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          Custom Spend Curve
        </p>
        <div class="flex items-center gap-2 mb-3">
          <button
            @click="toggleSpend"
            class="text-[12px] px-3 py-1.5 rounded-md border transition-all"
            :class="spendEnabled
              ? 'bg-orange-500 border-orange-500 text-white'
              : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
          >{{ spendEnabled ? 'On' : 'Enable' }}</button>
          <button
            @click="initSpendData"
            class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-all"
          >Clear</button>
        </div>

        <p class="pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
          Named Scenarios
        </p>
        <div class="flex flex-wrap gap-2 pb-2">
          <button
            v-for="(sc, name) in SCENARIOS" :key="name + '-mobile'"
            @click="toggleScen(name)"
            class="text-[12px] px-3 py-1.5 rounded-md border transition-all"
            :style="activeScen === name
              ? { background: sc.color, borderColor: sc.color, color: '#fff' }
              : {}"
            :class="activeScen !== name
              ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
              : ''"
          >{{ name }}</button>
        </div>

        <div class="pb-6" />
      </div>
    </aside>
    </Teleport>

    <!-- ── LEFT: Desktop inline controls panel ───────────────────────── -->
    <aside
      class="
        hidden lg:flex
        flex-shrink-0 flex-col overflow-hidden
        border-r border-zinc-800/60
        bg-zinc-950/60 backdrop-blur-sm
        transition-[width] duration-300 ease-in-out
      "
      :class="sidebarOpen ? 'lg:w-80 xl:w-96' : 'lg:w-10'"
    >
      <!-- Expand-only chevron visible when collapsed -->
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

      <div
        v-show="sidebarOpen"
        ref="sidebarScroll"
        class="flex-1 overflow-y-auto px-5 pt-24 pb-6 space-y-1"
      >

      <!-- Sliders -->
      <template v-for="(group, gi) in sliders" :key="group.section">
        <div :class="gi === 0 ? 'flex items-center justify-between' : ''">
          <p class="pt-3 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
            {{ group.section }}
          </p>
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
            <span class="text-[13px] font-medium text-zinc-200 tabular-nums whitespace-nowrap flex-shrink-0">
              {{ s.fmt(s.model.value) }}
            </span>
          </div>
          <input
            type="range"
            :min="s.min" :max="s.max" :step="s.step"
            v-model.number="s.model.value"
            class="w-full accent-indigo-400"
            tabindex="-1"
          />
        </div>
      </template>

      <!-- Return curve editor -->
      <p class="pt-4 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
        Custom Return Curve
      </p>
      <p class="text-[12px] text-zinc-500 pb-2 leading-snug">
        Drag to paint annual returns (±40%). Overrides gross return when active.
      </p>
      <div class="flex items-center gap-2 mb-3">
        <button
          @click="toggleRet"
          class="text-[12px] px-3 py-1.5 rounded-md border transition-all"
          :class="retEnabled
            ? 'bg-fuchsia-500 border-fuchsia-500 text-white'
            : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
        >{{ retEnabled ? 'On — drawing' : 'Enable' }}</button>
        <button
          @click="initRetData"
          class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-all"
        >Clear</button>
        <span class="text-[11px] text-zinc-600">{{ retEnabled ? 'Active' : 'Off' }}</span>
      </div>
      <ClientOnly>
        <AppsCurveEditor
          v-model="retData"
          :yrs="yrs" :min="-0.40" :max="0.40"
          :signed="true" color="#E040FB" label="return"
          :enabled="retEnabled" :height="160"
        />
      </ClientOnly>

      <!-- Spend curve editor -->
      <p class="pt-5 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
        Custom Spend Curve
      </p>
      <p class="text-[12px] text-zinc-500 pb-2 leading-snug">
        Drag to set withdrawal rate by year (0–15%). Overrides spend slider when active.
      </p>
      <div class="flex items-center gap-2 mb-3">
        <button
          @click="toggleSpend"
          class="text-[12px] px-3 py-1.5 rounded-md border transition-all"
          :class="spendEnabled
            ? 'bg-orange-500 border-orange-500 text-white'
            : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'"
        >{{ spendEnabled ? 'On — drawing' : 'Enable' }}</button>
        <button
          @click="initSpendData"
          class="text-[12px] px-3 py-1.5 rounded-md border border-zinc-700 bg-zinc-800/60 text-zinc-400 hover:text-zinc-200 transition-all"
        >Clear</button>
        <span class="text-[11px] text-zinc-600">{{ spendEnabled ? 'Active' : 'Off' }}</span>
      </div>
      <ClientOnly>
        <AppsCurveEditor
          v-model="spendData"
          :yrs="yrs" :min="0" :max="0.15"
          :signed="false" color="#FF9800" label="spend"
          :enabled="spendEnabled" :height="160"
        />
      </ClientOnly>

      <!-- Named scenarios -->
      <p class="pt-5 pb-1 text-[10px] font-semibold tracking-widest uppercase text-zinc-600">
        Named Scenarios
      </p>
      <div class="flex flex-wrap gap-2 pb-2">
        <button
          v-for="(sc, name) in SCENARIOS" :key="name"
          @click="toggleScen(name)"
          class="text-[12px] px-3 py-1.5 rounded-md border transition-all"
          :style="activeScen === name
            ? { background: sc.color, borderColor: sc.color, color: '#fff' }
            : {}"
          :class="activeScen !== name
            ? 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:text-zinc-200'
            : ''"
        >{{ name }}</button>
      </div>
      <p v-if="activeScen" class="text-[12px] text-zinc-500 leading-snug pb-2">
        {{ SCENARIOS[activeScen].desc }}
      </p>

      <div class="pb-6" />
      </div>
    </aside>

    <!-- ── RIGHT: Chart panel (grows with window) ───────────────────────── -->
    <main class="flex-1 min-w-0 px-6 pt-24 pb-6 space-y-6 overflow-y-auto overflow-x-hidden">

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

      <!-- Metric cards -->
      <div class="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <div class="bg-zinc-900/60 rounded-xl border border-zinc-800/60 px-4 py-4">
          <p class="text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">Smooth nominal</p>
          <p class="text-2xl font-medium text-zinc-100 tabular-nums">{{ fmtShort(finalNom) }}</p>
          <p class="text-[12px] text-zinc-500 mt-1">
            {{ finalContrib > 0 ? (finalNom / finalContrib).toFixed(1) : '—' }}× contributed
          </p>
        </div>
        <div class="bg-zinc-900/60 rounded-xl border border-zinc-800/60 px-4 py-4">
          <p class="text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">Real value (today's $)</p>
          <p class="text-2xl font-medium text-zinc-100 tabular-nums">{{ fmtShort(finalReal) }}</p>
          <p class="text-[12px] text-zinc-500 mt-1">inflation-adjusted</p>
        </div>
        <div class="bg-zinc-900/60 rounded-xl border border-zinc-800/60 px-4 py-4">
          <p class="text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">Random paths solvent</p>
          <p class="text-2xl font-medium text-zinc-100 tabular-nums">
            {{ solventPct !== null ? volResult.solventCount + ' / ' + nPaths : '—' }}
          </p>
          <p class="text-[12px] text-zinc-500 mt-1">
            {{ solventPct !== null ? solventPct + '% survive horizon' : 'set vol + paths > 0' }}
          </p>
        </div>
        <div class="bg-zinc-900/60 rounded-xl border border-zinc-800/60 px-4 py-4">
          <p class="text-[11px] text-zinc-500 mb-1.5 uppercase tracking-wider">
            {{ alignmentLabel ? 'Spend/return alignment' : 'Volatility drag (σ²/2)' }}
          </p>
          <p class="text-2xl font-medium text-zinc-100 tabular-nums">
            {{ alignmentLabel ? alignmentLabel.val : (vol * vol / 200).toFixed(2) + '%' }}
          </p>
          <p class="text-[12px] text-zinc-500 mt-1">
            {{ alignmentLabel ? alignmentLabel.sub : 'geometric mean penalty' }}
          </p>
        </div>
      </div>

      <!-- Main chart -->
      <div class="bg-zinc-900/40 rounded-xl border border-zinc-800/60 p-4">
        <ClientOnly>
          <AppsPortfolioChart
            :smooth="smooth"
            :vpaths="volResult.paths"
            :scen-path="scenPath"
            :scen-color="scenColor"
            :custom-ret-path="customRetPath"
            :custom-spend-path="customSpendPath"
            :yrs="yrs"
            :height="440"
          />
        </ClientOnly>
      </div>

      <!-- Legend -->
      <div class="flex flex-wrap gap-x-5 gap-y-2 text-[12px] text-zinc-500">
        <span class="flex items-center gap-2">
          <span class="w-5 h-[3px] bg-indigo-400 rounded inline-block" />
          Smooth nominal
        </span>
        <span class="flex items-center gap-2">
          <span class="w-5 h-[3px] bg-emerald-500 rounded inline-block" />
          Real value
        </span>
        <span class="flex items-center gap-2">
          <span class="w-5 h-[3px] bg-sky-300/60 rounded inline-block" />
          Contributed
        </span>
        <span class="flex items-center gap-2">
          <span class="w-5 h-[3px] bg-orange-400/70 rounded inline-block" />
          Random paths
        </span>
        <span v-if="customRetPath" class="flex items-center gap-2">
          <span class="w-5 h-0 border-t-2 border-dashed border-fuchsia-400 inline-block" />
          Custom returns
        </span>
        <span v-if="customSpendPath" class="flex items-center gap-2">
          <span class="w-5 h-0 border-t-2 border-dashed border-orange-400 inline-block" />
          Custom spend
        </span>
        <span v-if="activeScen" class="flex items-center gap-2">
          <span class="w-5 h-0 border-t-2 border-dashed inline-block" :style="{ borderColor: scenColor }" />
          {{ activeScen }}
        </span>
      </div>

      <p class="text-[11px] text-zinc-600 leading-relaxed pb-6">
        Random paths use a seeded pseudo-random walk, not true Monte Carlo.
        Named scenarios apply fixed historical-shaped return sequences.
        Custom curves override their respective sliders when active.
        When both custom curves are active, the purple line shows the combined outcome.
      </p>
    </main>
  </div>
</template>
