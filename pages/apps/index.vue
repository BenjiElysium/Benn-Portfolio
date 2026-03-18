<!-- pages/apps/index.vue -->
<script setup>
definePageMeta({ layout: 'app' })
useHead({ title: 'Apps — Philip Benn', description: 'Interactive tools and calculators.' })

const tools = [
  {
    slug: 'compound-calculator',
    name: 'Compound Interest Calculator',
    desc: 'Model long-term portfolio growth with volatility simulation, drawable return and spend curves, and historical scenario overlays.',
    tags: ['Finance', 'Interactive', 'Simulation'],
    accent: '#6366F1',
  },
  // Add future tools here
]
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-16">

    <div class="mb-12">
      <h1 class="text-3xl font-medium text-zinc-100 mb-3">Apps</h1>
      <p class="text-zinc-400 text-base leading-relaxed max-xl">
        Interactive tools built for exploration. Each one is a working instrument, not a demo.
      </p>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <NuxtLink
        v-for="tool in tools"
        :key="tool.slug"
        :to="`/apps/${tool.slug}`"
        class="group block bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 rounded-xl p-5 transition-all duration-200"
      >
        <!-- Accent bar -->
        <div class="h-0.5 w-8 rounded-full mb-4 transition-all duration-300 group-hover:w-14"
             :style="{ background: tool.accent }" />

        <h2 class="text-base font-medium text-zinc-100 mb-2 leading-snug">{{ tool.name }}</h2>
        <p class="text-[13px] text-zinc-500 leading-relaxed mb-4">{{ tool.desc }}</p>

        <div class="flex flex-wrap gap-1.5">
          <span
            v-for="tag in tool.tags" :key="tag"
            class="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700/60"
          >{{ tag }}</span>
        </div>
      </NuxtLink>

      <!-- Placeholder slot for coming soon -->
      <div class="block bg-zinc-900/20 border border-zinc-800/30 border-dashed rounded-xl p-5">
        <div class="h-0.5 w-8 rounded-full mb-4 bg-zinc-800" />
        <p class="text-[13px] text-zinc-600">More tools coming</p>
      </div>
    </div>

  </div>
</template>
