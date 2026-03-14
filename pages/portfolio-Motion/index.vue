<script setup>
import YouTubeEmbed from '~/components/YouTubeEmbed.vue';

useSeoMeta({
  title: 'Motion Portfolio — Philip Benn',
  description: 'GenAI motion design, cinematic prototypes, and visual systems by Philip Benn. Featuring Synthemo Creative brand spec films and experimental logo animations.',
  ogTitle: 'Motion Portfolio — Philip Benn',
  ogDescription: 'GenAI motion design, cinematic prototypes, and visual systems by Philip Benn.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

// Synthemo Creative Brand Spec videos
const brandSpecVideos = [
  { id: 'z0e1Sf_8_vw', title: 'Brand Spec 01' },
  { id: 'pXRkS8Us2GA', title: 'Brand Spec 02' },
  { id: 'V5zsNyGktUA', title: 'Brand Spec 03' },
  { id: 'd4D5FY7ddgo', title: 'Brand Spec 04' },
  { id: 'iySqpWrkkiM', title: 'Brand Spec 05' },
];

// Synthemo Labs — Northline / OP Personas
const northlineVideos = [
  {
    id: 'qJkfeqn0mJA',
    subject: 'Mira — OP07',
    pattern: 'Delight Pattern',
    series: 'Northline / OP Personas',
    format: 'Interview excerpts (intro)',
  },
  {
    id: 'WHq6AdgN_YY',
    subject: 'Mercer — OP08',
    pattern: 'Examiner Pattern',
    series: 'Northline / OP Personas',
    format: 'Interview excerpts (intro)',
  },
  {
    id: 'wpyFYgmwvLk',
    subject: 'Caelix — OP11',
    pattern: '',
    series: 'Northline / OP Personas',
    format: 'Interview excerpt (intro)',
  },
];

// Apple Demo ID videos (Cloudinary)
const appleVideos = [
  { id: 1, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706162014/Portfolio-Videos/Demo-IDs-Apple-Ovid2_qhdsly.mp4', title: 'Apple Demo - Ovid' },
  { id: 2, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706125825/Portfolio-Videos/Demo-IDs-Apple-Hithia_llmohz.mp4', title: 'Apple Demo - Hithia' },
  { id: 3, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706029335/Portfolio-Videos/Demo-IDs-Apple-Ocean_ifga85.mp4', title: 'Apple Demo - Ocean' },
  { id: 4, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706036446/Portfolio-Videos/Demo-IDs-Apple-IceShelves_tbh3q0.mp4', title: 'Apple Demo - Ice Shelves' },
];

// Toggle state
const labsOpen  = ref(false);
const appleOpen = ref(false);
</script>

<template>
  <div
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 1000 } }"
    class="motion-initial pt-28 mb-20 max-w-7xl mx-auto px-6">

    <!-- Page Header -->
    <h1
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
      class="motion-initial text-4xl sm:text-5xl font-medium leading-tight mb-4 text-gradient text-center">
      Portfolio: Motion
    </h1>
    <p
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="motion-initial text-lg text-zinc-500 max-w-3xl mx-auto text-center mb-16">
      GenAI motion design, cinematic prototypes, and visual systems.
    </p>

    <!-- ── Synthemo Creative — Brand Spec ──────────────────────── -->
    <section
      v-motion
      :initial="{ opacity: 0, y: 30 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 500, duration: 800 } }"
      class="motion-initial mb-20">

      <!-- Section Header -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h2 class="text-2xl font-medium text-zinc-100">Synthemo Creative</h2>
          <p class="text-zinc-500 text-sm mt-1">Brand Spec + Creative Lab for Generative AI</p>
        </div>
        <div class="flex items-center gap-4">
          <a
            href="https://www.youtube.com/@synthemo_creative"
            target="_blank"
            class="flex items-center gap-2 text-sm text-zinc-400 hover:text-red-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
            YouTube
          </a>
          <a
            href="https://www.instagram.com/synthemo_creative/"
            target="_blank"
            class="flex items-center gap-2 text-sm text-zinc-400 hover:text-pink-400 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            Instagram
          </a>
          <NuxtLink
            to="/portfolio-Motion/synthemo-creative"
            class="px-4 py-2 border border-zinc-700 text-zinc-300 text-sm rounded-md hover:border-zinc-500 hover:text-white transition-colors"
          >
            Full Collection
          </NuxtLink>
        </div>
      </div>

      <!-- Brand Spec Horizontal Scroll -->
      <div class="relative">
        <div class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
          <div
            v-for="(video, index) in brandSpecVideos"
            :key="video.id"
            class="flex-shrink-0 w-[320px] md:w-[400px] snap-start"
          >
            <YouTubeEmbed :video-id="video.id" :title="video.title" />
            <p class="text-zinc-500 text-xs mt-2 text-center">{{ video.title }}</p>
          </div>
        </div>
        <div class="flex items-center justify-center gap-2 mt-3 text-zinc-600 text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          <span>Scroll to see all 5</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </div>
      </div>
    </section>

    <!-- Divider -->
    <div class="border-t border-zinc-800 my-10"></div>

    <!-- ── Synthemo Labs — Northline / OP Personas ─────────────── -->
    <section class="mb-6">

      <!-- Toggle header -->
      <button
        @click="labsOpen = !labsOpen"
        class="w-full flex items-center justify-between py-4 text-left group"
      >
        <div>
          <h2 class="text-2xl font-medium text-zinc-100 group-hover:text-white transition-colors">Synthemo Labs</h2>
          <p class="text-zinc-500 text-sm mt-1">Northline / OP Personas — Series</p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          :class="['text-zinc-500 transition-transform duration-300', labsOpen ? 'rotate-180' : '']"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Collapsible content -->
      <Transition
        enter-active-class="transition-all ease-out duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="labsOpen" class="mt-4 mb-10">
          <div class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
            <div
              v-for="video in northlineVideos"
              :key="video.id"
              class="flex-shrink-0 w-[320px] md:w-[420px] snap-start"
            >
              <YouTubeEmbed :video-id="video.id" :title="video.subject" />
              <!-- Caption -->
              <div class="mt-3 px-1">
                <p class="text-zinc-100 text-sm font-medium">{{ video.subject }}</p>
                <p v-if="video.pattern" class="text-indigo-400 text-xs font-medium tracking-wide mt-0.5">{{ video.pattern }}</p>
                <p class="text-zinc-500 text-xs mt-1">{{ video.series }}</p>
                <p class="text-zinc-600 text-xs mt-0.5 italic">{{ video.format }}</p>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </section>

    <!-- Divider -->
    <div class="border-t border-zinc-800 my-2"></div>

    <!-- ── GenAI Demo IDs: Apple Logo ──────────────────────────── -->
    <section class="mb-6">

      <!-- Toggle header -->
      <button
        @click="appleOpen = !appleOpen"
        class="w-full flex items-center justify-between py-4 text-left group"
      >
        <div>
          <h2 class="text-2xl font-medium text-zinc-100 group-hover:text-white transition-colors">GenAI Demo IDs: Apple Logo</h2>
          <p class="text-zinc-500 text-sm mt-1">Experimental logo animations using generative AI techniques.</p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
          :class="['text-zinc-500 transition-transform duration-300', appleOpen ? 'rotate-180' : '']"
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>

      <!-- Collapsible content -->
      <Transition
        enter-active-class="transition-all ease-out duration-300"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all ease-in duration-200"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div v-if="appleOpen" class="mt-4 mb-10">
          <div class="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin">
            <div
              v-for="video in appleVideos"
              :key="video.id"
              class="flex-shrink-0 w-[320px] md:w-[400px] snap-start rounded-lg overflow-hidden bg-zinc-800/30 border border-zinc-700/50"
            >
              <video controls class="w-full h-auto">
                <source :src="video.src" type="video/mp4">
                Your browser does not support the video tag.
              </video>
              <p class="text-zinc-500 text-xs p-3">{{ video.title }}</p>
            </div>
          </div>
        </div>
      </Transition>
    </section>

  </div>
</template>

<style scoped>
.scrollbar-thin {
  scrollbar-width: thin;
  scrollbar-color: rgba(99, 102, 241, 0.4) transparent;
}
.scrollbar-thin::-webkit-scrollbar { height: 4px; }
.scrollbar-thin::-webkit-scrollbar-track { background: rgba(63, 63, 70, 0.2); border-radius: 2px; }
.scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.4); border-radius: 2px; }
.scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.65); }
</style>
