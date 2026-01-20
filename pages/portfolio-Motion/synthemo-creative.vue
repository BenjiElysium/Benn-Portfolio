<script setup>
import YouTubeEmbed from '~/components/YouTubeEmbed.vue';

// All 5 Brand Spec videos from Synthemo Creative YouTube playlist
const brandSpecVideos = [
  { 
    id: 'z0e1Sf_8_vw', 
    title: 'Brand Spec 01',
    description: 'Cinematic prototype exploring brand identity through generative AI motion design.'
  },
  { 
    id: 'pXRkS8Us2GA', 
    title: 'Brand Spec 02',
    description: 'Visual system study combining traditional craft aesthetics with AI-driven animation.'
  },
  { 
    id: 'V5zsNyGktUA', 
    title: 'Brand Spec 03',
    description: 'Process study demonstrating modern GenAI workflow integration.'
  },
  { 
    id: 'd4D5FY7ddgo', 
    title: 'Brand Spec 04',
    description: 'Experimental brand animation pushing the boundaries of AI-assisted motion design.'
  },
  { 
    id: 'iySqpWrkkiM', 
    title: 'Brand Spec 05',
    description: 'Latest exploration in the Brand Spec series featuring advanced visual systems.'
  },
];
</script>

<template>
  <div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 1000 } }"
    class="pt-28 mb-20 max-w-7xl mx-auto px-6">
    
    <!-- Back Navigation -->
    <NuxtLink 
      to="/portfolio-Motion"
      v-motion
      :initial="{ opacity: 0, x: -20 }"
      :enter="{ opacity: 1, x: 0, transition: { delay: 200, duration: 500 } }"
      class="inline-flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-8"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="19" y1="12" x2="5" y2="12"></line>
        <polyline points="12 19 5 12 12 5"></polyline>
      </svg>
      Back to Motion Portfolio
    </NuxtLink>

    <!-- Hero Header -->
    <header 
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 300, duration: 800 } }"
      class="text-center mb-16">
      
      <!-- Logo / Brand Mark -->
      <div class="mb-6">
        <h1 class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 text-transparent bg-clip-text">
          SYNTHEMO
        </h1>
        <p class="text-2xl text-zinc-300 tracking-widest mt-2">CREATIVE</p>
      </div>
      
      <!-- Tagline -->
      <p 
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 500, duration: 700 } }"
        class="text-xl text-zinc-300 max-w-2xl mx-auto mb-6">
        Brand Spec + Creative Lab for Generative AI
      </p>
      
      <!-- Description -->
      <p 
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 600, duration: 700 } }"
        class="text-zinc-400 max-w-3xl mx-auto leading-relaxed">
        Cinematic prototypes, craft process studies, and visual systems—built with modern GenAI workflows.
        Created by Philip Benn.
      </p>
    </header>

    <!-- Social & Contact Links -->
    <div 
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 700, duration: 600 } }"
      class="flex flex-wrap justify-center items-center gap-6 mb-16">
      
      <a 
        href="https://www.youtube.com/@synthemo_creative" 
        target="_blank"
        class="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-red-600/20 border border-zinc-700/50 hover:border-red-500/50 rounded-lg text-zinc-300 hover:text-red-400 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
        </svg>
        YouTube Channel
      </a>
      
      <a 
        href="https://www.instagram.com/synthemo_creative/" 
        target="_blank"
        class="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-pink-600/20 border border-zinc-700/50 hover:border-pink-500/50 rounded-lg text-zinc-300 hover:text-pink-400 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
        @Synthemo_Creative
      </a>
      
      <a 
        href="https://synthemo.com" 
        target="_blank"
        class="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 hover:bg-blue-600/20 border border-zinc-700/50 hover:border-blue-500/50 rounded-lg text-zinc-300 hover:text-blue-400 transition-all"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
        synthemo.com
      </a>
    </div>

    <!-- Brand Spec Videos Section -->
    <section>
      <h2 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 800, duration: 600 } }"
        class="text-2xl font-bold text-purple-300 mb-8">
        Brand Spec Collection
      </h2>
      
      <div class="space-y-12">
        <article 
          v-for="(video, index) in brandSpecVideos" 
          :key="video.id"
          v-motion
          :initial="{ opacity: 0, y: 30 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 900 + (index * 150), duration: 700 } }"
          class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start"
        >
          <!-- Video Embed -->
          <div class="lg:col-span-2">
            <YouTubeEmbed 
              :video-id="video.id" 
              :title="video.title"
            />
          </div>
          
          <!-- Video Info -->
          <div class="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6">
            <h3 class="text-xl font-bold text-white mb-3">{{ video.title }}</h3>
            <p class="text-zinc-400 leading-relaxed mb-4">{{ video.description }}</p>
            <div class="flex flex-wrap gap-2">
              <span class="text-xs bg-purple-500/20 text-purple-300 py-1 px-2 rounded-full">GenAI</span>
              <span class="text-xs bg-purple-500/20 text-purple-300 py-1 px-2 rounded-full">Motion Design</span>
              <span class="text-xs bg-purple-500/20 text-purple-300 py-1 px-2 rounded-full">Brand Spec</span>
            </div>
          </div>
        </article>
      </div>
    </section>

    <!-- Contact Section -->
    <section 
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 1500, duration: 700 } }"
      class="mt-20 text-center">
      
      <div class="bg-gradient-to-br from-purple-900/30 via-zinc-800/50 to-blue-900/30 border border-zinc-700/50 rounded-2xl p-10">
        <h2 class="text-2xl font-bold text-white mb-4">Interested in Collaboration?</h2>
        <p class="text-zinc-300 mb-6 max-w-xl mx-auto">
          Open for collabs, creative direction, and commissions. 
          Let&apos;s explore what&apos;s possible with generative AI and motion design.
        </p>
        <a 
          href="mailto:philipaldenbenn@gmail.com"
          class="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
          philipaldenbenn@gmail.com
        </a>
      </div>
    </section>
  </div>
</template>
