<!-- components/apps/AiComplexReadings.vue -->
<!-- One readings chart for a single unit: a line per series, the signal's
     amber/red thresholds as reference lines, guided (future-dated) points
     hollow on a dashed leg. Hovering or focusing a point shows its value. -->
<script setup>
import { readingChartModel, formatValue, formatDate, unitSuffix } from '~/composables/useAiComplex'

const props = defineProps({
  group: { type: Object, required: true },
  width: { type: Number, default: 360 },
})

// All readings on one date → no time axis to draw. Several series compare as
// bars (one hue — the bars differ by magnitude, not identity); one reading is
// just a stat line.
const points = computed(() => props.group.series.flatMap(s => s.points.map(p => ({ ...p, series: s.name }))))
const singleDate = computed(() => new Set(points.value.map(p => p.date)).size === 1)
const barMax = computed(() => Math.max(...points.value.map(p => Math.abs(p.value))))

const model = computed(() => readingChartModel(props.group, { width: props.width }))
const hover = ref(null) // { p, series }

const unitLabel = computed(() => unitSuffix(props.group.unit) || 'value')
</script>

<template>
  <!-- single reading: stat line -->
  <div v-if="singleDate && points.length === 1" class="flex items-baseline justify-between gap-3 border-t border-zinc-800 pt-3">
    <span class="text-[12px] text-zinc-400">{{ points[0].series }}<template v-if="points[0].guidance"> · guided</template></span>
    <span class="text-right">
      <span class="block text-[13px] font-medium text-zinc-200">{{ points[0].display || formatValue(points[0].value, group.unit) }}</span>
      <span class="block text-[11px] text-zinc-500">{{ formatDate(points[0].date) }}</span>
    </span>
  </div>

  <!-- several series, one date: bar comparison -->
  <figure v-else-if="singleDate">
    <figcaption class="flex items-baseline justify-between mb-2.5">
      <span class="text-[10px] uppercase tracking-widest text-zinc-500">{{ unitLabel }}</span>
      <span class="text-[11px] text-zinc-500">{{ formatDate(points[0].date) }}</span>
    </figcaption>
    <ul class="space-y-2">
      <li v-for="p in [...points].sort((a, b) => b.value - a.value)" :key="p.series" class="grid grid-cols-[minmax(0,7rem)_1fr] items-center gap-3">
        <span class="text-[12px] text-zinc-400 truncate">{{ p.series }}</span>
        <span class="flex items-center gap-2 min-w-0">
          <span class="h-2.5 rounded-r bg-[#3987e5]" :style="{ width: `${Math.max(2, (Math.abs(p.value) / barMax) * 78)}%` }" />
          <span class="text-[12px] font-medium text-zinc-200 tabular-nums whitespace-nowrap">{{ formatValue(p.value, group.unit) }}</span>
        </span>
      </li>
    </ul>
  </figure>

  <figure v-else class="relative">
    <figcaption class="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
      <span class="text-[10px] uppercase tracking-widest text-zinc-500">{{ unitLabel }}</span>
      <!-- Legend: always present for ≥ 2 series, line keys to mirror the marks -->
      <template v-if="group.series.length > 1">
        <span v-for="s in group.series" :key="s.name" class="inline-flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span class="inline-block w-3 h-0.5 rounded-full" :style="{ background: s.color }" />{{ s.name }}
        </span>
      </template>
      <span v-else class="text-[11px] text-zinc-400">{{ group.series[0].name }}</span>
    </figcaption>

    <svg :width="model.width" :height="model.height" class="block overflow-visible" role="img"
      :aria-label="`${group.series.map(s => s.name).join(', ')} readings`">
      <!-- y grid + ticks -->
      <g>
        <template v-for="t in model.yTicks" :key="t.v">
          <line :x1="model.plotLeft" :x2="model.plotRight" :y1="t.y" :y2="t.y" stroke="#27272a" stroke-width="1" />
          <text :x="model.plotLeft - 8" :y="t.y" dy="0.32em" text-anchor="end" class="fill-zinc-500 text-[10px] tabular-nums">
            {{ formatValue(t.v, group.unit) }}
          </text>
        </template>
      </g>

      <!-- x ticks -->
      <text v-for="(t, i) in model.xTicks" :key="t.d" :x="t.x" :y="model.plotBottom + 16"
        :text-anchor="model.xTicks.length === 1 ? 'middle' : i === 0 ? 'start' : i === model.xTicks.length - 1 ? 'end' : 'middle'"
        class="fill-zinc-500 text-[10px]">{{ formatDate(t.d, { short: true }) }}</text>

      <!-- thresholds -->
      <g v-for="t in model.thresholds" :key="t.level">
        <line :x1="model.plotLeft" :x2="model.plotRight" :y1="t.y" :y2="t.y" :stroke="t.color" stroke-width="1" stroke-dasharray="4 3" opacity="0.8" />
        <text :x="model.plotRight + 6" :y="t.y" dy="0.32em" class="fill-zinc-400 text-[10px]">
          {{ t.level }} {{ formatValue(t.value, group.unit) }}
        </text>
      </g>

      <!-- series -->
      <g v-for="s in model.series" :key="s.name">
        <path v-if="s.line" :d="s.line" fill="none" :stroke="s.color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        <path v-if="s.guideLine" :d="s.guideLine" fill="none" :stroke="s.color" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.7" />
        <g v-for="p in s.pts" :key="p.date + p.value"
          tabindex="0" class="cursor-default focus:outline-none"
          :aria-label="`${s.name}, ${formatDate(p.date)}: ${p.display || formatValue(p.value, group.unit)}${p.guidance ? ' (guided)' : ''}`"
          @pointerenter="hover = { p, series: s }" @pointerleave="hover = null"
          @focus="hover = { p, series: s }" @blur="hover = null">
          <circle :cx="p.cx" :cy="p.cy" r="12" fill="transparent" />
          <circle :cx="p.cx" :cy="p.cy" :r="hover?.p === p ? 5.5 : 4.5"
            :fill="p.guidance ? '#141417' : s.color" :stroke="p.guidance ? s.color : '#141417'" stroke-width="2" />
        </g>
        <!-- endpoint label only -->
        <text :x="s.end.cx + 9" :y="s.end.cy" dy="0.32em" class="fill-zinc-300 text-[11px] font-medium tabular-nums"
          v-if="!hover && model.thresholds.every(t => Math.abs(t.y - s.end.cy) > 10)">
          {{ formatValue(s.end.value, group.unit) }}
        </text>
      </g>
    </svg>

    <!-- tooltip: value leads, label follows -->
    <div v-if="hover" class="pointer-events-none absolute z-10 rounded-md border border-zinc-700 bg-zinc-900/95 px-2.5 py-1.5 shadow-lg"
      :style="{ left: `${Math.min(hover.p.cx + 12, width - 170)}px`, top: `${hover.p.cy + 8}px` }">
      <p class="text-[13px] font-semibold text-zinc-100">{{ hover.p.display || formatValue(hover.p.value, group.unit) }}</p>
      <p class="flex items-center gap-1.5 text-[11px] text-zinc-400">
        <span class="inline-block w-2.5 h-0.5 rounded-full" :style="{ background: hover.series.color }" />
        {{ hover.series.name }} · {{ formatDate(hover.p.date) }}<template v-if="hover.p.guidance"> · guided</template>
      </p>
    </div>
  </figure>
</template>
