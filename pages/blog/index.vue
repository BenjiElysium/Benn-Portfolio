<script setup>
const { data: posts } = await useAsyncData('posts', () =>
  queryContent('/blog').find()
)
</script>

<template>
  <div class="pt-12 pb-12">
    <h1 class="text-3xl font-bold my-8">Blog Posts</h1>

    I like to write about anything thta I am currently working or something new that interests me. If you would like me to
    write about something or be a guest blogger on your blog please reach out to me via the Contact page.

    <section class="grid md:grid-cols-3 mt-8 gap-10">
      <Post :posts="posts" />
    </section>
  </div>
</template>
