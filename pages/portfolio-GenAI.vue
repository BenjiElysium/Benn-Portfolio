<script setup>
import CloudinaryMasonryGallery from '~/components/CloudinaryMasonryGallery.vue';

useSeoMeta({
  title: 'Generative AI Portfolio — Philip Benn',
  description: 'AI-generated images created with diffusion models including Flux, Midjourney, and ComfyUI. Portfolio by Philip Benn.',
  ogTitle: 'Generative AI Portfolio — Philip Benn',
  ogDescription: 'AI-generated images created with diffusion models. Portfolio by Philip Benn.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

const sections = [
{
    title: 'Brand Spec Spot for Le Labo (Unofficial). Created with NanoBanana Pro, 2026',
    assets: [{ folder: 'Brand-Spec-LeLabo', mediaType: 'image' }],
  },
  {
    title: 'Brand Spec Spot for Calm (Unofficial). Created with NanoBanana Pro, 2026',
    assets: [{ folder: 'Brand-Spec-Calm', mediaType: 'image' }],
  },
  {
    title: 'Brand Spec Spot for Arjé (Unofficial). Created with NanoBanana Pro, 2026',
    assets: [{ folder: 'Brand-Spec-Arje', mediaType: 'image' }],
  },
  {
    title: 'Brand Spec Spot for Arc\'teryx (Unofficial). Created with NanoBanana Pro, 2026',
    assets: [{ folder: 'Brand-Spec-Arcteryx', mediaType: 'image' }],
  },
  {
    title: 'Brand Spec Spot for Rivian (Unofficial). Created with Midjourney and NanoBanana Pro, 2026',
    assets: [{ folder: 'Brand-Spec-Rivian', mediaType: 'image' }],
  },  
  {
    title: 'Fluxion App Images created with Flux, Photon and OpenAI models, 2024-2025',
    assets: [{ folder: 'Fluxion', mediaType: 'image' }],
  },
  {
    title: 'Created with SDXL model, 2024',
    assets: [{ folder: 'Portal2', mediaType: 'image' }],
  },
  {
    title: 'Created with Elysium App with the Flux Schnell model, 2023-2024',
    assets: [{ folder: 'ElysiumSystem-LP', mediaType: 'image' }],
  },
];
</script>

<template>
  <div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 1000 } }"
    class="motion-initial pt-28 mb-20">
    <h1 
      v-motion
      :initial="{ opacity: 0, y: 20}"
      :enter="{ opacity: 1, y: 0, transition: { delay: 400, duration: 800 } }"
      class="motion-initial text-4xl sm:text-5xl font-medium leading-tight mb-4 text-gradient text-center">
      Generative AI — Image Diffusion
    </h1>
    <p 
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="motion-initial text-lg text-zinc-300 max-w-3xl mx-auto text-center mb-12">
      AI-generated images created with various diffusion models.
    </p>

    <div class="w-full px-4 md:px-8 lg:px-12 xl:px-16">
      <section 
        v-for="(section, idx) in sections" 
        :key="idx"
        v-motion
        :initial="{ opacity: 0, y: 30 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 600 + (idx * 200), duration: 800 } }"
        class="motion-initial"
      >
        <div v-if="idx > 0" class="border-t border-zinc-700/40 my-16"></div>
        <h2 class="text-2xl font-light text-zinc-500 mb-8">{{ section.title }}</h2>
        <CloudinaryMasonryGallery 
          :media-assets="section.assets"
          :column-width="320"
          :gap="16"
          :max-width="1800"
          sort-by="newest"
        />
      </section>
    </div>
  </div>
</template>
