<!-- pages/apps/index.vue -->
<script setup>
definePageMeta({ layout: 'app' })
useHead({ title: 'Apps — Philip Benn', description: 'Interactive tools and calculators.' })

const tools = [
  {
    slug: 'stock-analyzer',
    name: 'Stock Analyzer',
    desc: 'NVDA and BX valuation tool with live Finnhub prices, P/E and P/DE projection charts, DCF intrinsic floor calculator, and a personal watchlist.',
    tags: ['Finance', 'Live Data', 'Valuation'],
    accent: '#22c55e',
  },
  {
    slug: 'compound-calculator',
    name: 'Compound Interest Calculator',
    desc: 'Model long-term portfolio growth with volatility simulation, drawable return and spend curves, and historical scenario overlays.',
    tags: ['Finance', 'Interactive', 'Simulation'],
    accent: '#6366F1',
  },
  {
    slug: 'fluxion',
    name: 'Fluxion',
    desc: 'Node-based image generation platform giving artists direct control over diffusion workflows. Built on Next.js, Supabase, and Replicate.',
    tags: ['AI Tool', 'Next.js', 'Supabase'],
    accent: '#A855F7',
    href: 'https://app.synthemo.com',
    external: true,
  },
  {
    slug: 'elysium-system',
    name: 'Elysium System',
    desc: 'AI-driven narrative game with LLM-powered story generation and avatar-based worldbuilding. Python, FastAPI, OpenAI, LangChain.',
    tags: ['AI Game', 'Python', 'FastAPI'],
    accent: '#0EA5E9',
    href: 'https://elysium2084.wl.r.appspot.com/',
    external: true,
  },
  {
    slug: 'hopeflo',
    name: 'Hopeflo',
    desc: 'Civic platform combining AI-curated positive news with tools for community-driven action. Countering doom-scroll fatigue.',
    tags: ['Civic Tech', 'Next.js', 'Supabase'],
    accent: '#10B981',
    href: 'https://hopeflo.org',
    external: true,
  },
  {
    slug: 'novelspace',
    name: 'NovelSpace.tech',
    desc: 'Creative platform for AI-enhanced story-worlds and experimental digital media. Fusing code, story, and visual design.',
    tags: ['Creative Platform', 'Next.js', 'Cloudinary'],
    accent: '#F59E0B',
    href: 'https://novelspace-website-novel-space-team.vercel.app/',
    external: true,
  },
  {
    slug: 'synthemo',
    name: 'Synthemo Creative',
    desc: 'Creative studio producing cinematic brand content with generative AI pipelines. Flux, Veo, NanoBanana, ComfyUI.',
    tags: ['Brand Film', 'GenAI', 'Studio'],
    accent: '#6366F1',
    href: 'https://synthemo.com',
    external: true,
  },
]
</script>

<template>
  <div class="max-w-5xl mx-auto px-6 py-16">

    <div class="mb-12">
      <h1 class="text-3xl font-medium text-zinc-100 mb-3">Apps</h1>
      <p class="text-zinc-400 text-base leading-relaxed max-xl">
        Interactive tools I've built for exploration and use. Each one is a working instrument, not a demo — built on Python, FastAPI, Next.js, Supabase, and more.
        </p>
    </div>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      <template v-for="tool in tools" :key="tool.slug">
        <NuxtLink
          v-if="!tool.external"
          :to="`/apps/${tool.slug}`"
          class="group block bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 rounded-xl p-5 transition-all duration-200"
        >
          <div class="h-0.5 w-8 rounded-full mb-4 transition-all duration-300 group-hover:w-14"
               :style="{ background: tool.accent }" />
          <h2 class="text-base font-medium text-zinc-100 mb-2 leading-snug">{{ tool.name }}</h2>
          <p class="text-[13px] text-zinc-500 leading-relaxed mb-4">{{ tool.desc }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in tool.tags" :key="tag"
              class="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700/60">{{ tag }}</span>
          </div>
        </NuxtLink>
        <a
          v-else
          :href="tool.href"
          target="_blank"
          rel="noopener noreferrer"
          class="group block bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800/60 hover:border-zinc-700 rounded-xl p-5 transition-all duration-200"
        >
          <div class="h-0.5 w-8 rounded-full mb-4 transition-all duration-300 group-hover:w-14"
               :style="{ background: tool.accent }" />
          <h2 class="text-base font-medium text-zinc-100 mb-2 leading-snug">{{ tool.name }}</h2>
          <p class="text-[13px] text-zinc-500 leading-relaxed mb-4">{{ tool.desc }}</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="tag in tool.tags" :key="tag"
              class="text-[11px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700/60">{{ tag }}</span>
          </div>
        </a>
      </template>

      <!-- Placeholder slot for coming soon -->
      <div class="block bg-zinc-900/20 border border-zinc-800/30 border-dashed rounded-xl p-5">
        <div class="h-0.5 w-8 rounded-full mb-4 bg-zinc-800" />
        <p class="text-[13px] text-zinc-600">More tools coming</p>
      </div>
    </div>

  </div>
</template>
