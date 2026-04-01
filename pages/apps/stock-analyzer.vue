<script setup>
definePageMeta({ layout: 'app' })
useHead({
  title: 'Stock Analyzer — Philip Benn',
  meta: [
    { name: 'description', content: 'NVDA and BX valuation analyzer with live Finnhub prices, P/E projection charts, DCF intrinsic floor, and a personal watchlist.' },
  ],
})
</script>

<template>
  <div class="h-full">
    <AppsStockAnalyzer />
  </div>
</template>
