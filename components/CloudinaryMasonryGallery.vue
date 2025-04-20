<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';
import MasonryWall from '@yeger/vue-masonry-wall';

const props = defineProps({
  mediaAssets: {
    type: Array,
    required: true
  },
  columnWidth: {
    type: Number,
    default: 300
  },
  gap: {
    type: Number,
    default: 16
  },
  maxWidth: {
    type: Number,
    default: 1600
  }
});

const emits = defineEmits(['imageClick']);

const items = ref([]);
const loading = ref(true);
const selectedImage = ref(null);
const modalVisible = ref(false);

// Function to fetch Cloudinary images by tag
const fetchImagesByTag = async (tag) => {
  try {
    // Construct Cloudinary API URL
    const cloudName = 'doj03xgr2'; // Using your cloud name from the examples
    const url = `https://res.cloudinary.com/${cloudName}/image/list/${tag}.json`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch images');
    const data = await response.json();
    return data.resources;
  } catch (error) {
    console.error('Error fetching images:', error);
    return [];
  }
};

// Load all images from all tags
const loadAllImages = async () => {
  loading.value = true;
  items.value = [];
  
  for (const asset of props.mediaAssets) {
    if (asset.mediaType === 'image') {
      const images = await fetchImagesByTag(asset.tag);
      const processedImages = images.map(img => ({
        publicId: img.public_id,
        format: img.format,
        version: img.version,
        url: `https://res.cloudinary.com/doj03xgr2/image/upload/c_scale,w_800/${img.public_id}.${img.format}`,
        originalUrl: `https://res.cloudinary.com/doj03xgr2/image/upload/${img.public_id}.${img.format}`,
        width: img.width,
        height: img.height,
        aspectRatio: img.width / img.height,
        tag: asset.tag
      }));
      items.value = [...items.value, ...processedImages];
    }
  }
  
  // Randomize the images for a better masonry layout
  items.value = shuffleArray([...items.value]);
  
  loading.value = false;
};

// Fisher-Yates shuffle algorithm to randomize array
const shuffleArray = (array) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

// Handle image click to open modal
const handleImageClick = (image) => {
  selectedImage.value = image;
  modalVisible.value = true;
  emits('imageClick', image);
  // Disable body scroll when modal is open
  document.body.style.overflow = 'hidden';
};

// Close modal
const closeModal = () => {
  modalVisible.value = false;
  selectedImage.value = null;
  // Re-enable body scroll when modal is closed
  document.body.style.overflow = '';
};

// Navigate between images in modal
const currentIndex = ref(0);

const navigateToImage = (direction) => {
  const index = items.value.findIndex(item => item.publicId === selectedImage.value?.publicId);
  if (index === -1) return;
  
  currentIndex.value = index;
  
  if (direction === 'next') {
    currentIndex.value = (currentIndex.value + 1) % items.value.length;
  } else if (direction === 'prev') {
    currentIndex.value = (currentIndex.value - 1 + items.value.length) % items.value.length;
  }
  
  selectedImage.value = items.value[currentIndex.value];
};

// Listen for escape key to close modal
const handleKeyDown = (event) => {
  if (!modalVisible.value) return;
  
  if (event.key === 'Escape') {
    closeModal();
  } else if (event.key === 'ArrowRight') {
    navigateToImage('next');
  } else if (event.key === 'ArrowLeft') {
    navigateToImage('prev');
  }
};

onMounted(() => {
  loadAllImages();
  window.addEventListener('keydown', handleKeyDown);
});

// Clean up event listener
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  // Ensure body scroll is re-enabled if component is unmounted while modal is open
  document.body.style.overflow = '';
});

// Watch for changes in mediaAssets
watch(() => props.mediaAssets, () => {
  loadAllImages();
}, { deep: true });
</script>

<template>
  <div class="cloudinary-masonry-gallery">
    <!-- Loading state -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p class="loading-text">Loading gallery...</p>
    </div>
    
    <!-- Empty state -->
    <div v-else-if="items.length === 0" class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="empty-icon">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
      <p class="empty-text">No images found in this gallery</p>
    </div>
    
    <!-- Masonry gallery -->
    <div v-else class="masonry-container">
      <MasonryWall 
        :items="items" 
        :column-width="columnWidth" 
        :gap="gap"
        :max-column-count="4"
      >
        <template #default="{ item }">
          <div 
            class="masonry-item"
            @click="handleImageClick(item)"
            :style="{ cursor: 'pointer' }"
          >
            <div class="image-wrapper">
              <div class="image-overlay">
                <div class="image-overlay-content">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-zoom-in">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                  </svg>
                </div>
              </div>
              <img 
                :src="item.url" 
                :alt="item.publicId"
                class="masonry-image"
                loading="lazy"
              />
            </div>
          </div>
        </template>
      </MasonryWall>
    </div>
    
    <!-- Improved Lightbox Modal -->
    <teleport to="body">
      <div 
        v-if="modalVisible && selectedImage" 
        class="modal-overlay"
        @click="closeModal"
      >
        <div class="modal-content" @click.stop>
          <!-- Navigation buttons -->
          <button class="modal-nav modal-prev" @click.stop="navigateToImage('prev')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <button class="modal-nav modal-next" @click.stop="navigateToImage('next')">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <button class="modal-close" @click.stop="closeModal">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-x">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
          
          <img 
            :src="selectedImage.originalUrl" 
            :alt="selectedImage.publicId"
            class="modal-image"
          />
          
          <!-- Image counter -->
          <div class="modal-counter">
            {{ items.findIndex(item => item.publicId === selectedImage.publicId) + 1 }} / {{ items.length }}
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<style scoped>
.cloudinary-masonry-gallery {
  width: 100%;
  position: relative;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-left-color: #60a5fa;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

.loading-text {
  color: #60a5fa;
  font-size: 1rem;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 300px;
  color: #64748b;
}

.empty-icon {
  margin-bottom: 16px;
  color: #60a5fa;
}

.empty-text {
  font-size: 1.1rem;
}

.masonry-container {
  width: 100%;
  max-width: v-bind('props.maxWidth + "px"');
  margin: 0 auto;
}

.masonry-item {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  margin-bottom: v-bind('props.gap + "px"');
  border-radius: 12px;
  overflow: hidden;
  background-color: rgba(15, 15, 15, 0.6);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.masonry-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.2);
}

.image-wrapper {
  position: relative;
  overflow: hidden;
  width: 100%;
}

.masonry-image {
  width: 100%;
  height: auto;
  display: block;
  transition: transform 0.5s ease;
}

.masonry-item:hover .masonry-image {
  transform: scale(1.05);
}

.image-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.masonry-item:hover .image-overlay {
  opacity: 1;
}

.image-overlay-content {
  color: white;
  background-color: rgba(37, 99, 235, 0.7);
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.9);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
}

.modal-content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 90vw;
  height: 90vh;
}

.modal-image {
  max-width: 90%;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
}

.modal-close {
  position: absolute;
  top: -50px;
  right: 0;
  background-color: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1001;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.modal-nav {
  position: absolute;
  background-color: rgba(0, 0, 0, 0.5);
  border: none;
  color: white;
  font-size: 1.5rem;
  cursor: pointer;
  z-index: 1001;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.3s ease, transform 0.2s ease;
}

.modal-prev {
  left: 20px;
}

.modal-next {
  right: 20px;
}

.modal-counter {
  position: absolute;
  bottom: -40px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 0.9rem;
}

.modal-close:hover,
.modal-nav:hover {
  background-color: rgba(96, 165, 250, 0.7);
  transform: scale(1.1);
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* Media queries for responsiveness */
@media (max-width: 768px) {
  .modal-content {
    width: 95vw;
  }
  
  .modal-image {
    max-width: 95%;
  }
  
  .modal-prev {
    left: 5px;
    width: 40px;
    height: 40px;
  }
  
  .modal-next {
    right: 5px;
    width: 40px;
    height: 40px;
  }
  
  .modal-close {
    top: -45px;
    right: 0;
  }
}
</style> 