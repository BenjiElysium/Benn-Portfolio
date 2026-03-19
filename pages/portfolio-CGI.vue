<script setup>
import CloudinaryMasonryGallery from '~/components/CloudinaryMasonryGallery.vue';

useSeoMeta({
  title: 'CGI & 3D Portfolio — Philip Benn',
  description: 'Professional product visualization, CGI environments, and 3D renderings. Created with Cinema4D, Maya, Nuke, and Photoshop for clients including Logitech, Apple, and Google.',
  ogTitle: 'CGI & 3D Portfolio — Philip Benn',
  ogDescription: 'Product visualization and 3D renderings by Philip Benn. Clients include Logitech, Apple, and Google.',
  ogType: 'website',
  twitterCard: 'summary_large_image',
});

const mediaAssets = [
  { tag: "philipbenn-render", mediaType: "image" },
  { tag: "logi-animation", mediaType: "video" },
];

// Sort options: 'random' | 'newest' | 'oldest' | 'name'
const cgiSortBy = 'name';

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
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 800 } }"
      class="motion-initial text-4xl sm:text-5xl font-medium leading-tight mb-4 text-gradient text-center">
      Product &amp; Environment Renders
    </h1>
    <p 
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="motion-initial text-lg text-zinc-300 max-w-3xl mx-auto text-center mb-8">
      Professional product visualization, CGI environments, and 3D renderings created with Cinema4D, Maya, Nuke, and Photoshop.
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
        :max-width="2400"
        :sort-by="cgiSortBy"
        @image-click="handleImageClick"
      />
    </div>
  </div>
</template>
