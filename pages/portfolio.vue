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
  margin-left: 30px;
  margin-right: auto;
}
</style>

<template>
  <div class="pt-12 mb-20">
      <h1 class="text-3xl font-bold ms-14 m-8">Portfolio: Product and Environment Renders</h1>
      <div class="pt-2">
        <div class="gallery-wrapper">
          <CldProductGallery :media-assets="mediaAssets" />
        </div>
      </div>
  </div>
</template>
