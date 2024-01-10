<script setup>
const links = [
  { name: 'GitHub', href: 'https://github.com', icon: 'entypo-social:github-with-circle' },
  { name: 'Facebook', href: 'https://facebook.com', icon: 'entypo-social:facebook' },
  { name: 'LinkedIn', href: 'https://www.linkedin.com', icon: 'entypo-social:linkedin-with-circle' },
]
</script>

<style>
.footer {
  position: fixed;
  bottom: 0;
  width: 100%;
  color: white;
  text-align: center;
  height: 3rem;
}
</style>

<template>
  <footer class="footer bg-zinc-900/90">
    <section class="mx-auto max-w-6xl px-8 mt-2 text-gray-300 flex flex-row">
      <p class="flex-1 mt-0">&copy; Philip Benn 2023. All Rights Reserved</p>
      <div class="flex flex-row justify-center gap-4">
        <a v-for="link in links" :key="link.name" :href="link.href">
          <Icon :name="link.icon" size="1.5rem" class="text-gray-300" />
        </a>
      </div>
    </section>
  </footer>
</template>
