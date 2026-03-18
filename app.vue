<script setup>
const route = useRoute()
const isAppRoute = computed(() => route.path.startsWith('/apps/'))
</script>

<template>
  <div v-if="isAppRoute" class="flex flex-col h-screen w-full overflow-hidden text-zinc-200 bg-dark-bg">
    <SiteHeader />
    <div class="flex-1 min-h-0">
      <NuxtPage />
    </div>
  </div>
  <div v-else class="flex flex-col min-h-screen text-zinc-200 bg-dark-bg">
    <SiteHeader />
    <main 
      class="motion-initial mx-auto max-w-7xl px-2 sm:px-6 lg:px-8 grow items-start w-full"
      v-motion
      :initial="{ opacity: 0, y: 50 }"
      :enter="{ opacity: 1, y: 0, transition: { duration: 800, ease: 'easeOut' } }">
      <NuxtPage />
    </main>
    <SiteFooter />
  </div>
</template>
