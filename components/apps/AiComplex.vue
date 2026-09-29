<!-- components/apps/AiComplex.vue -->
<!-- AI Complex signal board. Data: /api/ai-complex/signals (public-safe
     projection of the Notion tracker). Layout math lives in useAiComplex.js;
     this component owns fetch, selection, filter and sizing state. -->
<script setup>
import {
  STATUS, statusOf, directionOf, statusCounts, pressureCategories, latestReading, latestDate,
  staleness, laneLayout, shapePath, readingGroups, formatDate, formatValue, leadLabel, seriesCount,
} from '~/composables/useAiComplex'

const { data, pending, error } = await useFetch('/api/ai-complex/signals')

const signals = computed(() => data.value?.signals ?? [])
const todayIso = new Date().toISOString().slice(0, 10)

// ── Status filter (tiles double as the filter row) ─────────────
const statusFilter = ref(null)
const visible = computed(() =>
  statusFilter.value ? signals.value.filter(s => s.status === statusFilter.value) : signals.value)
function toggleFilter(status) {
  statusFilter.value = statusFilter.value === status ? null : status
}

const counts = computed(() => statusCounts(signals.value))
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
let ro = null
onMounted(() => {
  ro = new ResizeObserver(() => {
    if (boardEl.value) boardWidth.value = boardEl.value.clientWidth
    if (detailEl.value) detailWidth.value = detailEl.value.clientWidth
  })
  if (boardEl.value) ro.observe(boardEl.value)
  if (detailEl.value) ro.observe(detailEl.value)
})
onUnmounted(() => ro?.disconnect())

const compact = computed(() => boardWidth.value < 560)
const board = computed(() => laneLayout(visible.value, compact.value
  ? { width: boardWidth.value, laneHeight: 64, labelBand: 22, margin: { top: 4, right: 16, bottom: 40, left: 16 } }
  : { width: boardWidth.value }))

const hoverDot = ref(null)

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

const sortedList = computed(() =>
  [...visible.value].sort((a, b) => (b.leadMonths ?? 0) - (a.leadMonths ?? 0) || a.label.localeCompare(b.label)))
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
              <div class="flex items-baseline justify-between mb-3 gap-4">
                <h2 class="text-sm font-medium text-zinc-200">Lead-time board</h2>
                <p class="text-[11px] text-zinc-500 hidden sm:block">Earlier warning ← → in reported revenue</p>
              </div>

              <div ref="boardEl" class="relative">
                <svg :width="boardWidth" :height="board.height" class="block" role="group" aria-label="Signals by lead time">
                  <!-- vertical gridlines at lead ticks -->
                  <g>
                    <template v-for="t in board.ticks" :key="t.value">
                      <line :x1="t.x" :x2="t.x" :y1="board.margin.top" :y2="board.height - board.margin.bottom" stroke="#232326" stroke-width="1" />
                      <text :x="t.x" :y="board.height - board.margin.bottom + 16" text-anchor="middle" class="fill-zinc-500 text-[10px] tabular-nums">
                        {{ t.value === 0 ? '0' : `${t.value}` }}
                      </text>
                    </template>
                    <text :x="board.plotRight" :y="board.height - 6" text-anchor="end" class="fill-zinc-600 text-[10px]">
                      months ahead of NVDA revenue
                    </text>
                  </g>

                  <!-- lanes -->
                  <g v-for="(lane, i) in board.lanes" :key="lane.category">
                    <line v-if="i > 0" :x1="compact ? 0 : 8" :x2="board.plotRight" :y1="lane.top" :y2="lane.top" stroke="#1f1f22" stroke-width="1" />
                    <text v-if="compact" :x="board.margin.left" :y="lane.top + 15" class="fill-zinc-400 text-[11px]">{{ lane.category }}</text>
                    <text v-else :x="board.margin.left - 20" :y="lane.y" dy="0.32em" text-anchor="end" class="fill-zinc-400 text-[11px]">{{ lane.category }}</text>
                  </g>

                  <!-- signal dots -->
                  <g v-for="d in board.dots" :key="d.signal.id"
                    tabindex="0" role="button" class="cursor-pointer focus:outline-none"
                    :aria-label="`${d.signal.label}: ${statusOf(d.signal.status).label}, ${leadLabel(d.signal.leadMonths)}`"
                    :aria-pressed="selected?.id === d.signal.id"
                    @click="select(d.signal)" @keydown.enter.prevent="select(d.signal)" @keydown.space.prevent="select(d.signal)"
                    @pointerenter="hoverDot = d" @pointerleave="hoverDot = null" @focus="hoverDot = d" @blur="hoverDot = null">
                    <circle :cx="d.cx" :cy="d.cy" r="13" fill="transparent" />
                    <circle v-if="selected?.id === d.signal.id" :cx="d.cx" :cy="d.cy" r="11" fill="none" stroke="#e4e4e7" stroke-width="1.5" />
                    <path
                      :d="shapePath(statusOf(d.signal.status).shape, d.cx, d.cy, hoverDot === d ? 7 : 6)"
                      :fill="statusOf(d.signal.status).shape === 'ring' ? '#141417' : statusOf(d.signal.status).color"
                      :stroke="statusOf(d.signal.status).shape === 'ring' ? statusOf(d.signal.status).color : '#141417'"
                      stroke-width="2" />
                  </g>
                </svg>

                <!-- hover tooltip -->
                <div v-if="hoverDot" class="pointer-events-none absolute z-10 max-w-[240px] rounded-md border border-zinc-700 bg-zinc-900/95 px-2.5 py-1.5 shadow-lg"
                  :style="{ left: `${Math.min(hoverDot.cx + 14, boardWidth - 250)}px`, top: `${hoverDot.cy + 10}px` }">
                  <p class="text-[13px] font-medium text-zinc-100 leading-snug">{{ hoverDot.signal.label }}</p>
                  <p class="text-[11px] text-zinc-400">
                    {{ statusOf(hoverDot.signal.status).label }} · {{ directionOf(hoverDot.signal.direction).label }} · {{ leadLabel(hoverDot.signal.leadMonths) }}
                  </p>
                </div>
              </div>
            </section>

            <!-- Signal list: the board's table view -->
            <section class="rounded-xl border border-zinc-800 bg-zinc-900/30">
              <h2 class="px-4 sm:px-5 pt-4 pb-2 text-sm font-medium text-zinc-200">All signals</h2>
              <ul class="divide-y divide-zinc-800/80">
                <li v-for="s in sortedList" :key="s.id">
                  <button type="button" class="w-full flex items-center gap-3 px-4 sm:px-5 py-3 text-left transition-colors"
                    :class="selected?.id === s.id ? 'bg-zinc-800/60' : 'hover:bg-zinc-800/30'"
                    :aria-pressed="selected?.id === s.id" @click="select(s)">
                    <svg width="12" height="12" viewBox="0 0 14 14" class="shrink-0" aria-hidden="true">
                      <path :d="shapePath(statusOf(s.status).shape, 7, 7, 5)"
                        :fill="statusOf(s.status).shape === 'ring' ? 'none' : statusOf(s.status).color"
                        :stroke="statusOf(s.status).shape === 'ring' ? statusOf(s.status).color : 'none'" stroke-width="1.5" />
                    </svg>
                    <span class="min-w-0 flex-1">
                      <span class="block text-[13px] text-zinc-200 truncate">{{ s.label }}</span>
                      <span class="block text-[11px] text-zinc-500 truncate">
                        {{ s.category }} · {{ statusOf(s.status).label }} · {{ directionOf(s.direction).label }}
                      </span>
                    </span>
                    <span class="shrink-0 text-right">
                      <span class="block text-[12px] text-zinc-300 tabular-nums">{{ latestReading(s)?.display || '—' }}</span>
                      <span class="block text-[11px] text-zinc-500 tabular-nums">{{ s.leadMonths ?? '?' }} mo lead</span>
                    </span>
                  </button>
                </li>
              </ul>
            </section>
          </div>

          <!-- ── Right: detail ──────────────────────────────── -->
          <aside class="lg:col-span-5 min-w-0">
            <div class="lg:sticky lg:top-6 rounded-xl border border-zinc-800 bg-[#141417] p-5 sm:p-6">
              <template v-if="detail">
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

                <div ref="detailEl" class="space-y-6">
                  <AppsAiComplexReadings v-for="g in detail.groups" :key="g.unit" :group="g" :width="detailWidth" />
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
              </template>
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
