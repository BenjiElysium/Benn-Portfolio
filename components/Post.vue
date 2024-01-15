<script setup>
const props = defineProps(['posts'])

const computedCover = (cover) => {
  // If the cover starts with "http" use it directly, else prepend the path
  return cover.startsWith('http') ? cover : `/images/blog/${cover}`;
}
</script>

<template>
  <div v-for="post in props.posts" :key="post.slug" class="flex flex-col bg-zinc-900/80 rounded-lg shadow-xl overflow-hidden hover:opacity-75">
    <NuxtLink :to="post._path" class="flex-shrink-0">
      <!-- Adjust the height as needed -->
      <img :src="computedCover(post.cover)" alt="Blog Post Cover Image" class="w-full h-80 object-cover">
    </NuxtLink>
    <div class="p-6 flex flex-col justify-between grow">
      <div>
        <h2 class="text-xl font-bold mb-2">{{ post.title }}</h2>
        <p class="text-gray-200 mb-2">{{ post.description }}</p>
      </div>
      <NuxtLink :to="post._path" class="inline-block bg-sky-700/80 hover:bg-sky-900/70 text-white py-2 px-4 rounded self-end mb-0">Read More</NuxtLink>
    </div>
  </div>
</template>
