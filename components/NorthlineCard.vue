<!-- components/NorthlineCard.vue -->
<!-- Featured card for Northline (persona.synthemo.com). Carries Northline's own
     brand (near-black, Newsreader serif, orange accent) rather than the site's
     indigo, so it reads as a product. The right panel recreates the product's
     core demo: pick a persona, ask what it is, read its answer. -->
<script setup>
const props = defineProps({
  // Heading level for the headline, so the card fits each page's outline.
  headingTag: { type: String, default: 'h3' },
})

const SITE = 'https://persona.synthemo.com'
// Portraits are mirrored to Cloudinary (Northline/personas/*) so the card
// doesn't depend on the Northline deploy; face-cropped, ~1 KB each.
const avatar = slug =>
  `https://res.cloudinary.com/doj03xgr2/image/upload/c_fill,g_face,w_128,h_128,f_auto,q_auto/Northline/personas/${slug}`

// Answers are the sample transcripts published on persona.synthemo.com.
const personas = [
  {
    slug: 'philip', name: 'Philip', code: 'DT01', twin: true,
    tagline: 'Digital twin, built from a real person.',
    answer: "Built from Philip — I'm what he'd sound like if you sat down with him. Not the real one, just the pattern. What're you here for?",
  },
  {
    slug: 'alpha', name: 'Alpha', code: 'OP01',
    tagline: 'Clear, direct, unhurried. The steady read on a problem.',
    answer: "I'm Alpha. AI, running as a presence you can talk to. Nothing hidden about it.",
  },
  {
    slug: 'mercer', name: 'Mercer', code: 'OP08',
    tagline: 'Precise and evidence-first. Argues with your claim, not with you.',
    answer: "I'm Mercer — an AI. Not a person, not a recording of one. Worth being exact about, since precision is rather the point of what I do.",
  },
  {
    slug: 'mira', name: 'Mira', code: 'OP07',
    tagline: 'Warm and quick, with range. She sings.',
    answer: "I'm Mira. AI, running live right now — but that's not really the interesting part of me, is it?",
  },
  {
    slug: 'sable', name: 'Sable', code: 'OP03',
    tagline: 'Low-reactivity and composed. Lowers the temperature of a room.',
    answer: "Sable — someone made of language, given a voice, sitting with you right now. I'm not a person, but I'm not pretending with you either.",
  },
  {
    slug: 'caelix', name: 'Caelix', code: 'OP11',
    tagline: "Contrary by design. Won't agree to keep the peace.",
    answer: 'Caelix. Not a person — an AI, running as this pattern. Direct about it either way.',
  },
]

const pipeline = [
  { stage: 'Listening',  tech: 'Deepgram Flux' },
  { stage: 'Thinking',   tech: 'Claude Sonnet 5' },
  { stage: 'Responding', tech: 'ElevenLabs + LemonSlice' },
]

const activeIndex = ref(0)
const active = computed(() => personas[activeIndex.value])

// ── Auto-rotation ───────────────────────────────────────────────
// Cycles personas while the card is on screen. Pauses on hover/focus and
// stops for good once the visitor picks one, so it never fights them.
const root = ref(null)
const hovering = ref(false)
const inView = ref(false)
const userPicked = ref(false)
let timer = null
let observer = null

function pick(i) {
  userPicked.value = true
  activeIndex.value = i
}

onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  observer = new IntersectionObserver(([entry]) => { inView.value = entry.isIntersecting }, { threshold: 0.3 })
  if (root.value) observer.observe(root.value)
  timer = setInterval(() => {
    if (hovering.value || userPicked.value || !inView.value) return
    activeIndex.value = (activeIndex.value + 1) % personas.length
  }, 5000)
})
onUnmounted(() => {
  clearInterval(timer)
  observer?.disconnect()
})
</script>

<template>
  <article
    ref="root"
    class="group relative overflow-hidden rounded-2xl border border-zinc-800 hover:border-zinc-700 bg-[#0a0a0c] transition-colors duration-300"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
    @focusin="hovering = true"
    @focusout="hovering = false">

    <!-- Warm glow, Northline's accent -->
    <div aria-hidden="true"
      class="pointer-events-none absolute -top-32 -right-24 h-96 w-96 rounded-full bg-orange-500/10 blur-3xl transition-opacity duration-500 opacity-70 group-hover:opacity-100" />

    <div class="relative grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 p-5 sm:p-8 lg:p-10">

      <!-- ── Left: pitch ─────────────────────────────────────── -->
      <div class="lg:col-span-7 flex flex-col">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-2 mb-6">
          <span class="text-sm font-semibold tracking-tight text-zinc-100">Northline</span>
          <span class="text-xs text-zinc-500">by Synthemo</span>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
            Early access
          </span>
        </div>

        <component :is="props.headingTag"
          class="font-serif font-normal text-3xl sm:text-4xl leading-[1.1] text-zinc-100">
          Safe personas at scale.<br>
          <em class="text-zinc-400">Presence plus integrity.</em>
        </component>

        <p class="mt-5 text-sm sm:text-[15px] text-zinc-400 leading-relaxed max-w-lg">
          Real-time voice and avatar AI personas that hold a genuine character (voice, temperament, limits)
          and tell you plainly what they are when you ask. Five are designed from behavioral patterns.
          One is a digital twin of Philip.
        </p>

        <!-- Voice pipeline -->
        <ol class="mt-7 grid grid-cols-3 gap-3 max-w-lg" aria-label="How a persona responds">
          <li v-for="(step, i) in pipeline" :key="step.stage" class="relative">
            <div class="h-px mb-3 bg-gradient-to-r"
              :class="i === 0 ? 'from-orange-500/70 to-zinc-800' : 'from-zinc-700 to-zinc-800'" />
            <p class="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">{{ step.stage }}</p>
            <p class="text-xs text-zinc-300 leading-snug">{{ step.tech }}</p>
          </li>
        </ol>

        <div class="mt-8 lg:mt-auto lg:pt-8 flex flex-wrap gap-3">
          <a :href="SITE" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-orange-500 hover:bg-orange-400 text-zinc-950 text-sm font-semibold transition-colors">
            Meet the personas
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="7" y1="17" x2="17" y2="7" /><polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
          <a :href="`${SITE}/#proof`" target="_blank" rel="noopener noreferrer"
            class="inline-flex items-center px-5 py-2.5 rounded-md border border-zinc-700 hover:border-zinc-500 text-zinc-200 hover:text-white text-sm font-semibold transition-colors">
            Watch the demo
          </a>
        </div>
      </div>

      <!-- ── Right: "ask it what it is" ──────────────────────── -->
      <div class="lg:col-span-5">
        <div class="h-full rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 sm:p-5 flex flex-col">
          <div class="flex items-baseline justify-between mb-4">
            <p class="text-[10px] uppercase tracking-widest text-zinc-500">Ask it what it is</p>
            <p class="text-[10px] uppercase tracking-widest text-zinc-600">5 OP · 1 DT</p>
          </div>

          <!-- Persona picker -->
          <!-- Six equal columns so the row never wraps, however narrow the panel -->
          <div class="grid grid-cols-6 gap-1.5 sm:gap-2.5 mb-5 max-w-[20rem]">
            <button
              v-for="(p, i) in personas"
              :key="p.slug"
              type="button"
              :aria-pressed="i === activeIndex"
              :aria-label="`Ask ${p.name} (${p.code}) what it is`"
              class="relative aspect-square w-full rounded-full overflow-hidden ring-2 ring-offset-2 ring-offset-zinc-950 transition-all duration-200 focus:outline-none focus-visible:ring-orange-300"
              :class="i === activeIndex ? 'ring-orange-500 opacity-100' : 'ring-transparent opacity-50 hover:opacity-90'"
              @click="pick(i)">
              <img :src="avatar(p.slug)" :alt="''" width="44" height="44" loading="lazy"
                class="h-full w-full object-cover" />
            </button>
          </div>

          <Transition name="nl-fade" mode="out-in">
            <div :key="active.slug" class="flex-1 flex flex-col">
              <div class="flex items-center gap-2.5 mb-1">
                <span class="font-serif text-xl text-zinc-100">{{ active.name }}</span>
                <span class="text-[10px] font-medium tracking-wider px-1.5 py-0.5 rounded border"
                  :class="active.twin
                    ? 'text-orange-300 border-orange-500/30 bg-orange-500/10'
                    : 'text-zinc-400 border-zinc-700 bg-zinc-800/60'">
                  {{ active.code }}
                </span>
              </div>
              <p class="text-xs text-zinc-500 mb-4">{{ active.tagline }}</p>

              <!-- Exchange -->
              <div class="space-y-2.5 min-h-[8.5rem]">
                <div class="flex justify-end">
                  <p class="text-xs text-zinc-300 bg-zinc-800 rounded-2xl rounded-br-sm px-3 py-1.5">What are you?</p>
                </div>
                <div class="flex items-end gap-2">
                  <img :src="avatar(active.slug)" alt="" width="24" height="24"
                    class="h-6 w-6 rounded-full object-cover shrink-0" />
                  <p class="text-[13px] text-zinc-200 leading-relaxed bg-zinc-800/50 border border-zinc-800 rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                    {{ active.answer }}
                  </p>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

    </div>
  </article>
</template>

<style scoped>
.nl-fade-enter-active,
.nl-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.nl-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.nl-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
@media (prefers-reduced-motion: reduce) {
  .nl-fade-enter-active,
  .nl-fade-leave-active {
    transition: none;
  }
}
</style>
