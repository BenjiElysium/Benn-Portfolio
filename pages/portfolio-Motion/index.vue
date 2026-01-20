<script setup>
import YouTubeEmbed from '~/components/YouTubeEmbed.vue';

// Synthemo Creative Brand Spec videos from YouTube playlist
const brandSpecVideos = [
  { id: 'z0e1Sf_8_vw', title: 'Brand Spec 01' },
  { id: 'pXRkS8Us2GA', title: 'Brand Spec 02' },
  { id: 'V5zsNyGktUA', title: 'Brand Spec 03' },
  { id: 'd4D5FY7ddgo', title: 'Brand Spec 04' },
  { id: 'iySqpWrkkiM', title: 'Brand Spec 05' },
];

// Existing Apple Demo ID videos (Cloudinary)
const appleVideos = [
  { id: 1, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706162014/Portfolio-Videos/Demo-IDs-Apple-Ovid2_qhdsly.mp4', title: 'Apple Demo - Ovid' },
  { id: 2, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706125825/Portfolio-Videos/Demo-IDs-Apple-Hithia_llmohz.mp4', title: 'Apple Demo - Hithia' },
  { id: 3, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706029335/Portfolio-Videos/Demo-IDs-Apple-Ocean_ifga85.mp4', title: 'Apple Demo - Ocean' },
  { id: 4, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706036446/Portfolio-Videos/Demo-IDs-Apple-IceShelves_tbh3q0.mp4', title: 'Apple Demo - Ice Shelves' },
];
</script>

<template>
  <div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 1000 } }"
    class="pt-28 mb-20 max-w-7xl mx-auto px-6">
    
    <!-- Page Header -->
    <h1 
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
      class="text-4xl font-bold mb-6 text-center">
      <span class="bg-gradient-to-r from-purple-500 via-blue-600 to-blue-400 text-transparent bg-clip-text inline-block">
        Portfolio: Motion
      </span>
    </h1>
    <p 
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="text-lg text-zinc-300 max-w-3xl mx-auto text-center mb-16">
      GenAI motion design, cinematic prototypes, and visual systems.
    </p>

    <!-- Synthemo Creative Section -->
    <section 
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 500, duration: 800 } }"
      class="mb-20">
      
      <!-- Section Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400">
            Synthemo Creative
          </h2>
          <p class="text-zinc-400 mt-2">Brand Spec + Creative Lab for Generative AI</p>
        </div>
        <div class="flex items-center gap-4">
          <a 
            href="https://www.youtube.com/@synthemo_creative" 
            target="_blank"
            class="flex items-center gap-2 text-sm text-zinc-300 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
            YouTube
          </a>
          <a 
            href="https://www.instagram.com/synthemo_creative/" 
            target="_blank"
            class="flex items-center gap-2 text-sm text-zinc-300 hover:text-pink-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            Instagram
          </a>
          <NuxtLink 
            to="/portfolio-Motion/synthemo-creative" 
            class="px-4 py-2 bg-purple-600/80 hover:bg-purple-500/80 text-white text-sm rounded-lg transition-colors"
          >
            View Full Collection
          </NuxtLink>
        </div>
      </div>

      <!-- Brand Description -->
      <div 
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 600, duration: 700 } }"
        class="bg-zinc-800/30 border border-zinc-700/50 rounded-xl p-6 mb-8">
        <p class="text-zinc-300 leading-relaxed">
          Cinematic prototypes, craft process studies, and visual systems built with modern GenAI workflows. 
          Each Brand Spec explores the intersection of brand identity and generative AI motion design, 
          pushing the boundaries of what&apos;s possible with contemporary AI tools.
        </p>
      </div>

      <!-- Brand Spec Video Horizontal Scroll -->
      <div class="relative">
        <!-- Scrollable container -->
        <div 
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { delay: 700, duration: 600 } }"
          class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin"
        >
          <div 
            v-for="(video, index) in brandSpecVideos" 
            :key="video.id"
            v-motion
            :initial="{ opacity: 0, x: 30 }"
            :enter="{ opacity: 1, x: 0, transition: { delay: 700 + (index * 100), duration: 600 } }"
            class="flex-shrink-0 w-[320px] md:w-[400px] snap-start"
          >
            <YouTubeEmbed 
              :video-id="video.id" 
              :title="video.title"
            />
            <p class="text-zinc-400 text-sm mt-2 text-center">{{ video.title }}</p>
          </div>
        </div>
        
        <!-- Scroll indicator -->
        <div 
          v-motion
          :initial="{ opacity: 0 }"
          :enter="{ opacity: 1, transition: { delay: 1200, duration: 600 } }"
          class="flex items-center justify-center gap-2 mt-4 text-zinc-500 text-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="15 18 9 12 15 6"></polyline>
          </svg>
          <span>Scroll to see all 5 videos</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </div>
      </div>
    </section>

    <!-- Divider -->
    <div class="border-t border-zinc-700/50 my-12"></div>

    <!-- Apple Demo IDs Section -->
    <section 
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 800, duration: 800 } }">
      
      <div class="mb-8">
        <h2 class="text-2xl font-bold text-blue-300 mb-2">GenAI Demo IDs: Apple Logo</h2>
        <p class="text-zinc-400">Experimental logo animations using generative AI techniques.</p>
      </div>

      <div class="grid sm:grid-cols-2 grid-cols-1 gap-6">
        <div 
          v-for="(video, index) in appleVideos" 
          :key="video.id" 
          v-motion
          :initial="{ opacity: 0, y: 20 }"
          :enter="{ opacity: 1, y: 0, transition: { delay: 900 + (index * 100), duration: 600 } }"
          class="rounded-lg overflow-hidden bg-zinc-800/30 border border-zinc-700/50"
        >
          <video controls class="w-full h-auto">
            <source :src="video.src" type="video/mp4">
            Your browser does not support the video tag.
          </video>
          <p class="text-zinc-400 text-sm p-3">{{ video.title }}</p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
/* Custom scrollbar styling */
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(139, 92, 246, 0.5) transparent;
}

.scrollbar-thin::-webkit-scrollbar {
  height: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: rgba(63, 63, 70, 0.3);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background: rgba(139, 92, 246, 0.5);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background: rgba(139, 92, 246, 0.7);
}
</style>
