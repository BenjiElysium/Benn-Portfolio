<template>
  <div class="flex flex-col min-h-screen text-zinc-200 bg-dark-bg">
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
