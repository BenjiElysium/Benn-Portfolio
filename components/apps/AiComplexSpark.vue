<!-- components/apps/AiComplexSpark.vue -->
<!-- Tiny trend line for a signal's focus series; the end dot wears the
     signal's status color. Stretches to its box without distorting strokes. -->
<script setup>
defineProps({
  model: { type: Object, required: true },  // sparkModel(): { d, end: [x%, y] }
  color: { type: String, default: '#a1a1aa' },
})
</script>

<template>
  <span class="relative block w-full h-full" aria-hidden="true">
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" class="absolute inset-0 w-full h-full overflow-visible">
      <path :d="model.d" fill="none" stroke="#71717a" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
    </svg>
    <span class="absolute w-1.5 h-1.5 -ml-[3px] -mt-[3px] rounded-full"
      :style="{ left: `${model.end[0]}%`, top: `${(model.end[1] / 24) * 100}%`, background: color }" />
  </span>
</template>
