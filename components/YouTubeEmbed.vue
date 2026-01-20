<script setup>
import { ref } from 'vue';

const props = defineProps({
  videoId: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'YouTube Video'
  },
  thumbnailQuality: {
    type: String,
    default: 'maxresdefault',
    validator: (value) => ['default', 'mqdefault', 'hqdefault', 'sddefault', 'maxresdefault'].includes(value)
  },
  autoplay: {
    type: Boolean,
    default: true
  }
});

const isLoaded = ref(false);
const isHovered = ref(false);

const thumbnailUrl = computed(() => {
  return `https://img.youtube.com/vi/${props.videoId}/${props.thumbnailQuality}.jpg`;
});

const embedUrl = computed(() => {
  const autoplayParam = props.autoplay ? '1' : '0';
  return `https://www.youtube-nocookie.com/embed/${props.videoId}?autoplay=${autoplayParam}&rel=0`;
});

const loadVideo = () => {
  isLoaded.value = true;
};
</script>

<template>
  <div 
    class="youtube-embed-wrapper"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="youtube-embed">
      <div class="aspect-video">
        <!-- Thumbnail with play button (before load) -->
        <button
          v-if="!isLoaded"
          @click="loadVideo"
          class="absolute inset-0 w-full h-full cursor-pointer group"
          :aria-label="`Play ${title}`"
        >
          <!-- Thumbnail image -->
          <img
            :src="thumbnailUrl"
            :alt="title"
            class="w-full h-full object-cover transition-all duration-500"
            :class="{ 'scale-[1.02]': isHovered }"
            loading="lazy"
          />
          
          <!-- Play button - Minimal elegant style -->
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="play-container" :class="{ 'active': isHovered }">
              <!-- Outer ring -->
              <div class="play-ring"></div>
              <!-- Inner button -->
              <div class="play-button">
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  viewBox="0 0 24 24" 
                  fill="currentColor" 
                  class="play-icon"
                >
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </div>
            </div>
          </div>
        </button>
        
        <!-- YouTube iframe (after load) -->
        <iframe
          v-if="isLoaded"
          :src="embedUrl"
          :title="title"
          class="absolute inset-0 w-full h-full"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        ></iframe>
      </div>
    </div>
  </div>
</template>

<style scoped>
.youtube-embed-wrapper {
  position: relative;
  border-radius: 10px;
}

.youtube-embed {
  position: relative;
  width: 100%;
  overflow: hidden;
  border-radius: 10px;
  background: transparent;
}

.aspect-video {
  position: relative;
  padding-bottom: 56.25%;
  height: 0;
}

/* Play button styles */
.play-container {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

@media (min-width: 768px) {
  .play-container {
    width: 68px;
    height: 68px;
  }
}

.play-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.25);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.play-container.active .play-ring {
  border-color: rgba(255, 255, 255, 0.5);
  transform: scale(1.12);
}

.play-button {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

@media (min-width: 768px) {
  .play-button {
    width: 52px;
    height: 52px;
  }
}

.play-container.active .play-button {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.play-icon {
  width: 20px;
  height: 20px;
  margin-left: 2px;
  color: white;
  transition: transform 0.3s ease;
}

@media (min-width: 768px) {
  .play-icon {
    width: 22px;
    height: 22px;
  }
}

.play-container.active .play-icon {
  transform: scale(1.1);
}
</style>
