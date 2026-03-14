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

const mediaAssets = [
  { tag: "image-diffusion-PB", mediaType: "image" },
  { folder: "Fluxion", mediaType: "image" },
  // { tag: "logi-animation", mediaType: "video" },
  // { tag: "logi-render", mediaType: "spin" }
];

const handleImageClick = (image) => {
  console.log('Image clicked:', image);
};
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
    <div 
      v-motion
      :initial="{ opacity: 0, scale: 0.95 }"
      :enter="{ opacity: 1, scale: 1, transition: { delay: 600, duration: 1000 } }"
      class="motion-initial w-full px-4 md:px-8 lg:px-12 xl:px-16">
      <CloudinaryMasonryGallery 
        :media-assets="mediaAssets"
        :column-width="320"
        :gap="16"
        :max-width="1800"
        @image-click="handleImageClick"
      />
    </div>
  </div>
</template>
