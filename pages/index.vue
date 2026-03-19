<script setup>
import YouTubeEmbed from '~/components/YouTubeEmbed.vue';

const cgiAssets = [
  { tag: 'philipbenn-render', mediaType: 'image' },
];

const genAiAssets = [
  { folder: 'Brand-Spec-LeLabo', mediaType: 'image' },
  { folder: 'Brand-Spec-Calm', mediaType: 'image' },
  { folder: 'Midjourney-2025', mediaType: 'image' },
  { folder: 'Fluxion', mediaType: 'image' },
];

// Sort options for LP scrolls: 'random' | 'newest' | 'oldest' | 'name'
const lpCgiSortBy = 'newest';
const lpGenAiSortBy = 'newest';

useSeoMeta({
  title: 'Philip Benn — Creative Technologist & Generative AI Developer',
  description: 'Creative Technologist with a decade of experience in 3D production, generative AI workflows, and full-stack development. Clients include Logitech, Nvidia, Apple, and Google.',
  ogTitle: 'Philip Benn — Creative Technologist & Generative AI Developer',
  ogDescription: 'Creative Technologist with a decade of experience in 3D production, generative AI workflows, and full-stack development.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

const featuredVideo = {
  id: 'z0e1Sf_8_vw',
  title: 'Synthemo Creative — Brand Spec'
};

const services = [
  {
    title: 'Generative AI Workflows',
    description: 'Custom pipelines using Flux, Veo, NanoBanana, and ComfyUI. Rapid prototyping to premium motion delivery.',
    icon: `<path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>`,
  },
  {
    title: '3D Product Visualization',
    description: 'Photorealistic renders and animations for marketing, packaging, and e-commerce. Cinema4D, Maya, Nuke.',
    icon: `<rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>`,
  },
  {
    title: 'Motion & Brand Film',
    description: 'Cinematic brand content and motion design. From concept and storyboard through final delivery.',
    icon: `<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>`,
  },
  {
    title: 'AI Tool Development',
    description: 'Full-stack creative tools with Python, FastAPI, Next.js, and Supabase. Custom interfaces for AI workflows.',
    icon: `<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>`,
  },
  {
    title: 'Creative Direction',
    description: 'Art direction from concept through final delivery. Cross-functional coordination across design, engineering, and production.',
    icon: `<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>`,
  },
];

const clients = [
  { name: 'Logitech', note: '' },
  { name: 'Nvidia', note: '' },
  { name: 'Apple', note: '*' },
  { name: 'Google', note: '*' },
  { name: 'California College of Art', note: '' },
];

// ── Parallax scroll ─────────────────────────────────────────────
// Viewport-centre formula: offset = 0 when element is centred in viewport,
// builds up as it scrolls toward/away from centre. Each section has a
// slightly different factor so they move at distinct depths.
const scrollY        = ref(0);
const credibilityRef = ref(null);
let rafId = null;
let prefersReducedMotion = false;

const onParallaxScroll = () => {
  if (rafId) return;
  rafId = requestAnimationFrame(() => {
    scrollY.value = window.scrollY;
    rafId = null;
  });
};

onMounted(() => {
  prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReducedMotion) {
    window.addEventListener('scroll', onParallaxScroll, { passive: true });
  }
});
onUnmounted(() => {
  window.removeEventListener('scroll', onParallaxScroll);
  if (rafId) cancelAnimationFrame(rafId);
});

// Shared helper — clamped viewport-centre parallax
const vpParallax = (el, factor, max = 28) => {
  if (prefersReducedMotion || !el || process.server) return {};
  const rect = el.getBoundingClientRect();
  const raw  = ((rect.top + rect.height / 2) - window.innerHeight / 2) * factor;
  return { transform: `translateY(${Math.max(-max, Math.min(max, raw)).toFixed(1)}px)` };
};

// Headshot: simple scroll offset (starts above fold, very subtle trail)
const headshotParallax = computed(() => {
  if (prefersReducedMotion) return {};
  return { transform: `translateY(${(scrollY.value * 0.02).toFixed(1)}px)` };
});

// Credibility bar only — vertical parallax (the float effect)
const credibilityParallax = computed(() => { scrollY.value; return vpParallax(credibilityRef.value, 0.14, 24); });

// Card convergence — pure horizontal: left/right cards slide from edges,
// centre drops straight in. No y offset so there's no competing vertical motion.
// Blur alternates high/low for layered depth.
const cardInitial = (index, xMax = 44) => ({
  opacity: 0,
  x: [-xMax, 0, xMax][index % 3],
  filter: `blur(${index % 2 === 0 ? 32 : 8}px)`,
});
const cardVisible = (delay = 0) => ({
  opacity: 1, x: 0, filter: 'blur(0px)',
  transition: { delay, duration: 700, ease: 'easeOut' },
});
</script>

<template>
  <div class="max-w-7xl mx-auto px-6">

    <!-- ── Hero ─────────────────────────────────────────────── -->
    <section class="relative z-10 min-h-screen pt-32 pb-16 flex flex-col justify-center">
      <div class="flex flex-col md:flex-row gap-10 md:gap-16 items-start md:items-center">

        <!-- Left: copy -->
        <div class="flex-1 min-w-0">
          <h1
            v-motion
            :initial="{ opacity: 0, y: 30, filter: 'blur(10px)' }"
            :enter="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 200, duration: 900, ease: 'easeOut' } }"
            class="motion-initial text-4xl sm:text-5xl font-medium leading-tight mb-4 text-gradient">
            Creative Technologist
          </h1>
          <h2
            v-motion
            :initial="{ opacity: 0, y: 20, filter: 'blur(6px)' }"
            :enter="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { delay: 350, duration: 800 } }"
            class="motion-initial text-xl sm:text-2xl font-light text-zinc-400 mb-6">
            Generative AI Developer &amp; Designer
          </h2>
          <p
            v-motion
            :initial="{ opacity: 0 }"
            :enter="{ opacity: 1, transition: { delay: 500, duration: 700 } }"
            class="motion-initial text-lg text-zinc-300 leading-relaxed mb-8 max-w-xl">
            Creative Technologist with over a decade of experience in 3D production for product rendering and animation, now building at the intersection of generative AI tools and visual content pipelines. Teaches generative AI and motion design at California College of Art.
          </p>

          <!-- CTAs -->
          <div
            v-motion
            :initial="{ opacity: 0, y: 10 }"
            :enter="{ opacity: 1, y: 0, transition: { delay: 650, duration: 600 } }"
            class="motion-initial flex flex-wrap gap-4">
            <NuxtLink
              to="/projects"
              class="px-6 py-3 bg-white text-zinc-900 text-sm font-semibold rounded-md hover:bg-zinc-100 transition-colors">
              View My Work
            </NuxtLink>
            <NuxtLink
              to="/contact"
              class="px-6 py-3 border border-zinc-700 text-zinc-200 text-sm font-semibold rounded-md hover:border-zinc-500 hover:text-white transition-colors">
              Let's Talk
            </NuxtLink>
          </div>
        </div>

        <!-- Right: headshot — outer div carries parallax, inner carries entrance animation -->
        <div :style="headshotParallax" class="shrink-0">
          <div
            v-motion
            :initial="{ opacity: 0, scale: 0.94, x: 30 }"
            :enter="{ opacity: 1, scale: 1, x: 0, transition: { delay: 400, duration: 900, ease: 'easeOut' } }"
            class="motion-initial w-52 sm:w-60 md:w-64 lg:w-72">
            <img
              src="~/assets/images/Philip_Headshot1-web.jpg"
              alt="Philip Benn"
              class="w-full object-cover object-top rounded-lg aspect-[3/4]" />
          </div>
        </div>
      </div>
    </section>

    <!-- ── Credibility bar ───────────────────────────────────── -->
    <!-- Floats above hero + services: -mt pulls it up into hero's empty bottom space,
         z-20 layers it above both neighbours, shadow + bg-zinc-900 sell the elevation -->
    <div ref="credibilityRef" class="relative z-20 -mt-2 mb-24">
      <div :style="credibilityParallax">
        <section
          v-motion
          :initial="{ opacity: 0, y: 16, filter: 'blur(6px)' }"
          :visible="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 700 } }"
          class="motion-initial bg-zinc-900/10 border-t border-b border-zinc-700/50 py-8
                 shadow-[0_16px_60px_rgba(0,0,0,0.85),0_-8px_40px_rgba(0,0,0,0.5)]">
          <p class="text-xs text-zinc-600 uppercase tracking-widest mb-4 text-center">Work delivered for</p>
          <div class="flex flex-wrap justify-center items-center gap-x-8 gap-y-2">
            <span
              v-for="client in clients"
              :key="client.name"
              class="text-zinc-500 text-sm font-medium">
              {{ client.name }}<sup v-if="client.note" class="text-zinc-700 ml-0.5">{{ client.note }}</sup>
            </span>
          </div>
          <p class="text-xs text-zinc-700 text-center mt-3">* via Schawk &amp; XYZ Studios</p>
        </section>
      </div>
    </div>

    <!-- ── Services ──────────────────────────────────────────── -->
    <section class="mb-24">
      <h2
        v-motion
        :initial="{ opacity: 0, y: 28, filter: 'blur(6px)' }"
        :visible="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 700, ease: 'easeOut' } }"
        class="motion-initial text-2xl font-semibold text-zinc-100 mb-10">
        What I Do
      </h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div
          v-for="(service, index) in services"
          :key="service.title"
          v-motion
          :initial="cardInitial(index)"
          :visible="cardVisible(index * 80)"
          class="motion-initial border border-zinc-800 rounded-lg p-5 hover:border-zinc-600 transition-colors duration-300">
          <div class="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none"
              stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"
              v-html="service.icon" class="inline-block" />
          </div>
          <h3 class="text-base font-semibold text-zinc-100 mb-2">{{ service.title }}</h3>
          <p class="text-sm text-zinc-500 leading-relaxed">{{ service.description }}</p>
        </div>
      </div>
    </section>

    <!-- ── Portfolio CGI ─────────────────────────────────────── -->
    <PortfolioImageScroll
      :media-assets="cgiAssets"
      :sort-by="lpCgiSortBy"
      title="Client CGI &amp; Product Renders"
      link-href="/portfolio-CGI"
      link-label="View portfolio"
      :max-images="14"
    />

    <!-- ── Portfolio GenAI ───────────────────────────────────── -->
    <PortfolioImageScroll
      :media-assets="genAiAssets"
      :sort-by="lpGenAiSortBy"
      title="Generative AI — Image Diffusion"
      link-href="/portfolio-GenAI"
      link-label="View portfolio"
      :max-images="14"
    />

    <!-- ── Synthemo video showcase ───────────────────────────── -->
    <section
      v-motion
      :initial="{ opacity: 0, y: 36, filter: 'blur(10px)' }"
      :visible="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 750, ease: 'easeOut' } }"
      class="motion-initial mb-24">
      <div class="flex justify-between items-end mb-8">
        <div>
          <h2 class="text-2xl font-semibold text-zinc-100">Synthemo Creative</h2>
          <p class="text-sm text-zinc-500 mt-1">Brand Spec + Creative Lab for Generative AI</p>
        </div>
        <NuxtLink
          to="/portfolio-Motion/synthemo-creative"
          class="text-sm text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1 shrink-0">
          Full collection
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
          </svg>
        </NuxtLink>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div class="lg:col-span-3">
          <YouTubeEmbed :video-id="featuredVideo.id" :title="featuredVideo.title" />
        </div>

        <div class="lg:col-span-2 border border-zinc-800 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <h3 class="text-base font-semibold text-zinc-100 mb-3">Brand Spec Cinematic Prototypes</h3>
            <p class="text-sm text-zinc-500 leading-relaxed mb-5">
              Cinematic prototypes and visual systems built with frontier ML models. Each Brand Spec explores brand identity through generative AI motion design — custom pipelines, disciplined craft.
            </p>
            <div class="space-y-2 text-sm text-zinc-600">
              <div>5 Brand Spec films</div>
              <div>Flux · Veo · NanoBanana · ComfyUI</div>
            </div>
          </div>
          <div class="flex gap-5 mt-6">
            <a href="https://www.youtube.com/@synthemo_creative" target="_blank"
              class="text-sm text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
              </svg>
              YouTube
            </a>
            <a href="https://www.instagram.com/synthemo_creative/" target="_blank"
              class="text-sm text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
              </svg>
              Instagram
            </a>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Areas of Expertise ────────────────────────────────── -->
    <section class="mb-24">
      <h2
        v-motion
        :initial="{ opacity: 0, y: 28, filter: 'blur(6px)' }"
        :visible="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 700, ease: 'easeOut' } }"
        class="motion-initial text-2xl font-semibold text-zinc-100 mb-8">
        Areas of Expertise
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          v-motion
          :initial="cardInitial(0, 44)"
          :visible="cardVisible(0)"
          class="motion-initial border border-zinc-800 rounded-lg p-5">
          <h3 class="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">3D Production &amp; Rendering</h3>
          <p class="text-sm text-zinc-500 leading-relaxed">Adobe Creative Suite · Cinema4D · Maya · Rhino · Nuke · Redshift · Vray · Unreal Engine</p>
        </div>
        <div
          v-motion
          :initial="cardInitial(1, 44)"
          :visible="cardVisible(100)"
          class="motion-initial border border-zinc-800 rounded-lg p-5">
          <h3 class="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Generative AI</h3>
          <p class="text-sm text-zinc-500 leading-relaxed">Agentic Coding · Google Flow (Veo &amp; NanoBanana) · Flux · Firefly · Kling · Midjourney · Stable Diffusion · ComfyUI</p>
        </div>
        <div
          v-motion
          :initial="cardInitial(2, 44)"
          :visible="cardVisible(200)"
          class="motion-initial border border-zinc-800 rounded-lg p-5">
          <h3 class="text-sm font-semibold text-zinc-300 mb-3 uppercase tracking-wider">Web Development</h3>
          <p class="text-sm text-zinc-500 leading-relaxed">Next.js · TypeScript · Supabase · Vercel · Python · FastAPI · Cursor · Claude Code</p>
        </div>
      </div>
    </section>

  </div>
</template>
