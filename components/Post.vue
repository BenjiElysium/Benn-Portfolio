<script setup>
const props = defineProps(['posts'])

const computedCover = (cover) => {
  // If the cover starts with "http" use it directly, else prepend the path
  return cover.startsWith('http') ? cover : `/images/blog/${cover}`;
}
</script>

<template>
  <div 
    v-for="(post, index) in props.posts" 
    :key="post.slug" 
    v-motion
    :initial="{ opacity: 0, y: 50 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: 100 * index, duration: 800 } }"
    class="flex flex-col bg-zinc-900/50 rounded-lg shadow-xl overflow-hidden hover:shadow-blue-500/20 hover:translate-y-[-8px] transition-all duration-500">
    <NuxtLink :to="post._path" class="flex-shrink-0 overflow-hidden">
      <!-- Image container with hover effect -->
      <div class="relative w-full h-64 overflow-hidden">
        <img 
          :src="computedCover(post.cover)" 
          alt="Blog Post Cover Image" 
          class="w-full h-full object-cover transition-transform duration-700 hover:scale-110">
      </div>
    </NuxtLink>
    <div class="p-6 flex flex-col justify-between grow">
      <div>
        <h2 class="text-xl font-bold mb-3 text-gradient">{{ post.title }}</h2>
        <p class="text-gray-200 mb-4">{{ post.description }}</p>
      </div>
      <NuxtLink 
        :to="post._path" 
        class="inline-block bg-gradient-to-r from-blue-600/90 to-indigo-600/90 hover:from-blue-700/90 hover:to-indigo-700/90 text-white py-2 px-4 rounded-md self-end mb-0 transition-all duration-300 shadow-md hover:shadow-lg">
        Read More
      </NuxtLink>
    </div>
  </div>
</template>
