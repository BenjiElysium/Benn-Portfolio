<!-- pages/apps/compound-calculator.vue -->
<script setup>
definePageMeta({ layout: 'app' })
useHead({
  title: 'Compound Interest Calculator — Philip Benn',
  meta: [
    { name: 'description', content: 'Interactive compound interest modeler with volatility simulation, drawable return and spend curves, and named historical scenarios.' },
  ],
})
</script>

<template>
  <div class="h-full">
    <AppsCompoundCalculator />
  </div>
</template>
