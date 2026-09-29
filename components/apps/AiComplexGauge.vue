<!-- components/apps/AiComplexGauge.vue -->
<!-- Threshold gauge: the signal's own green / amber / red zones, a faint tick
     for the prior reading, and a needle for the latest that glides in from
     the prior on mount. Laid out in percentages, so it fits any width. -->
<script setup>
import { formatValue } from '~/composables/useAiComplex'

const props = defineProps({
  model: { type: Object, required: true },
  size: { type: String, default: 'md' },  // 'md' | 'lg'
})
const tint = { green: 'bg-[#0ca30c]/30', amber: 'bg-[#fab219]/35', red: 'bg-[#d03b3b]/35' }
const trail = computed(() => {
  const { now, prev, move } = props.model
  if (prev === null || move === 'flat') return null
  return { left: Math.min(now, prev), width: Math.abs(now - prev), color: move === 'better' ? '#22c55e' : '#fab219' }
})
const label = computed(() => {
  const m = props.model
  const zone = m.zones.find(z => m.now >= z.left && m.now <= z.left + z.width)?.tone ?? ''
  return `${m.series}: ${formatValue(m.last.value, m.last.unit)}, in the ${zone} zone`
    + (m.prior ? `, previously ${formatValue(m.prior.value, m.prior.unit)}` : '')
})
</script>

<template>
  <div class="relative w-full" :class="size === 'lg' ? 'h-5' : 'h-4'" role="img" :aria-label="label">
    <!-- zones -->
    <div class="absolute inset-x-0 rounded-full overflow-hidden" :class="size === 'lg' ? 'top-[7px] h-1.5' : 'top-[6px] h-1'">
      <div v-for="z in model.zones" :key="z.tone" class="absolute inset-y-0" :class="tint[z.tone]"
        :style="{ left: `${z.left}%`, width: `${z.width}%` }" />
    </div>
    <!-- move trail, prior tick -->
    <div v-if="trail" class="absolute h-0.5 rounded-full" :class="size === 'lg' ? 'top-[9px]' : 'top-[7px]'"
      :style="{ left: `${trail.left}%`, width: `${trail.width}%`, background: trail.color }" />
    <div v-if="model.prev !== null" class="absolute top-[3px] w-px bg-zinc-500" :class="size === 'lg' ? 'h-3.5' : 'h-2.5'"
      :style="{ left: `${model.prev}%` }" />
    <!-- needle -->
    <div class="ac-needle absolute top-0 -ml-px w-0.5 rounded-full bg-zinc-100" :class="size === 'lg' ? 'h-5' : 'h-4'"
      :style="{ left: `${model.now}%`, '--prev-left': `${model.prev ?? model.now}%` }" />
  </div>
</template>

<style scoped>
.ac-needle { animation: ac-needle 0.9s cubic-bezier(0.33, 1, 0.68, 1); }
@keyframes ac-needle { from { left: var(--prev-left); } }
@media (prefers-reduced-motion: reduce) { .ac-needle { animation: none; } }
</style>
