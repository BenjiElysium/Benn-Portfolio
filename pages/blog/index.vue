<script setup>
const { data: posts } = await useAsyncData('posts', () =>
  queryContent('/blog').find()
)
</script>

<template>
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
        I like to write about anything that I am currently working or something new that interests me. If you would like me to
        write about something or be a guest blogger on your blog please reach out to me via the Contact page.
    </p>

    <section class="grid md:grid-cols-3 mt-8 gap-10">
      <Post :posts="posts" />
    </section>
  </div>
</template>
