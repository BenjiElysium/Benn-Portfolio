<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue';
import { Bars3Icon, XMarkIcon, ChevronDownIcon } from '@heroicons/vue/24/outline';
import { useRoute } from 'vue-router';

const route = useRoute();

// ── Scroll-hide + inactivity-hide behaviour ────────────────────
const isNavbarVisible = ref(true);
let lastScroll = 0;
let inactivityTimer = null;

function showNavbar() {
  isNavbarVisible.value = true;
  clearTimeout(inactivityTimer);
  inactivityTimer = setTimeout(() => {
    isNavbarVisible.value = false;
  }, 3000);
}

const handleScroll = () => {
  const cur = window.scrollY;
  // scroll-direction logic (keeps existing page behaviour)
  if (cur <= lastScroll || cur <= 0) {
    showNavbar();
  } else {
    isNavbarVisible.value = false;
    clearTimeout(inactivityTimer);
  }
  lastScroll = cur;
};

const handleMouseMove = () => showNavbar();

onMounted(() => {
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('mousemove', handleMouseMove, { passive: true });
  // Start the initial inactivity timer
  inactivityTimer = setTimeout(() => { isNavbarVisible.value = false; }, 3000);
});
onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('mousemove', handleMouseMove);
  clearTimeout(inactivityTimer);
});

// ── Nav links ─────────────────────────────────────────────────
const portfolioLinks = [
  { name: 'Portfolio: Motion', href: '/portfolio-Motion' },
  { name: 'Portfolio: CGI',    href: '/portfolio-CGI'    },
  { name: 'Portfolio: GenAI',  href: '/portfolio-GenAI'  },
];

const isPortfolioActive = computed(() =>
  portfolioLinks.some(p => route.path.startsWith(p.href))
);

// ── Hover dropdown (desktop) ──────────────────────────────────
const isDropdownOpen = ref(false);
let closeTimer = null;

const openDropdown  = () => { clearTimeout(closeTimer); isDropdownOpen.value = true; };
const delayClose    = () => { closeTimer = setTimeout(() => { isDropdownOpen.value = false; }, 120); };
</script>

<style>
.navbar {
  position: fixed;
  width: 100%;
  z-index: 1000;
  transition: top 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(63, 63, 70, 0.4);
}
.visible-navbar { top: 0; }
.hidden-navbar  { top: -64px; }

/* Underline indicator on nav links */
.nav-link { position: relative; }
.nav-link::after {
  content: '';
  position: absolute;
  height: 1px;
  width: 0;
  bottom: -1px;
  left: 50%;
  background: #818cf8;
  transition: width 0.25s ease, left 0.25s ease;
}
.nav-link:hover::after,
.nav-link.active::after {
  width: 80%;
  left: 10%;
}

/* Portfolio dropdown panel */
.portfolio-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  min-width: 200px;
  background: rgba(9, 9, 11, 0.96);
  border: 1px solid rgba(63, 63, 70, 0.6);
  border-radius: 8px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 5px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
  z-index: 50;
}
.portfolio-dropdown a {
  display: block;
  padding: 7px 13px;
  border-radius: 5px;
  font-size: 0.8125rem;
  color: #a1a1aa;
  white-space: nowrap;
  transition: background 0.12s, color 0.12s;
}
.portfolio-dropdown a:hover,
.portfolio-dropdown a.active-item {
  background: rgba(129, 140, 248, 0.12);
  color: #e4e4e7;
}
</style>

<template>
  <Disclosure
    v-motion
    :initial="{ opacity: 0, y: -20 }"
    :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
    as="nav"
    :class="{ 'hidden-navbar': !isNavbarVisible, 'visible-navbar': isNavbarVisible }"
    class="motion-initial navbar bg-zinc-950/85"
    v-slot="{ open }">

    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="relative flex h-16 items-center">

        <!-- Logo -->
        <div class="flex-shrink-0">
          <NuxtLink to="/" class="flex items-center">
            <img
              class="h-8 w-auto"
              src="https://res.cloudinary.com/doj03xgr2/image/upload/v1705330798/LandingPage-Images/PB-logo-white_yhxp4k.svg"
              alt="Philip Benn" />
          </NuxtLink>
        </div>

        <!-- Desktop nav ─ absolutely centred in the bar -->
        <div class="hidden sm:flex absolute left-1/2 -translate-x-1/2 items-center gap-1">

          <!-- Home -->
          <NuxtLink
            to="/"
            :class="[
              route.path === '/' ? 'text-white active' : 'text-zinc-400 hover:text-zinc-100',
              'nav-link px-3 py-2 text-sm font-medium transition-colors rounded-md'
            ]">
            Home
          </NuxtLink>

          <!-- Projects & Experience -->
          <NuxtLink
            to="/projects"
            :class="[
              route.path === '/projects' ? 'text-white active' : 'text-zinc-400 hover:text-zinc-100',
              'nav-link px-3 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap'
            ]">
            Projects &amp; Experience
          </NuxtLink>

          <!-- Portfolio dropdown (hover) -->
          <div
            class="relative"
            @mouseenter="openDropdown"
            @mouseleave="delayClose">

            <button
              :class="[
                isPortfolioActive ? 'text-white active' : 'text-zinc-400 hover:text-zinc-100',
                'nav-link flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors rounded-md focus:outline-none'
              ]">
              Portfolio
              <ChevronDownIcon
                :class="['h-3.5 w-3.5 mt-px transition-transform duration-200', isDropdownOpen ? 'rotate-180' : '']" />
            </button>

            <Transition
              enter-active-class="transition ease-out duration-140"
              enter-from-class="opacity-0 scale-95 -translate-y-1"
              enter-to-class="opacity-100 scale-100 translate-y-0"
              leave-active-class="transition ease-in duration-100"
              leave-from-class="opacity-100 scale-100 translate-y-0"
              leave-to-class="opacity-0 scale-95 -translate-y-1">
              <div
                v-if="isDropdownOpen"
                class="portfolio-dropdown"
                @mouseenter="openDropdown"
                @mouseleave="delayClose">
                <NuxtLink
                  v-for="item in portfolioLinks"
                  :key="item.name"
                  :to="item.href"
                  :class="route.path.startsWith(item.href) ? 'active-item' : ''">
                  {{ item.name }}
                </NuxtLink>
              </div>
            </Transition>
          </div>

          <!-- Apps -->
          <NuxtLink
            to="/apps"
            :class="[
              route.path.startsWith('/apps') ? 'text-white active' : 'text-zinc-400 hover:text-zinc-100',
              'nav-link px-3 py-2 text-sm font-medium transition-colors rounded-md'
            ]">
            Apps
          </NuxtLink>

          <!-- Contact -->
          <NuxtLink
            to="/contact"
            :class="[
              route.path === '/contact' ? 'text-white active' : 'text-zinc-400 hover:text-zinc-100',
              'nav-link px-3 py-2 text-sm font-medium transition-colors rounded-md'
            ]">
            Contact
          </NuxtLink>
        </div>

        <!-- Mobile hamburger -->
        <div class="ml-auto sm:hidden">
          <DisclosureButton
            class="inline-flex items-center justify-center rounded-md p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white focus:outline-none">
            <span class="sr-only">Open main menu</span>
            <Bars3Icon v-if="!open" class="h-6 w-6" aria-hidden="true" />
            <XMarkIcon v-else class="h-6 w-6" aria-hidden="true" />
          </DisclosureButton>
        </div>

      </div>
    </div>

    <!-- Mobile panel -->
    <DisclosurePanel class="sm:hidden border-t border-zinc-800/50">
      <div class="px-4 py-3 space-y-1">
        <DisclosureButton as="a" href="/"
          :class="[route.path === '/' ? 'text-white bg-zinc-800/50' : 'text-zinc-400',
            'block px-3 py-2 rounded-md text-base font-medium hover:bg-zinc-800 hover:text-white transition-colors']">
          Home
        </DisclosureButton>

        <DisclosureButton as="a" href="/projects"
          :class="[route.path === '/projects' ? 'text-white bg-zinc-800/50' : 'text-zinc-400',
            'block px-3 py-2 rounded-md text-base font-medium hover:bg-zinc-800 hover:text-white transition-colors']">
          Projects &amp; Experience
        </DisclosureButton>

        <!-- Portfolio group -->
        <div>
          <p class="px-3 pt-2 pb-1 text-xs font-semibold text-zinc-600 uppercase tracking-widest">Portfolio</p>
          <DisclosureButton
            v-for="item in portfolioLinks"
            :key="item.name"
            as="a"
            :href="item.href"
            :class="[
              route.path.startsWith(item.href) ? 'text-white bg-zinc-800/50' : 'text-zinc-400',
              'block pl-5 pr-3 py-2 rounded-md text-sm font-medium hover:bg-zinc-800 hover:text-white transition-colors'
            ]">
            {{ item.name }}
          </DisclosureButton>
        </div>

        <DisclosureButton as="a" href="/apps"
          :class="[route.path.startsWith('/apps') ? 'text-white bg-zinc-800/50' : 'text-zinc-400',
            'block px-3 py-2 rounded-md text-base font-medium hover:bg-zinc-800 hover:text-white transition-colors']">
          Apps
        </DisclosureButton>

        <DisclosureButton as="a" href="/contact"
          :class="[route.path === '/contact' ? 'text-white bg-zinc-800/50' : 'text-zinc-400',
            'block px-3 py-2 rounded-md text-base font-medium hover:bg-zinc-800 hover:text-white transition-colors']">
          Contact
        </DisclosureButton>
      </div>
    </DisclosurePanel>

  </Disclosure>
</template>
