<script setup>
import CloudinaryMasonryGallery from '~/components/CloudinaryMasonryGallery.vue';

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
    class="pt-28 mb-20">
    <h1 
      v-motion
      :initial="{ opacity: 0, y: 20}"
      :enter="{ opacity: 1, y: 0, transition: { delay: 400, duration: 800 } }"
      class="text-4xl font-bold mb-6 text-center">
      <span class="bg-gradient-to-r from-purple-500 via-blue-600 to-blue-400 text-transparent bg-clip-text inline-block">
        Generative AI - Image Diffusion
      </span>
    </h1>
    <p 
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="text-lg text-zinc-300 max-w-3xl mx-auto text-center mb-12">
      AI-generated images created with various diffusion models.
    </p>
    <div 
      v-motion
      :initial="{ opacity: 0, scale: 0.95 }"
      :enter="{ opacity: 1, scale: 1, transition: { delay: 600, duration: 1000 } }"
      class="w-full px-4 md:px-8 lg:px-12 xl:px-16">
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
