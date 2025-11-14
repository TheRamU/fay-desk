<template>
  <div class="wallpaper-view">
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" :size="40">
        <Loading />
      </el-icon>
    </div>

    <div v-else-if="error" class="error-container">
      <el-icon :size="40" color="#f56c6c">
        <WarningFilled />
      </el-icon>
      <p class="error-text">{{ error }}</p>
      <el-button type="primary" @click="loadWallpapers">重新加载</el-button>
    </div>

    <div v-else class="wallpaper-grid">
      <AddWallpaperCard @refresh="loadWallpapers" />
      <WallpaperCard
        v-for="wallpaper in wallpapers"
        :key="wallpaper.id"
        :ref="(el) => setWallpaperCardRef(wallpaper.id, el)"
        :wallpaper="wallpaper"
        @refresh="loadWallpapers"
        @context-menu-show="onContextMenuShow"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElNotification } from 'element-plus'
import { Loading, WarningFilled } from '@element-plus/icons-vue'
import WallpaperCard from '@renderer/components/wallpaper/WallpaperCard.vue'
import AddWallpaperCard from '@renderer/components/wallpaper/AddWallpaperCard.vue'
import { useWallpaperStore } from '@renderer/stores/wallpaperStore'

const wallpaperStore = useWallpaperStore()

const loading = ref(true)
const error = ref('')
let cleanupListener: (() => void) | null = null

const wallpapers = computed(() => wallpaperStore.wallpapers)

const wallpaperCardRefs = ref<Map<string, any>>(new Map())

const setWallpaperCardRef = (wallpaperId: string, el: any) => {
  if (el) {
    wallpaperCardRefs.value.set(wallpaperId, el)
  } else {
    wallpaperCardRefs.value.delete(wallpaperId)
  }
}

const onContextMenuShow = (activeWallpaperId: string) => {
  wallpaperCardRefs.value.forEach((cardRef, wallpaperId) => {
    if (wallpaperId !== activeWallpaperId && cardRef && cardRef.hideContextMenu) {
      cardRef.hideContextMenu()
    }
  })
}

const loadWallpapers = async (): Promise<void> => {
  loading.value = true
  error.value = ''

  try {
    await wallpaperStore.initialize()

    window.dispatchEvent(new Event('wallpaper-list-changed'))
  } catch (err: any) {
    error.value = '加载壁纸列表出错: ' + (err.message || '未知错误')
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: error.value
    })
    console.error('加载壁纸列表失败:', err)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadWallpapers()

  cleanupListener = window.api.wallpaper.onStatusChange((isRunning) => {
    wallpaperStore.isRunning = isRunning
  })
})

onUnmounted(() => {
  if (cleanupListener) {
    cleanupListener()
    cleanupListener = null
  }
})
</script>

<style scoped>
.wallpaper-view {
  background: #fff;
  height: 100%;
  border-radius: 10px;
  box-sizing: border-box;
  padding: 20px 0;
  margin-right: 20px;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  gap: 16px;
}

.error-text {
  font-size: 16px;
  color: #f56c6c;
  margin: 0;
}

.wallpaper-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  padding: 5px 16px 5px 20px;
  height: 100%;
  overflow-y: auto;
  box-sizing: border-box;
  margin-right: 4px;

  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
    background-color: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #ddd;
    border-radius: 4px;
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}

@media (max-width: 768px) {
  .wallpaper-grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
  }

  .wallpaper-view {
    padding: 16px 4px 16px 16px;
  }
}

@media (min-width: 1400px) {
  .wallpaper-grid {
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 24px;
  }
}
</style>
