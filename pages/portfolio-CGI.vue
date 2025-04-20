<script setup>
import CloudinaryMasonryGallery from '~/components/CloudinaryMasonryGallery.vue';

const mediaAssets = [
  { tag: "philipbenn-render", mediaType: "image" },
  { tag: "logi-animation", mediaType: "video" },
];

const handleImageClick = (image) => {
  console.log('Image clicked:', image);
};
</script>

<style>
.gallery-wrapper {
  max-width: 90%;
  margin: 0 auto;
}

.portfolio-heading {
  background: linear-gradient(90deg, #60A5FA, #818CF8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>

<template>
  <div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 1000 } }"
    class="pt-24 mb-20">
    <h1 
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 800 } }"
      class="text-4xl font-bold mx-auto text-center mb-8 portfolio-heading">
      Product & Environment Renders
    </h1>
    <p 
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="text-lg text-zinc-300 max-w-3xl mx-auto text-center mb-12">
      Professional product visualization, CGI environments, and 3D renderings created with Cinema4D, Maya, Nuke, and Photoshop.
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
