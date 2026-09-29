<!-- components/apps/AiComplex.vue -->
<!-- AI Complex signal board. Data: /api/ai-complex/signals (public-safe
     projection of the Notion tracker). Layout math lives in useAiComplex.js;
     this component owns fetch, selection, filter and sizing state. -->
<script setup>
import {
  STATUS, statusOf, directionOf, statusCounts, pressureCategories, latestReading, latestDate,
  staleness, laneLayout, shapePath, readingGroups, formatDate, formatValue, leadLabel, seriesCount,
  arrivalDate, watchArrivalWindow,
  tierOf, TIER_ORDER, gaugeModel, sparkModel, moveOf, focusRun, risingOf, roomToLine, latestBySeries,
} from '~/composables/useAiComplex'

const { data, pending, error } = await useFetch('/api/ai-complex/signals')

const signals = computed(() => data.value?.signals ?? [])
const todayIso = new Date().toISOString().slice(0, 10)

// ── Status filter (tiles double as the filter row) ─────────────
// The list drops filtered-out signals; the board keeps them faded in place so
// the lanes never reflow under the reader.
const statusFilter = ref(null)
const isShown = s => !statusFilter.value || s.status === statusFilter.value
const visible = computed(() => signals.value.filter(isShown))
function toggleFilter(status) {
  statusFilter.value = statusFilter.value === status ? null : status
}

const counts = computed(() => statusCounts(signals.value))

// Per-signal glanceables: gauge, sparkline and the wordless latest-move mark.
const vis = computed(() => new Map(signals.value.map(s => {
  const run = focusRun(s)
  return [s.id, {
    tier: tierOf(s),
    gauge: gaugeModel(s),
    spark: sparkModel(s),
    move: moveOf(s, run),
    rising: risingOf(run),
    room: run ? roomToLine(s, run.last.value) : null,
    // Multi-series signals list each series instead of one arbitrary headline.
    series: seriesCount(s) > 1 ? latestBySeries(s).slice(0, 3) : null,
  }]
})))
// Grid order: key signals first, then the watch list, then least room to its line.
const SEVERITY = { Red: 0, Amber: 1, Green: 2, 'Not yet tracked': 3 }
const gridList = computed(() => [...signals.value].sort((a, b) =>
  TIER_ORDER[tierOf(a)] - TIER_ORDER[tierOf(b)]
  || (SEVERITY[a.status] ?? 3) - (SEVERITY[b.status] ?? 3)
  || (vis.value.get(a.id).room ?? Infinity) - (vis.value.get(b.id).room ?? Infinity)
  || (b.leadMonths ?? 0) - (a.leadMonths ?? 0)))
const summary = computed(() => {
  const total = signals.value.length
  if (!total) return ''
  const cats = pressureCategories(signals.value)
  const head = `${counts.value.Green} of ${total} signals holding.`
  return cats.length ? `${head} The watch list sits in ${listJoin(cats.slice(0, 3))}.` : `${head} Nothing on the watch list.`
})
const listJoin = a => (a.length < 2 ? a.join('') : `${a.slice(0, -1).join(', ')} and ${a[a.length - 1]}`)
const lastUpdate = computed(() => latestDate(signals.value))

// ── Selection ──────────────────────────────────────────────────
const selectedId = ref(null)
const selected = computed(() => {
  const list = signals.value
  return list.find(s => s.id === selectedId.value)
    // Default: the most upstream charted signal on the watch list, else the most upstream charted one.
    ?? byLead(list.filter(s => (s.status === 'Amber' || s.status === 'Red') && charted(s)))[0]
    ?? byLead(list.filter(charted))[0]
    ?? list[0] ?? null
})
function select(s) { selectedId.value = s.id }
const byLead = list => [...list].sort((a, b) => (b.leadMonths ?? 0) - (a.leadMonths ?? 0))
const charted = s => s.readings.some(r => r.unit !== 'count')

// ── Sizing (charts are laid out in real pixels, not a stretched viewBox) ──
const boardEl = ref(null)
const detailEl = ref(null)
const boardWidth = ref(760)
const detailWidth = ref(420)
const innerWidth = el => {
  const cs = getComputedStyle(el)
  return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
}
let ro = null
const reducedMotion = ref(false)
onMounted(() => {
  reducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ro = new ResizeObserver(() => {
    if (boardEl.value) boardWidth.value = boardEl.value.clientWidth
    if (detailEl.value) detailWidth.value = innerWidth(detailEl.value)
  })
  if (boardEl.value) ro.observe(boardEl.value)
  if (detailEl.value) ro.observe(detailEl.value)
})
onUnmounted(() => { ro?.disconnect(); cancelAnimationFrame(raf) })

// ── Board view: lead time ⇄ arrival in revenue ─────────────────
// Lanes and y stay fixed across views; dots glide along x (CSS transform).
const view = ref('lead')
const compact = computed(() => boardWidth.value < 560)
const board = computed(() => laneLayout(signals.value, {
  width: boardWidth.value, mode: view.value === 'arrival' ? 'arrival' : 'lead', todayIso,
  ...(compact.value
    ? { laneHeight: 64, labelBand: 22, margin: { top: 22, right: 16, bottom: 40, left: 16 } }
    : { margin: { top: 26, right: 24, bottom: 40, left: 168 } }),
}))
const arrivals = computed(() => new Map(signals.value.map(s => [s.id, arrivalDate(s)])))
const watchWindow = computed(() => watchArrivalWindow(signals.value, todayIso))
const unplacedCount = computed(() => signals.value.filter(s => !arrivals.value.get(s.id)).length)

// Play: a "now" line sweeps the arrival axis; each dot lights up (with a
// one-shot pulse) as the sweep reaches the date its reading lands in revenue.
const playing = ref(false)
const sweepIso = ref(null)
let raf = null
let run = 0
function stop() {
  cancelAnimationFrame(raf)
  raf = null
  run++
  playing.value = false
  sweepIso.value = null
}
function setView(v) {
  stop()
  view.value = v
}
function play() {
  const morphing = view.value !== 'arrival'
  stop()
  view.value = 'arrival'
  const { t0, t1 } = board.value.domain
  const T0 = Date.parse(t0), T1 = Date.parse(t1)
  const token = ++run
  const dur = reducedMotion.value ? 0 : 6000
  const startAt = performance.now() + (morphing && !reducedMotion.value ? 900 : 0) // let the morph land first
  playing.value = true
  sweepIso.value = t0
  const step = now => {
    if (token !== run) return
    const p = dur ? Math.min(1, Math.max(0, (now - startAt) / dur)) : 1
    sweepIso.value = new Date(T0 + (T1 - T0) * p).toISOString().slice(0, 10)
    if (p < 1) raf = requestAnimationFrame(step)
    else setTimeout(() => { if (token === run) stop() }, 1600)
  }
  raf = requestAnimationFrame(step)
}
const arrived = d => playing.value && sweepIso.value && (arrivals.value.get(d.signal.id) ?? '9999') <= sweepIso.value
const nowLine = computed(() => {
  if (view.value !== 'arrival' || !board.value.xOfDate) return null
  const iso = sweepIso.value ?? todayIso
  return { x: board.value.xOfDate(iso), label: playing.value ? formatDate(iso, { short: true }) : 'Today' }
})
function dotOpacity(d) {
  if (!isShown(d.signal)) return 0.12
  if (!d.placed) return 0
  if (playing.value && !arrived(d)) return 0.22
  return 1
}

// Hover is shared between the board and the list: pointing at either
// highlights the same signal in both.
const hoverDot = ref(null)
const highlightId = ref(null)
function hoverOn(d) { hoverDot.value = d; highlightId.value = d.signal.id }
function hoverOff() { hoverDot.value = null; highlightId.value = null }

// ── Detail ─────────────────────────────────────────────────────
const detail = computed(() => {
  const s = selected.value
  if (!s) return null
  return {
    s,
    status: statusOf(s.status),
    direction: directionOf(s.direction),
    latest: latestReading(s),
    // Headline only for single-series signals; multi-series ones let the chart speak.
    headline: seriesCount(s) <= 1 ? latestReading(s) : null,
    stale: staleness(s, todayIso),
    ...readingGroups(s),
  }
})
const thresholdText = computed(() => {
  const s = selected.value
  if (!s?.dangerDirection) return ''
  const word = s.dangerDirection === 'Falls below' ? 'below' : 'above'
  const parts = []
  if (s.amberLevel !== null) parts.push(`amber ${word} ${formatValue(s.amberLevel, s.unit)}`)
  if (s.redLevel !== null) parts.push(`red ${word} ${formatValue(s.redLevel, s.unit)}`)
  return parts.length ? `Flags ${parts.join(', ')}` : ''
})

const byLeadThenName = (a, b) => (b.leadMonths ?? 0) - (a.leadMonths ?? 0) || a.label.localeCompare(b.label)
// The list leads with the key signals, then everything else.
const listGroups = computed(() => {
  const key = visible.value.filter(s => tierOf(s) === 'Key').sort(byLeadThenName)
  const rest = visible.value.filter(s => tierOf(s) !== 'Key').sort(byLeadThenName)
  return [{ title: 'Key signals', items: key }, { title: 'Other signals', items: rest }].filter(g => g.items.length)
})
</script>

<template>
  <div class="h-full overflow-y-auto">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-10">

      <!-- ── Header ──────────────────────────────────────────── -->
      <header class="mb-8">
        <p class="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">Research tracker</p>
        <h1 class="text-2xl sm:text-3xl font-medium text-zinc-100 mb-3">AI Complex Signals</h1>
        <p class="text-sm sm:text-[15px] text-zinc-400 leading-relaxed max-w-2xl">
          Lead indicators for the AI buildout (power equipment, memory, leasing, credit and demand),
          placed by roughly how many months each one moves before it shows up in NVIDIA's reported revenue.
        </p>
        <p v-if="lastUpdate" class="mt-3 text-xs text-zinc-500">
          Latest reading {{ formatDate(lastUpdate) }} · synced from Notion
        </p>
      </header>

      <!-- ── States ──────────────────────────────────────────── -->
      <div v-if="pending && !data" class="text-sm text-zinc-500 py-20 text-center">Loading signals…</div>
      <div v-else-if="error" class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p class="text-sm text-zinc-300 mb-1">Signals are unavailable right now.</p>
        <p class="text-xs text-zinc-500">The tracker couldn't be reached. Try again in a few minutes.</p>
      </div>
      <div v-else-if="!signals.length" class="rounded-xl border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <p class="text-sm text-zinc-300">No signals are published yet.</p>
      </div>

      <template v-else>
        <!-- ── Status tiles = filter row ─────────────────────── -->
        <div class="flex flex-wrap items-stretch gap-2.5 mb-3" role="group" aria-label="Filter by status">
          <button
            v-for="(meta, status) in STATUS" :key="status"
            type="button"
            :aria-pressed="statusFilter === status"
            :disabled="!counts[status]"
            class="group flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors disabled:opacity-40 disabled:cursor-default"
            :class="statusFilter === status ? 'border-zinc-500 bg-zinc-800/70' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'"
            @click="toggleFilter(status)">
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
              <path :d="shapePath(meta.shape, 7, 7, 5)" :fill="meta.shape === 'ring' ? 'none' : meta.color"
                :stroke="meta.shape === 'ring' ? meta.color : 'none'" stroke-width="1.5" />
            </svg>
            <span class="text-lg font-semibold text-zinc-100 leading-none">{{ counts[status] }}</span>
            <span class="text-xs text-zinc-400">{{ meta.label }}</span>
          </button>
          <button v-if="statusFilter" type="button" class="text-xs text-zinc-500 hover:text-zinc-200 px-2" @click="statusFilter = null">
            Clear filter
          </button>
        </div>
        <p class="text-sm text-zinc-300 mb-8">{{ summary }}</p>

        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">

          <!-- ── Left: board + list ─────────────────────────── -->
          <div class="lg:col-span-7 space-y-6 min-w-0">
            <section class="rounded-xl border border-zinc-800 bg-[#141417] p-4 sm:p-5">
              <div class="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <h2 class="text-sm font-medium text-zinc-200">{{ { lead: 'Lead-time board', arrival: 'When it reaches revenue', grid: 'Signal grid' }[view] }}</h2>
                  <p class="text-[11px] text-zinc-500">
                    {{ { lead: 'Earlier warning on the left, in reported revenue on the right', arrival: 'Latest reading + estimated lead time', grid: 'Key signals first, then whatever sits closest to its line' }[view] }}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <div class="inline-flex rounded-md border border-zinc-800 p-0.5" role="group" aria-label="Board view">
                    <button type="button" class="px-2.5 py-1 rounded text-[12px] transition-colors"
                      :class="view === 'lead' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'"
                      :aria-pressed="view === 'lead'" @click="setView('lead')">Lead time</button>
                    <button type="button" class="px-2.5 py-1 rounded text-[12px] transition-colors"
                      :class="view === 'arrival' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'"
                      :aria-pressed="view === 'arrival'" @click="setView('arrival')">Arrival</button>
                    <button type="button" class="px-2.5 py-1 rounded text-[12px] transition-colors"
                      :class="view === 'grid' ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'"
                      :aria-pressed="view === 'grid'" @click="setView('grid')">Grid</button>
                  </div>
                  <button v-if="view !== 'grid'" type="button" class="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 hover:border-zinc-500 px-2.5 py-1 text-[12px] text-zinc-200 transition-colors"
                    @click="playing ? stop() : play()">
                    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
                      <path v-if="playing" d="M1 1h8v8H1z" fill="currentColor" />
                      <path v-else d="M2 1l7 4-7 4z" fill="currentColor" />
                    </svg>
                    {{ playing ? 'Stop' : 'Play' }}
                  </button>
                </div>
              </div>

              <!-- ── Grid: one card per signal, key signals double-width ── -->
              <div v-if="view === 'grid'" class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button v-for="s in gridList" :key="s.id" type="button"
                  class="text-left rounded-lg border p-3.5 transition-[opacity,border-color,background-color] duration-300"
                  :class="[
                    vis.get(s.id).tier === 'Key' ? 'sm:col-span-2 p-4' : '',
                    selected?.id === s.id ? 'border-zinc-500 bg-zinc-800/50' : highlightId === s.id ? 'border-zinc-600 bg-zinc-900/60' : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700',
                    isShown(s) ? '' : 'opacity-25',
                  ]"
                  :aria-pressed="selected?.id === s.id"
                  @click="select(s)" @mouseenter="highlightId = s.id" @mouseleave="highlightId = null">
                  <span class="flex items-start gap-2">
                    <svg :width="vis.get(s.id).tier === 'Key' ? 13 : 11" :height="vis.get(s.id).tier === 'Key' ? 13 : 11" viewBox="0 0 14 14" class="mt-[3px] shrink-0" aria-hidden="true">
                      <path :d="shapePath(statusOf(s.status).shape, 7, 7, 5)"
                        :fill="statusOf(s.status).shape === 'ring' ? 'none' : statusOf(s.status).color"
                        :stroke="statusOf(s.status).shape === 'ring' ? statusOf(s.status).color : 'none'" stroke-width="1.5" />
                    </svg>
                    <span class="min-w-0 flex-1 leading-snug"
                      :class="{ Key: 'text-[14px] font-medium text-zinc-100', Standard: 'text-[13px] text-zinc-200', Context: 'text-[12px] text-zinc-400' }[vis.get(s.id).tier]">{{ s.label }}</span>
                    <AppsAiComplexMove :move="vis.get(s.id).move" :rising="vis.get(s.id).rising" :size="vis.get(s.id).tier === 'Key' ? 12 : 10" class="mt-[3px]" />
                  </span>
                  <span class="mt-2 flex items-end gap-4">
                    <span v-if="vis.get(s.id).series" class="min-w-0 flex-1 space-y-0.5">
                      <span v-for="r in vis.get(s.id).series" :key="r.series" class="flex items-baseline justify-between gap-3 text-[12px]">
                        <span class="text-zinc-500 truncate">{{ r.series }}</span>
                        <span class="shrink-0 tabular-nums" :class="vis.get(s.id).tier === 'Key' ? 'text-[15px] font-semibold text-zinc-100' : 'text-zinc-200'">{{ formatValue(r.value, r.unit) }}</span>
                      </span>
                    </span>
                    <span v-else class="min-w-0 flex-1">
                      <!-- numbers get headline size; prose readings stay readable at two lines -->
                      <span class="block text-zinc-100 leading-tight"
                        :class="(latestReading(s)?.display || '').length > 22
                          ? 'text-[13px] text-zinc-300 line-clamp-2'
                          : ['truncate', { Key: 'text-2xl font-semibold', Standard: 'text-base font-medium', Context: 'text-sm text-zinc-300' }[vis.get(s.id).tier]]">
                        {{ latestReading(s)?.display || (latestReading(s) ? formatValue(latestReading(s).value, latestReading(s).unit) : 'No reading yet') }}
                      </span>
                    </span>
                    <span v-if="vis.get(s.id).spark && vis.get(s.id).tier !== 'Context'" class="shrink-0 h-6" :class="vis.get(s.id).tier === 'Key' ? 'w-28' : 'w-16'">
                      <AppsAiComplexSpark :model="vis.get(s.id).spark" :color="statusOf(s.status).color" />
                    </span>
                  </span>
                  <span v-if="vis.get(s.id).gauge" class="block mt-3">
                    <AppsAiComplexGauge :model="vis.get(s.id).gauge" :size="vis.get(s.id).tier === 'Key' ? 'lg' : 'md'" />
                  </span>
                </button>
              </div>

              <div v-show="view !== 'grid'" ref="boardEl" class="relative">
                <svg :width="boardWidth" :height="board.height" class="block" role="group"
                  :aria-label="view === 'lead' ? 'Signals by lead time' : 'Signals by estimated arrival in revenue'">
                  <!-- lanes -->
                  <g v-for="(lane, i) in board.lanes" :key="lane.category">
                    <line v-if="i > 0" :x1="compact ? 0 : 8" :x2="board.plotRight" :y1="lane.top" :y2="lane.top" stroke="#1f1f22" stroke-width="1" />
                    <text v-if="!compact" :x="board.margin.left - 20" :y="lane.y" dy="0.32em" text-anchor="end" class="fill-zinc-400 text-[11px]">{{ lane.category }}</text>
                  </g>

                  <!-- axis: swaps with a fade when the view changes -->
                  <Transition name="ac-fade" mode="out-in">
                    <g :key="view">
                      <template v-for="t in board.ticks" :key="t.value">
                        <line :x1="t.x" :x2="t.x" :y1="board.margin.top" :y2="board.height - board.margin.bottom" stroke="#232326" stroke-width="1" />
                        <text :x="t.x" :y="board.height - board.margin.bottom + 16" text-anchor="middle" class="fill-zinc-500 text-[10px] tabular-nums">{{ t.label }}</text>
                      </template>
                      <text :x="board.plotRight" :y="board.height - 6" text-anchor="end" class="fill-zinc-600 text-[10px]">
                        {{ view === 'lead' ? 'months ahead of NVDA revenue' : 'when the latest reading should show up in NVDA revenue' }}
                      </text>
                    </g>
                  </Transition>

                  <!-- past shading + now line (arrival view) -->
                  <rect v-if="view === 'arrival' && board.xOfDate" :x="board.plotLeft" :y="board.margin.top"
                    :width="Math.max(0, board.xOfDate(todayIso) - board.plotLeft)" :height="board.height - board.margin.top - board.margin.bottom"
                    fill="#ffffff" fill-opacity="0.025" class="pointer-events-none" />
                  <g v-if="nowLine" class="pointer-events-none">
                    <line :x1="nowLine.x" :x2="nowLine.x" :y1="board.margin.top - 4" :y2="board.height - board.margin.bottom" stroke="#a1a1aa" stroke-width="1" />
                    <text :x="nowLine.x" :y="board.margin.top - 9" text-anchor="middle" class="fill-zinc-300 text-[10px] font-medium">{{ nowLine.label }}</text>
                  </g>

                  <!-- narrow screens: lane labels sit above the dots, drawn over the gridlines with a surface halo -->
                  <g v-if="compact" class="pointer-events-none">
                    <text v-for="lane in board.lanes" :key="lane.category" :x="board.margin.left" :y="lane.top + 15"
                      class="fill-zinc-400 text-[11px]" stroke="#141417" stroke-width="4" stroke-linejoin="round" paint-order="stroke">{{ lane.category }}</text>
                  </g>

                  <!-- signal dots: positioned by transform so view changes animate -->
                  <g v-for="d in board.dots" :key="d.signal.id"
                    class="ac-dot focus:outline-none"
                    :class="d.placed && isShown(d.signal) ? 'cursor-pointer' : 'pointer-events-none'"
                    :style="{ transform: `translate(${d.cx}px, ${d.cy}px)`, opacity: dotOpacity(d), transitionDelay: `${d.lane * 22}ms` }"
                    :tabindex="d.placed && isShown(d.signal) ? 0 : -1" role="button"
                    :aria-hidden="!d.placed || !isShown(d.signal)"
                    :aria-label="`${d.signal.label}: ${statusOf(d.signal.status).label}, ${leadLabel(d.signal.leadMonths)}`"
                    :aria-pressed="selected?.id === d.signal.id"
                    @click="select(d.signal)" @keydown.enter.prevent="select(d.signal)" @keydown.space.prevent="select(d.signal)"
                    @pointerenter="hoverOn(d)" @pointerleave="hoverOff" @focus="hoverOn(d)" @blur="hoverOff">
                    <circle :r="Math.max(13, d.r + 6)" fill="transparent" />
                    <circle v-if="selected?.id === d.signal.id" :r="d.r + 5" fill="none" stroke="#e4e4e7" stroke-width="1.5" />
                    <circle v-else-if="highlightId === d.signal.id" :r="d.r + 5" fill="none" stroke="#71717a" stroke-width="1.5" />
                    <!-- key signals wear a soft halo so they read at a glance -->
                    <circle v-if="vis.get(d.signal.id).tier === 'Key'" :r="d.r + 4.5" fill="none" :stroke="statusOf(d.signal.status).color" stroke-opacity="0.35" stroke-width="2.5" />
                    <circle v-if="arrived(d)" :r="d.r" fill="none" :stroke="statusOf(d.signal.status).color" stroke-width="2" class="ac-pulse" />
                    <path
                      :d="shapePath(statusOf(d.signal.status).shape, 0, 0, highlightId === d.signal.id ? d.r + 1 : d.r)"
                      :fill="statusOf(d.signal.status).shape === 'ring' ? '#141417' : statusOf(d.signal.status).color"
                      :stroke="statusOf(d.signal.status).shape === 'ring' ? statusOf(d.signal.status).color : '#141417'"
                      stroke-width="2" :opacity="vis.get(d.signal.id).tier === 'Context' ? 0.7 : 1" />
                  </g>
                </svg>

                <!-- hover tooltip -->
                <div v-if="hoverDot" class="pointer-events-none absolute z-10 max-w-[240px] rounded-md border border-zinc-700 bg-zinc-900/95 px-2.5 py-1.5 shadow-lg"
                  :style="{ left: `${Math.min(hoverDot.cx + 14, boardWidth - 250)}px`, top: `${hoverDot.cy + 10}px` }">
                  <p class="text-[13px] font-medium text-zinc-100 leading-snug">{{ hoverDot.signal.label }}</p>
                  <p class="text-[11px] text-zinc-400">
                    {{ statusOf(hoverDot.signal.status).label }} · {{ directionOf(hoverDot.signal.direction).label }} · {{ leadLabel(hoverDot.signal.leadMonths) }}
                  </p>
                  <p v-if="view === 'arrival' && arrivals.get(hoverDot.signal.id)" class="text-[11px] text-zinc-300">
                    Reaches revenue ~{{ formatDate(arrivals.get(hoverDot.signal.id), { short: true }) }}
                  </p>
                </div>
              </div>

              <!-- one-line key for the wordless marks -->
              <div class="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                <span class="inline-flex items-center gap-1.5"><AppsAiComplexMove move="better" :rising="true" />improving</span>
                <span class="inline-flex items-center gap-1.5"><AppsAiComplexMove move="worse" :rising="true" />worth watching</span>
                <span v-if="view !== 'grid'" class="inline-flex items-center gap-1.5">
                  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="#a1a1aa" stroke-opacity="0.45" stroke-width="2" /><circle cx="9" cy="9" r="4.5" fill="#a1a1aa" /></svg>key signal
                </span>
                <span v-if="view !== 'grid'" class="inline-flex items-center gap-1.5">
                  <svg width="8" height="8" viewBox="0 0 8 8" aria-hidden="true"><circle cx="4" cy="4" r="2.5" fill="#71717a" /></svg>context
                </span>
              </div>

              <p v-if="view === 'arrival'" class="mt-3 text-[12px] text-zinc-400 leading-relaxed">
                <template v-if="watchWindow">
                  Watch-list readings still ahead reach revenue between {{ formatDate(watchWindow.from, { short: true }) }} and {{ formatDate(watchWindow.to, { short: true }) }}.
                </template>
                Dates are the latest reading plus an estimated lead, so treat them as approximate.
                <template v-if="unplacedCount"> {{ unplacedCount }} signals without readings aren't placed.</template>
              </p>
            </section>

            <!-- Signal list: the board's table view -->
            <section class="rounded-xl border border-zinc-800 bg-zinc-900/30">
              <h2 class="px-4 sm:px-5 pt-4 pb-1 text-sm font-medium text-zinc-200">All signals</h2>
              <template v-for="g in listGroups" :key="g.title">
              <p class="px-4 sm:px-5 pt-3 pb-1.5 text-[10px] uppercase tracking-widest"
                :class="g.title === 'Key signals' ? 'text-zinc-300' : 'text-zinc-600'">{{ g.title }}</p>
              <ul class="divide-y divide-zinc-800/80 border-t border-zinc-800/80">
                <li v-for="s in g.items" :key="s.id" @mouseenter="highlightId = s.id" @mouseleave="highlightId = null">
                  <button type="button" class="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors"
                    :class="selected?.id === s.id ? 'bg-zinc-800/60' : highlightId === s.id ? 'bg-zinc-800/30' : 'hover:bg-zinc-800/30'"
                    :aria-pressed="selected?.id === s.id" @click="select(s)">
                    <svg width="12" height="12" viewBox="0 0 14 14" class="shrink-0" aria-hidden="true">
                      <path :d="shapePath(statusOf(s.status).shape, 7, 7, 5)"
                        :fill="statusOf(s.status).shape === 'ring' ? 'none' : statusOf(s.status).color"
                        :stroke="statusOf(s.status).shape === 'ring' ? statusOf(s.status).color : 'none'" stroke-width="1.5" />
                    </svg>
                    <span class="min-w-0 flex-1">
                      <span class="block text-[13px] truncate"
                        :class="{ Key: 'text-zinc-100 font-medium', Standard: 'text-zinc-200', Context: 'text-zinc-400' }[vis.get(s.id).tier]">{{ s.label }}</span>
                      <span class="block text-[11px] text-zinc-500 truncate">
                        {{ s.category }} · {{ statusOf(s.status).label }} · {{ directionOf(s.direction).label }}
                      </span>
                    </span>
                    <span v-if="vis.get(s.id).spark" class="hidden sm:block shrink-0 w-14 h-5">
                      <AppsAiComplexSpark :model="vis.get(s.id).spark" :color="statusOf(s.status).color" />
                    </span>
                    <span class="shrink-0 w-2.5 flex justify-center">
                      <AppsAiComplexMove :move="vis.get(s.id).move" :rising="vis.get(s.id).rising" />
                    </span>
                    <span class="shrink-0 text-right max-w-[9rem]">
                      <span class="block text-[12px] text-zinc-300 tabular-nums truncate">{{ latestReading(s)?.display || '—' }}</span>
                      <span class="block text-[11px] text-zinc-500 tabular-nums">{{ s.leadMonths ?? '?' }} mo lead</span>
                    </span>
                  </button>
                </li>
              </ul>
              </template>
            </section>
          </div>

          <!-- ── Right: detail ──────────────────────────────── -->
          <aside class="lg:col-span-5 min-w-0">
            <div ref="detailEl" class="lg:sticky lg:top-6 rounded-xl border border-zinc-800 bg-[#141417] p-5 sm:p-6">
              <Transition name="ac-fade" mode="out-in">
              <div v-if="detail" :key="detail.s.id">
                <p class="text-[11px] uppercase tracking-widest text-zinc-500 mb-2">{{ detail.s.category }}</p>
                <h2 class="text-lg font-medium text-zinc-100 leading-snug mb-1">{{ detail.s.label }}</h2>
                <p class="text-xs text-zinc-500 mb-4">
                  {{ leadLabel(detail.s.leadMonths) }}<template v-if="detail.s.frequency"> · {{ detail.s.frequency }}</template>
                </p>

                <div class="flex flex-wrap items-center gap-2 mb-5">
                  <span class="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 px-2 py-1 text-xs text-zinc-200">
                    <svg width="11" height="11" viewBox="0 0 14 14" aria-hidden="true">
                      <path :d="shapePath(detail.status.shape, 7, 7, 5)" :fill="detail.status.shape === 'ring' ? 'none' : detail.status.color"
                        :stroke="detail.status.shape === 'ring' ? detail.status.color : 'none'" stroke-width="1.5" />
                    </svg>
                    {{ detail.status.label }}
                  </span>
                  <span class="inline-flex items-center gap-1 rounded-md border border-zinc-800 px-2 py-1 text-xs text-zinc-400">
                    <span aria-hidden="true">{{ detail.direction.glyph }}</span>{{ detail.direction.label }}
                  </span>
                  <span v-if="vis.get(detail.s.id)?.tier === 'Key'" class="inline-flex items-center gap-1.5 rounded-md border border-zinc-600 bg-zinc-800/60 px-2 py-1 text-xs text-zinc-100">
                    <svg width="10" height="10" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="7.5" fill="none" stroke="#a1a1aa" stroke-opacity="0.6" stroke-width="2.5" /><circle cx="9" cy="9" r="4" fill="#e4e4e7" /></svg>
                    Key signal
                  </span>
                  <span v-if="detail.stale.stale" class="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
                    Stale · {{ detail.stale.days }}d since last reading
                  </span>
                </div>

                <div v-if="detail.headline" class="mb-5">
                  <p class="font-semibold text-zinc-100 leading-tight"
                    :class="(detail.headline.display || '').length > 18 ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'">{{ detail.headline.display || formatValue(detail.headline.value, detail.headline.unit) }}</p>
                  <p class="text-xs text-zinc-500 mt-1">{{ detail.headline.series }} · {{ formatDate(detail.headline.date) }}</p>
                </div>
                <p v-else-if="!detail.s.readings.length" class="text-sm text-zinc-500 mb-5">No readings published yet.</p>

                <div v-if="vis.get(detail.s.id)?.gauge" class="mb-6 -mt-1">
                  <div class="flex items-center gap-2 mb-1.5">
                    <AppsAiComplexMove :move="vis.get(detail.s.id).move" :rising="vis.get(detail.s.id).rising" />
                    <span v-if="!detail.headline" class="text-[11px] text-zinc-500">{{ vis.get(detail.s.id).gauge.series }}</span>
                  </div>
                  <AppsAiComplexGauge :model="vis.get(detail.s.id).gauge" size="lg" />
                </div>

                <div class="space-y-6">
                  <AppsAiComplexReadings v-for="g in detail.groups" :key="`${detail.s.id}-${g.unit}`" :group="g" :width="detailWidth" />
                </div>

                <ul v-if="detail.notes.some(n => n !== detail.headline)" class="mt-5 space-y-2">
                  <li v-for="n in detail.notes.filter(n => n !== detail.headline)" :key="n.date + n.series" class="text-[13px] text-zinc-300">
                    {{ n.display }} <span class="text-zinc-500">· {{ formatDate(n.date) }}</span>
                  </li>
                </ul>

                <p v-if="thresholdText" class="mt-5 text-xs text-zinc-500">{{ thresholdText }}.</p>

                <details v-if="detail.s.readings.length" class="mt-5 group">
                  <summary class="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200 select-none">Readings table</summary>
                  <table class="mt-3 w-full text-left text-[12px]">
                    <thead class="text-zinc-500">
                      <tr><th class="font-normal pb-1.5">Date</th><th class="font-normal pb-1.5">Series</th><th class="font-normal pb-1.5 text-right">Value</th></tr>
                    </thead>
                    <tbody class="text-zinc-300">
                      <tr v-for="r in [...detail.s.readings].reverse()" :key="r.date + r.series + r.value" class="border-t border-zinc-800">
                        <td class="py-1.5 pr-2 tabular-nums whitespace-nowrap">{{ formatDate(r.date) }}</td>
                        <td class="py-1.5 pr-2">{{ r.series }}<span v-if="r.guidance" class="text-zinc-500"> (guided)</span></td>
                        <td class="py-1.5 text-right tabular-nums">{{ r.display || formatValue(r.value, r.unit) }}</td>
                      </tr>
                    </tbody>
                  </table>
                </details>

                <p v-if="detail.s.source" class="mt-5 pt-4 border-t border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
                  Source: {{ detail.s.source }}
                </p>
              </div>
              </Transition>
            </div>
          </aside>
        </div>

        <p class="mt-10 text-[11px] text-zinc-600 leading-relaxed max-w-2xl">
          A personal research tracker, updated by hand from public filings, earnings calls and industry data.
          Lead times are approximate. Not investment advice.
        </p>
      </template>

    </div>
  </div>
</template>

<style scoped>
.ac-dot {
  transition: transform 0.9s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.35s ease;
}
.ac-pulse {
  transform-box: fill-box;
  transform-origin: center;
  animation: ac-pulse 0.8s ease-out 1 forwards;
}
@keyframes ac-pulse {
  from { transform: scale(1); opacity: 0.9; }
  to   { transform: scale(3); opacity: 0; }
}
.ac-fade-enter-active,
.ac-fade-leave-active {
  transition: opacity 0.2s ease;
}
.ac-fade-enter-from,
.ac-fade-leave-to {
  opacity: 0;
}
@media (prefers-reduced-motion: reduce) {
  .ac-dot { transition: opacity 0.2s ease; }
  .ac-pulse { animation: none; opacity: 0; }
  .ac-fade-enter-active,
  .ac-fade-leave-active { transition: none; }
}
</style>
