<script>
export default {
  data() {
    return {
      videos: [
        { id: 1, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706123775/Portfolio-Videos/Demo-IDs-Apple-Ovid_tdbwqt.mp4' },
        { id: 2, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706125825/Portfolio-Videos/Demo-IDs-Apple-Hithia_llmohz.mp4' },
        { id: 3, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706029335/Portfolio-Videos/Demo-IDs-Apple-Ocean_ifga85.mp4' },
        { id: 4, src: 'https://res.cloudinary.com/doj03xgr2/video/upload/v1706036446/Portfolio-Videos/Demo-IDs-Apple-IceShelves_tbh3q0.mp4' },
      ]
    }
  }
}
</script>

<template>
  <div class="pt-20 mt-4 mb-20">
    <h1 class="text-3xl font-bold ms-6 mb-12">Portfolio: Motion</h1>
    <p class="text-lg ms-6">GenAI Demo IDs: Apple Logo</p>
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
