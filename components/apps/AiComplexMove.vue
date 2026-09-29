<!-- components/apps/AiComplexMove.vue -->
<!-- Wordless "latest move" mark. The arrow points the way the value moved;
     its color says whether that move is good for the signal: green when
     improving, amber when worth watching. Shape carries direction, color
     carries meaning, and the label carries both for screen readers. -->
<script setup>
const props = defineProps({
  move: { type: String, default: null },     // 'better' | 'worse' | 'flat' | null
  rising: { type: Boolean, default: null },  // raw direction of the last change
  size: { type: Number, default: 10 },
})
const color = computed(() => ({ better: '#22c55e', worse: '#fab219' })[props.move] ?? '#71717a')
const label = computed(() => ({
  better: 'Latest move: improving',
  worse: 'Latest move: worth watching',
  flat: 'Latest move: little change',
})[props.move] ?? '')
</script>

<template>
  <svg v-if="move" :width="size" :height="size" viewBox="0 0 10 10" role="img" :aria-label="label" class="shrink-0">
    <title>{{ label }}</title>
    <rect v-if="move === 'flat'" x="1.5" y="4.25" width="7" height="1.5" rx="0.75" :fill="color" />
    <path v-else-if="rising" d="M5 1.5 L9 8 H1 Z" :fill="color" />
    <path v-else d="M5 8.5 L9 2 H1 Z" :fill="color" />
  </svg>
</template>
