<script setup>
import { ref, watch } from 'vue';

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
  /** When true (default), try maxres first then fall back if the image 404s (common for new or short videos). */
  thumbnailFallback: {
    type: Boolean,
    default: true
  },
  /** Optional full URL for poster image (e.g. custom still). Use when YouTube CDN only serves generic placeholders. */
  posterUrl: {
    type: String,
    default: ''
  },
  autoplay: {
    type: Boolean,
    default: true
  },
  /** Use 9:16 layout for YouTube Shorts (default is 16:9). */
  orientation: {
    type: String,
    default: 'landscape',
    validator: (v) => ['landscape', 'portrait'].includes(v)
  }
});

const isLoaded = ref(false);
const isHovered = ref(false);

// maxres often 404s; hqdefault can be the generic grey TV icon while sddefault (640×480) is a different frame
const THUMB_ORDER = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default'];
const thumbIndex = ref(0);

const thumbnailUrl = computed(() => {
  if (props.posterUrl) return props.posterUrl;
  const tier = props.thumbnailFallback
    ? THUMB_ORDER[thumbIndex.value] ?? 'hqdefault'
    : props.thumbnailQuality;
  return `https://i.ytimg.com/vi/${props.videoId}/${tier}.jpg`;
});

const onThumbError = () => {
  if (!props.thumbnailFallback) return;
  if (thumbIndex.value < THUMB_ORDER.length - 1) {
    thumbIndex.value += 1;
  }
};

watch(() => props.videoId, () => {
  thumbIndex.value = 0;
});

watch(() => props.posterUrl, () => {
  thumbIndex.value = 0;
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
    :class="{ 'h-full w-full min-h-0': orientation === 'portrait' }"
    @mouseenter="isHovered = true"
    @mouseleave="isHovered = false"
  >
    <div class="youtube-embed" :class="{ 'h-full min-h-0': orientation === 'portrait' }">
      <div
        :class="orientation === 'portrait'
          ? 'relative h-full w-full min-h-0'
          : 'aspect-video'"
      >
        <!-- Thumbnail with play button (before load) -->
        <button
          v-if="!isLoaded"
          @click="loadVideo"
          class="absolute inset-0 w-full h-full cursor-pointer group"
          :aria-label="`Play ${title}`"
        >
          <!-- Thumbnail image -->
          <img
            :key="`${videoId}-${thumbIndex}-${posterUrl || ''}`"
            :src="thumbnailUrl"
            :alt="title"
            class="w-full h-full object-cover transition-all duration-500"
            :class="{ 'scale-[1.02]': isHovered }"
            loading="lazy"
            @error="onThumbError"
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

/* portrait uses Tailwind aspect-[9/16] on the element */

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
