<script setup>
const links = [
  { name: 'LinkedIn', href: 'https://www.linkedin.com/in/philip-benn-5977142/', icon: 'entypo-social:linkedin-with-circle' },
  { name: 'GitHub', href: 'https://github.com/BenjiElysium', icon: 'entypo-social:github-with-circle' },
]
</script>

<style>
.footer {
  width: 100%;
  color: white;
  text-align: center;
  padding: 1rem 0;
  background-color: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(8px);
  box-shadow: 0 -4px 10px rgba(0, 0, 0, 0.1);
}

.social-icon {
  transition: all 0.3s ease;
}

.social-icon:hover {
  transform: translateY(-3px);
  color: #60a5fa;
}
</style>

<template>
  <footer 
    class="footer"
    v-motion
    :initial="{ opacity: 0, y: 20 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: 600, duration: 800 } }">
    <section class="max-w-7xl mx-auto px-4 flex justify-between items-center text-gray-300">
      <p class="text-xs md:text-sm">&copy; Philip Benn 2024. All Rights Reserved</p>
      <div class="flex gap-4">
        <a 
          v-for="(link, index) in links" 
          :key="link.name" 
          :href="link.href"
          target="_blank"
          rel="noopener"
          v-motion
          :initial="{ opacity: 0, scale: 0.8 }"
          :enter="{ opacity: 1, scale: 1, transition: { delay: 800 + (index * 100), duration: 600 } }"
          class="social-icon">
          <Icon :name="link.icon" size="1.5rem" class="text-gray-300" />
        </a>
      </div>
    </section>
  </footer>
</template>
