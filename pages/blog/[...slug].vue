<script setup>
const { path } = useRoute();

const { data } = await useAsyncData(`content-${path}`, () => {
  return queryContent()
    .where({ _path: path })
    .findOne()
})
</script>

<template>
  <div class="pt-12 pb-12 bg-white">
    <ContentRenderer :value="data" class="prose my-10 mx-auto max-w-7xl px-8 py-4" />
  </div>  
</template>