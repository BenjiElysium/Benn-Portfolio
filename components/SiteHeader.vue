<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { Disclosure, DisclosureButton, DisclosurePanel, Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/vue';
import { Bars3Icon, BellIcon, XMarkIcon } from '@heroicons/vue/24/outline';
import { useRoute } from 'vue-router';

const route = useRoute();

// Reactive variable to track navbar visibility
const isNavbarVisible = ref(true);
let lastScroll = 0;

// Scroll event handler
const handleScroll = () => {
  const currentScroll = window.scrollY;
  isNavbarVisible.value = currentScroll <= lastScroll || currentScroll <= 0;
  lastScroll = currentScroll;
};

// Add and remove the scroll event listener
onMounted(() => {
  window.addEventListener('scroll', handleScroll);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});

const navigation = [
  { name: 'Home', href: '/', current: route.name == 'index' },
  { name: 'Blog', href: '/blog', current: route.name.includes('blog') },
  { name: 'Portfolio: CGI', href: '/portfolio-CGI', current: route.name == 'portfolio-CGI' },
  { name: 'Portfolio: GenAI', href: '/portfolio-GenAI', current: route.name == 'portfolio-GenAI' },
  { name: 'Portfolio: Motion', href: '/portfolio-Motion', current: route.name == 'portfolio-Motion' },
  { name: 'Resume', href: '/resume', current: route.name == 'resume' },
  { name: 'Contact', href: '/contact', current: route.name == 'contact' },
]
</script>

<style>
.navbar {
  position: fixed;
  width: 100%;
  z-index: 1000;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: top 0.8s;
}

.visible-navbar {
  transition: top 0.8s;
  top: 0;
}

.hidden-navbar {
  transition: top 0.8s;
  top: -10%; /* Adjust based on the actual height of your navbar */
}
</style>

<template>
  <Disclosure as="nav" :class="{ 'hidden-navbar': !isNavbarVisible, 'visible-navbar': isNavbarVisible }" class="navbar bg-zinc-900" v-slot="{ open }">
    <div class="mx-4 max-w-7xl px-2 sm:px-6 lg:px-8">
      <div class="relative flex h-16 items-center justify-between">
        <div class="absolute inset-y-0 left-0 flex items-center sm:hidden">
          <!-- Mobile menu button-->
          <DisclosureButton
            class="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white">
            <span class="sr-only">Open main menu</span>
            <Bars3Icon v-if="!open" class="block h-6 w-6" aria-hidden="true" />
            <XMarkIcon v-else class="block h-6 w-6" aria-hidden="true" />
          </DisclosureButton>
        </div>
        <div class="flex flex-1 items-center justify-center sm:items-stretch sm:justify-start">
          <div class="flex flex-shrink-0 items-center">
            <img class="block h-8 w-auto lg:hidden" src="https://res.cloudinary.com/doj03xgr2/image/upload/v1705330798/LandingPage-Images/PB-logo-white_yhxp4k.svg"
              alt="Philip Benn" />
            <img class="hidden h-8 w-auto lg:block" src="https://res.cloudinary.com/doj03xgr2/image/upload/v1705330798/LandingPage-Images/PB-logo-white_yhxp4k.svg"
              alt="Your Company" />
          </div>
          <div class="hidden sm:ml-6 sm:block">
            <div class="flex space-x-4">
              <a v-for="item in navigation" :key="item.name" :href="item.href"
                :class="[item.current ? 'bg-zinc-800 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white', 'rounded-md px-3 py-2 text-sm font-medium']"
                :aria-current="item.current ? 'page' : undefined">{{ item.name }}</a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <DisclosurePanel class="sm:hidden">
      <div class="space-y-1 px-2 pb-3 pt-2">
        <DisclosureButton v-for="item in navigation" :key="item.name" as="a" :href="item.href"
          :class="[item.current ? 'bg-zinc-800/90 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white', 'block rounded-md px-3 py-2 text-base font-medium']"
          :aria-current="item.current ? 'page' : undefined">{{ item.name }}</DisclosureButton>
      </div>
    </DisclosurePanel>
  </Disclosure>
</template>