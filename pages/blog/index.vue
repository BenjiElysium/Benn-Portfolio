<script setup>
const { data: posts } = await useAsyncData('posts', () =>
  queryContent('/blog').find()
)
</script>

<template>
<div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 800 } }"
    class="flex flex-col justify-center p-6 max-w-7xl mx-auto">
  <div class="pt-24 pb-8">
    <h1 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
        class="text-4xl font-bold mb-6 text-gradient">Blog Posts</h1>

    <p 
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 400, duration: 700 } }"
        class="text-lg mb-12 leading-relaxed">
        I regularly write about the projects I’m working on, along with tools, trends, and ideas that spark curiosity. If you’re interested in collaborating on a piece or would like to invite me as a guest contributor, feel free to get in touch via the Contact page.
    </p>

    <section class="grid md:grid-cols-3 mt-8 gap-10">
      <Post :posts="posts" />
    </section>
  </div>
</div>
</template>

<style>
.text-gradient {
  background: linear-gradient(90deg, #8B5CF6, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  display: inline-block;
}
</style>
