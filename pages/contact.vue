<script setup>
useSeoMeta({
  title: 'Contact — Philip Benn',
  description: 'Get in touch with Philip Benn for generative AI workflows, 3D product visualization, motion & brand film, or AI tool development projects.',
  ogTitle: 'Contact — Philip Benn',
  ogDescription: 'Available for generative AI, 3D visualization, motion design, and AI tool development projects. Based in the Bay Area.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

const config = useRuntimeConfig();
const formspreeEndpoint = config.public.formspreeEndpoint;

const form = reactive({
  name: '',
  email: '',
  projectType: '',
  message: '',
});

const status = ref('idle'); // idle | loading | success | error

const projectTypes = [
  'Generative AI Workflow',
  '3D Product Visualization',
  'Motion & Brand Film',
  'AI Tool Development',
  'Creative Direction',
  'Other',
];

async function submitForm() {
  if (!form.name || !form.email || !form.message) return;
  status.value = 'loading';
  try {
    const endpoint = formspreeEndpoint || 'https://formspree.io/f/placeholder';
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        projectType: form.projectType,
        message: form.message,
      }),
    });
    if (res.ok) {
      status.value = 'success';
    } else {
      status.value = 'error';
    }
  } catch {
    status.value = 'error';
  }
}
</script>

<template>
  <div
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 600 } }"
    class="motion-initial p-6 max-w-7xl mx-auto">

    <div class="pt-24 pb-24 max-w-2xl">

      <h1
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
        class="motion-initial text-4xl sm:text-5xl font-medium leading-tight mb-4 text-gradient">
        Let's Talk
      </h1>
      <p
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 350, duration: 700 } }"
        class="motion-initial text-zinc-500 leading-relaxed mb-10">
        Available for select projects in generative AI workflows, 3D visualization, motion design, and AI tool development. Based in the Bay Area — remote or on-site.
      </p>

      <!-- Contact form -->
      <div
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 450, duration: 700 } }"
        class="motion-initial">

        <!-- Success state -->
        <div v-if="status === 'success'" class="border border-zinc-800 rounded-lg p-8 text-center">
          <div class="mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none"
              stroke="#818cf8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <h2 class="text-lg font-semibold text-zinc-100 mb-2">Message sent!</h2>
          <p class="text-sm text-zinc-500">I'll be in touch within 48 hours.</p>
        </div>

        <!-- Form -->
        <form v-else @submit.prevent="submitForm" class="space-y-5">

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label for="name" class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Name</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                required
                placeholder="Your name"
                class="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
            <div>
              <label for="email" class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Email</label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                placeholder="your@email.com"
                class="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors" />
            </div>
          </div>

          <div>
            <label for="projectType" class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Project Type</label>
            <select
              id="projectType"
              v-model="form.projectType"
              class="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-indigo-500 transition-colors appearance-none">
              <option value="" disabled>Select a category</option>
              <option v-for="type in projectTypes" :key="type" :value="type">{{ type }}</option>
            </select>
          </div>

          <div>
            <label for="message" class="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">Message</label>
            <textarea
              id="message"
              v-model="form.message"
              required
              rows="5"
              placeholder="Tell me about your project — scope, timeline, goals..."
              class="w-full bg-zinc-900 border border-zinc-800 rounded-md px-4 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-500 transition-colors resize-none" />
          </div>

          <!-- Error state -->
          <p v-if="status === 'error'" class="text-sm text-zinc-500">
            Something went wrong. Email directly at
            <a href="mailto:philipaldenbenn@gmail.com" class="text-indigo-400 hover:text-indigo-300">philipaldenbenn@gmail.com</a>
          </p>

          <button
            type="submit"
            :disabled="status === 'loading'"
            class="w-full sm:w-auto px-8 py-2.5 bg-white text-zinc-900 text-sm font-semibold rounded-md hover:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <span v-if="status === 'loading'">Sending…</span>
            <span v-else>Send Message</span>
          </button>
        </form>
      </div>

      <!-- Direct contact fallback -->
      <div
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 700, duration: 700 } }"
        class="motion-initial mt-12 pt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row gap-6">
        <a href="mailto:philipaldenbenn@gmail.com"
          class="flex items-center gap-3 text-sm text-zinc-500 hover:text-zinc-200 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <rect width="20" height="16" x="2" y="4" rx="2"/>
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
          philipaldenbenn@gmail.com
        </a>
        <span class="flex items-center gap-3 text-sm text-zinc-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
          310-403-1826
        </span>
      </div>

    </div>
  </div>
</template>
