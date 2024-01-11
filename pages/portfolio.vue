<script setup>
const mediaAssets = [
  { tag: "philipbenn-render", mediaType: "image" },
  { tag: "logi-animation", mediaType: "video" },
  // { tag: "logi-render", mediaType: "spin" }
];
</script>

<style>
.gallery-wrapper {
  max-width: 80%; /* Adjust as needed */
  margin-left: 20px;
  margin-right: auto;
}
</style>


<template>
  <div class="pt-20 mt-4 mb-20">
      <h1 class="text-3xl font-bold ms-6 mb-2">Portfolio: Product and Environment Renders</h1>
      <div class="pt-2">
        <div class="gallery-wrapper">
          <CldProductGallery :media-assets="mediaAssets" />
        </div>
      </div>
  </div>
</template>
