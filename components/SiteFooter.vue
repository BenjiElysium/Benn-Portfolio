<script setup>
const links = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/philip-benn-5977142/', icon: 'entypo-social:linkedin-with-circle' },
  { name: 'GitHub', href: 'https://github.com/BenjiElysium', icon: 'entypo-social:github-with-circle' },
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
    <section class="max-w-2xl px-4 mt-2 m-4 justify-between text-gray-300 flex flex-row">
      <p class="mt-0">&copy; Philip Benn 2023. All Rights Reserved</p>
      <div class="flex flex-row gap-4">
        <a v-for="link in links" :key="link.name" :href="link.href">
          <Icon :name="link.icon" size="1.5rem" class="text-gray-300" />
        </a>
      </div>
    </section>
  </footer>
</template>
