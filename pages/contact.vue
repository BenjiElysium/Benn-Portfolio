<template>
  <div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 800 } }"
    class="flex flex-col justify-between min-h-screen p-6">
    <div class="pt-24 pb-24 max-w-3xl mx-auto">
      <h1 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
        class="text-4xl font-bold my-8 text-gradient">Contact</h1>
      <p 
        v-motion
        :initial="{ opacity: 0 }"
        :enter="{ opacity: 1, transition: { delay: 400, duration: 700 } }"
        class="text-lg mb-12 leading-relaxed">
        I am available for projects either remotely or on-site in the Bay Area. Feel free to reach out to discuss availability or any inquiries you might have. You can contact me via email or phone.
      </p>
      
      <div 
        v-motion
        :initial="{ opacity: 0, y: 20 }"
        :enter="{ opacity: 1, y: 0, transition: { delay: 600, duration: 700 } }"
        class="p-8 rounded-lg bg-zinc-900/50 shadow-xl backdrop-blur-sm">
        <div class="flex flex-col md:flex-row gap-8">
          <div
            v-motion
            :initial="{ opacity: 0, x: -20 }"
            :enter="{ opacity: 1, x: 0, transition: { delay: 800, duration: 600 } }"
            class="md:w-1/2 flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50">
            <div class="bg-blue-500/30 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            <div>
              <h3 class="text-lg font-semibold text-blue-300">Phone</h3>
              <p class="text-zinc-300">310-403-1826</p>
            </div>
          </div>
          
          <div
            v-motion
            :initial="{ opacity: 0, x: 20 }"
            :enter="{ opacity: 1, x: 0, transition: { delay: 1000, duration: 600 } }"
            class="md:w-1/2">
            <a 
              href="mailto:philipaldenbenn@gmail.com"
              class="flex items-center gap-4 p-4 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-all duration-300"
            >
              <div class="bg-blue-500/30 p-3 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-400">
                  <rect width="20" height="16" x="2" y="4" rx="2"></rect>
                  <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-semibold text-blue-300">Email</h3>
                <p class="text-zinc-300">philipaldenbenn@gmail.com</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.text-gradient {
  background: linear-gradient(90deg, #8B5CF6, #3B82F6, #60A5FA);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
</style>

