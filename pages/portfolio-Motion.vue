<script>
export default {
  data() {
    return {
      videos: [
        { id: 1, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706162014/Portfolio-Videos/Demo-IDs-Apple-Ovid2_qhdsly.mp4' },
        { id: 2, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706125825/Portfolio-Videos/Demo-IDs-Apple-Hithia_llmohz.mp4' },
        { id: 3, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706029335/Portfolio-Videos/Demo-IDs-Apple-Ocean_ifga85.mp4' },
        { id: 4, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706036446/Portfolio-Videos/Demo-IDs-Apple-IceShelves_tbh3q0.mp4' },
      ]
    }
  }
}
</script>

<template>
  <div 
    v-motion
    :initial="{ opacity: 0 }"
    :enter="{ opacity: 1, transition: { duration: 1000 } }"
    class="pt-28 mb-20">
    <h1 
      v-motion
      :initial="{ opacity: 0, y: 20 }"
      :enter="{ opacity: 1, y: 0, transition: { delay: 200, duration: 700 } }"
      class="text-4xl font-bold mb-6 text-center">
      <span class="bg-gradient-to-r from-purple-500 via-blue-600 to-blue-400 text-transparent bg-clip-text inline-block">
        Portfolio: Motion
      </span>
    </h1>
    <p 
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { delay: 400, duration: 800 } }"
      class="text-lg text-zinc-300 max-w-3xl mx-auto text-center mb-12">
      GenAI Demo IDs: Apple Logo.
    </p>
    <div class="grid sm:grid-cols-2 grid-cols-1 gap-4">
      <div v-for="video in videos" :key="video.id" class="rounded-lg overflow-hidden">
        <video controls class="w-full h-auto">
          <source :src="video.src" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>
    </div>
  </div>
</template>
