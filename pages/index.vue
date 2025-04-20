<script setup>
const { data: posts } = await useAsyncData('latest-posts', () =>
  queryContent('/blog')
    .sort({ data: 1 })
    .limit(3)
    .find()
)
</script>

<template>
  <section 
    v-motion
    :initial="{ opacity: 0, y: 30 }"
    :enter="{ opacity: 1, y: 0, transition: { duration: 800 } }">
    <h1 class="text-6xl font-bold mt-24 text-gradient">Hello, I'm Philip Benn</h1>
    <p class="text-lg text-zinc-300 p-2 italic">Software Developer · Designer · Generative AI Architect</p>
  </section>
  
  <section class="flex flex-col md:flex-row mt-8 gap-12 items-center">
    <div 
      class="md:w-3/5"
      v-motion
      :initial="{ opacity: 0, x: -50 }"
      :enter="{ opacity: 1, x: 0, transition: { delay: 300, duration: 1000, ease: 'easeOut' } }">
      <h2 class="text-3xl font-bold mb-6 text-blue-300">Background</h2>
      <div class="space-y-4 text-zinc-200">
        <p class="text-lg leading-relaxed">
          I'm a developer and designer with a background in 3D production, design technology, and generative AI systems. My career spans NYC, LA, and now the Bay Area—where I design interactive tools and immersive experiences blending design, code, and machine learning. I hold an MFA in Design Technology and bring a deep passion for computer graphics, speculative design, and future-forward tech.
        </p>
        <h2 class="text-3xl font-bold mb-6 text-blue-300">Core Projects</h2>
        <p class="text-lg leading-relaxed">
          I'm the creator of Fluxion, a node-based image generation platform built with Next.js, Supabase, and Replicate, as part of the <a href="https://synthemo.com" target="_blank" rel="noopener noreferrer" class="text-blue-400 hover:text-blue-300 underline">Synthemo</a> ecosystem. The platform empowers visual creators to generate AI art through a node-based UI, leveraging the advanced diffusion models Flux and Photon, with LLM-powered prompt enhancement and fine-grained control over model parameters.
        </p>
        <p class="text-lg leading-relaxed">
          Other ongoing projects include Elysium 2084, an AI-driven narrative game that merges interactive fiction with avatar-based worldbuilding, and Hopeflo, a civic-focused platform that combines a positive news aggregator with tools for community-driven action. Designed to surface hopeful narratives and foster engagement across personal, local, and creative spheres.
        </p>
        <p class="text-lg leading-relaxed">
          In parallel, I work as a 3D designer for clients like XYZ, focusing on product visualization, animation, and creative direction across digital campaigns and immersive media.
        </p>
      </div>
    </div>
    
    <div 
      class="md:w-2/5 p-4"
      v-motion
      :initial="{ opacity: 0, scale: 0.9, x: 50 }"
      :enter="{ opacity: 1, scale: 1, x: 0, transition: { delay: 500, duration: 1000, ease: 'easeOut' } }">
      <div class="relative">
        <div class="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/20 blur-lg"></div>
        <img src="~/assets/images/Philip-Gradient1.jpg" class="relative object-cover rounded-lg shadow-xl" />
      </div>
    </div>
  </section>

  <!-- Featured Projects Section -->
  <section 
    class="mt-16"
    v-motion
    :initial="{ opacity: 0, y: 50 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: 600, duration: 1000 } }">
    <div class="flex justify-between items-center mb-8">
      <h2 class="text-3xl font-bold text-blue-300">Featured Projects</h2>
      <a 
        href="/projects" 
        class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
      >
        View All Projects
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
          <polyline points="12 5 19 12 12 19"></polyline>
        </svg>
      </a>
    </div>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
      <!-- Project Card: Synthemo/Fluxion -->
      <div 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 700, duration: 600 } }"
        class="bg-zinc-800/50 rounded-xl overflow-hidden shadow-xl border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
      >
        <div class="relative h-48">
          <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1745176223/SynthemoLP/Fluxion-April2025_ovrimh.png" alt="Synthemo Fluxion" class="w-full h-full object-cover">
          <div class="absolute top-0 right-0 bg-blue-600/90 py-1 px-3 text-xs font-medium text-white rounded-bl-lg">
            Node-based AI
          </div>
        </div>
        <div class="p-6">
          <h3 class="text-xl font-bold mb-2 text-white">Synthemo - Fluxion</h3>
          <p class="text-zinc-300 mb-4">A node-based image generation platform built with Next.js, Supabase, and Replicate. Empowers visual creators to generate AI art through a modular UI.</p>
          
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Next.js</span>
            <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Supabase</span>
            <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Diffusion Models</span>
          </div>
          
          <div class="flex justify-start">
            <a 
              href="https://synthemo.com" 
              target="_blank" 
              class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
            >
              Visit Project
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </div>
      
      <!-- Project Card: Elysium 2084 -->
      <div 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 800, duration: 600 } }"
        class="bg-zinc-800/50 rounded-xl overflow-hidden shadow-xl border border-zinc-700/50 hover:border-blue-500/30 transition-all duration-300 hover:shadow-blue-900/10 hover:shadow-xl"
      >
        <div class="relative h-48">
          <img src="https://res.cloudinary.com/doj03xgr2/image/upload/v1697726328/Elysium2084WebApp/Elysium_5_rprhj6.jpg" alt="Elysium 2084" class="w-full h-full object-cover">
          <div class="absolute top-0 right-0 bg-indigo-600/90 py-1 px-3 text-xs font-medium text-white rounded-bl-lg">
            AI Narrative Game
          </div>
        </div>
        <div class="p-6">
          <h3 class="text-xl font-bold mb-2 text-white">Elysium 2084</h3>
          <p class="text-zinc-300 mb-4">An AI-driven narrative game that merges interactive fiction with avatar-based worldbuilding in a cyberpunk universe with branching storylines.</p>
          
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">Python/FastAPI</span>
            <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">OpenAI API</span>
            <span class="text-xs bg-blue-500/20 text-blue-300 py-1 px-2 rounded-full">LangChain</span>
          </div>
          
          <div class="flex justify-start">
            <a 
              href="https://elysium2084.wl.r.appspot.com/" 
              target="_blank" 
              class="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 text-sm"
            >
              Visit Project
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Blog Posts Section -->
  <section 
    class="mb-20 mt-16"
    v-motion
    :initial="{ opacity: 0, y: 50 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: 900, duration: 1000 } }">
    <h2 class="text-3xl font-bold mb-8 text-blue-300">Latest Blog Posts</h2>
    <div class="grid md:grid-cols-3 gap-10">
      <Post :posts="posts" />
    </div>
  </section>
</template>

<style>
.text-gradient {
  background: linear-gradient(90deg, #8B5CF6, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-fill-color: transparent;
}
</style>
