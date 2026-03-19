<script setup>
import { ref, onMounted, watch } from 'vue';

const props = defineProps({
  mediaAssets: {
    type: Array,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  linkHref: {
    type: String,
    required: true
  },
  linkLabel: {
    type: String,
    default: 'View portfolio'
  },
  maxImages: {
    type: Number,
    default: 14
  },
  sortBy: {
    type: String,
    default: 'random',
    validator: (v) => ['random', 'newest', 'oldest', 'name'].includes(v)
  }
});

const items = ref([]);
const allItems = ref([]);
const loading = ref(true);
const cloudName = 'doj03xgr2';

const fetchImagesByTag = async (tag) => {
  try {
    const url = `https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch images');
    const data = await response.json();
    return data.resources.map((img) => ({
      publicId: img.public_id,
      format: img.format,
      createdAt: img.created_at,
      url: `https://res.cloudinary.com/${cloudName}/image/upload/c_scale,w_600/${img.public_id}.${img.format}`,
      originalUrl: `https://res.cloudinary.com/${cloudName}/image/upload/${img.public_id}.${img.format}`,
      width: img.width,
      height: img.height,
      aspectRatio: img.width / img.height
    }));
  } catch (error) {
    console.error('Error fetching images by tag:', error);
    return [];
  }
};

const fetchImagesByFolder = async (folder) => {
  try {
    const response = await fetch(`/api/cloudinary/folder/${folder}`);
    if (!response.ok) throw new Error('Failed to fetch images from folder');
    const data = await response.json();
    return data.resources || [];
  } catch (error) {
    console.error('Error fetching images from folder:', error);
    return [];
  }
};

const loadImages = async () => {
  loading.value = true;
  items.value = [];

  for (const asset of props.mediaAssets) {
    if (asset.mediaType !== 'image') continue;

    let images = [];
    if (asset.folder) {
      images = await fetchImagesByFolder(asset.folder);
    } else if (asset.tag) {
      images = await fetchImagesByTag(asset.tag);
    }

    items.value = [...items.value, ...images];
  }

  allItems.value = [...items.value];
  items.value = sortItems([...allItems.value]).slice(0, props.maxImages);

  loading.value = false;
};

const sortItems = (array) => {
  switch (props.sortBy) {
    case 'random':
      return array.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt) - new Date(a.createdAt);
      });
    case 'oldest':
      return array.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
    case 'name':
      return array.sort((a, b) => {
        const nameA = (a.publicId || '').split('/').pop().toLowerCase();
        const nameB = (b.publicId || '').split('/').pop().toLowerCase();
        return nameA.localeCompare(nameB);
      });
    case 'random':
    default:
      for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
      }
      return array;
  }
};

onMounted(loadImages);
watch(() => props.mediaAssets, loadImages, { deep: true });
watch(() => [props.sortBy, props.maxImages], () => {
  if (allItems.value.length > 0) {
    items.value = sortItems([...allItems.value]).slice(0, props.maxImages);
  }
});
</script>

<template>
  <section class="mb-24">
    <div class="flex justify-between items-end mb-8">
      <h2
        v-motion
        :initial="{ opacity: 0, y: 28, filter: 'blur(6px)' }"
        :visible="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 700, ease: 'easeOut' } }"
        class="motion-initial text-2xl font-semibold text-zinc-100">
        {{ title }}
      </h2>
      <NuxtLink
        :to="linkHref"
        class="text-sm text-zinc-500 hover:text-zinc-200 transition-colors flex items-center gap-1 shrink-0">
        {{ linkLabel }}
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </NuxtLink>
    </div>

    <div v-if="loading" class="flex gap-4 overflow-hidden py-4">
      <div v-for="i in 6" :key="i" class="shrink-0 w-48 h-64 rounded-lg bg-zinc-800/50 animate-pulse" />
    </div>

    <div
      v-else-if="items.length > 0"
      v-motion
      :initial="{ opacity: 0, y: 24, filter: 'blur(6px)' }"
      :visible="{ opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 600, ease: 'easeOut' } }"
      class="motion-initial scroll-container">
      <div class="scroll-track">
        <NuxtLink
          v-for="(item, idx) in items"
          :key="item.publicId + '-' + idx"
          :to="linkHref"
          class="scroll-item">
          <img
            :src="item.url"
            :alt="item.publicId"
            class="scroll-image"
            loading="lazy"
          />
        </NuxtLink>
      </div>
    </div>

    <div v-else class="py-12 text-center text-zinc-500 text-sm">
      No images available
    </div>
  </section>
</template>

<style scoped>
.scroll-container {
  margin-left: calc(-1 * min(1.5rem, 6vw));
  margin-right: calc(-1 * min(1.5rem, 6vw));
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
  scrollbar-color: rgba(113, 113, 122, 0.5) transparent;
}

.scroll-container::-webkit-scrollbar {
  height: 6px;
}

.scroll-container::-webkit-scrollbar-track {
  background: transparent;
}

.scroll-container::-webkit-scrollbar-thumb {
  background: rgba(113, 113, 122, 0.5);
  border-radius: 3px;
}

.scroll-track {
  display: flex;
  gap: 1rem;
  padding: 0.25rem 0 min(1.5rem, 6vw);
  width: max-content;
}

.scroll-item {
  flex-shrink: 0;
  width: 13rem;
  height: 17rem;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid rgb(39 39 42);
  transition: border-color 0.3s, transform 0.3s;
}

.scroll-item:hover {
  border-color: rgb(82 82 91);
  transform: translateY(-4px);
}

.scroll-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
</style>
