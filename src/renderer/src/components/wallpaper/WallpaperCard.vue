<template>
  <div class="wallpaper-card">
    <div
      class="card-cover"
      :class="{ selected: isSelected }"
      @click="onCardClick"
      @contextmenu="onRightClick"
    >
      <div v-if="imageLoading || imageError" class="cover-placeholder"></div>
      <img
        v-show="!imageLoading && !imageError"
        :src="coverUrl"
        alt="壁纸封面"
        class="cover-image"
        @load="onImageLoad"
        @error="onImageError"
      />
      <div class="hover-overlay">
        <component :is="isRunning ? PauseIcon : PlayIcon" class="play-icon" />
      </div>
    </div>
    <div class="wallpaper-name" :title="wallpaper.name">{{ wallpaper.name }}</div>
    <div
      v-if="showContextMenu"
      class="context-menu"
      :style="{ left: contextMenuX + 'px', top: contextMenuY + 'px' }"
      @click.stop
    >
      <div class="menu-item" @click="onPlayStopClick">
        <span>{{ isRunning ? '停止' : '播放' }}</span>
      </div>
      <div class="menu-item danger-item" @click="onDeleteClick">
        <span>删除</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, onUnmounted } from 'vue'
import { ElMessageBox, ElNotification } from 'element-plus'
import PlayIcon from '@renderer/icons/PlayIcon.vue'
import PauseIcon from '@renderer/icons/PauseIcon.vue'
import { useWallpaperStore } from '@renderer/stores/wallpaperStore'
import type { WallpaperCardProps, WallpaperCardEmits } from '@renderer/types/common'

const props = defineProps<WallpaperCardProps>()
const emit = defineEmits<WallpaperCardEmits>()
const wallpaperStore = useWallpaperStore()

const isSelected = computed(() => wallpaperStore.isSelected(props.wallpaper.id))
const isRunning = computed(() => wallpaperStore.isWallpaperRunning(props.wallpaper.id))

const imageLoading = ref(true)
const imageError = ref(false)
const coverUrl = ref('')
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)

const onImageLoad = () => {
  imageLoading.value = false
  imageError.value = false
}

const onImageError = () => {
  imageLoading.value = false
  imageError.value = true
}

const onCardClick = async () => {
  if (isSelected.value) {
    await wallpaperStore.toggleWallpaper(props.wallpaper.id)
  } else {
    await wallpaperStore.switchWallpaper(props.wallpaper.id)
  }
}

const loadCover = async () => {
  if (!props.wallpaper.coverPath) {
    imageError.value = true
    imageLoading.value = false
    return
  }

  try {
    imageLoading.value = true
    imageError.value = false
    const response = await window.api.wallpaper.getCover(props.wallpaper.id)

    if (response.success && response.data) {
      coverUrl.value = response.data
    } else {
      console.error('加载封面失败:', response.error)
      imageError.value = true
      imageLoading.value = false
    }
  } catch (error) {
    console.error('加载封面出错:', error)
    imageError.value = true
    imageLoading.value = false
  }
}

const onRightClick = (event: MouseEvent) => {
  event.preventDefault()
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  showContextMenu.value = true
  emit('context-menu-show', props.wallpaper.id)
}

const hideContextMenu = () => {
  showContextMenu.value = false
}

defineExpose({
  hideContextMenu
})

const onPlayStopClick = async () => {
  showContextMenu.value = false

  try {
    if (isSelected.value) {
      await wallpaperStore.toggleWallpaper(props.wallpaper.id)
    } else {
      await wallpaperStore.switchWallpaper(props.wallpaper.id)
    }
  } catch (error) {
    console.error('切换壁纸状态失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '操作失败'
    })
  }
}

const onDeleteClick = async () => {
  showContextMenu.value = false

  try {
    await ElMessageBox.confirm(
      `确定要删除壁纸 "${props.wallpaper.name}" 吗？此操作不可撤销`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger'
      }
    )

    const result = await window.api.wallpaper.deleteWallpaper(props.wallpaper.id)

    if (result.success) {
      emit('refresh')
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: result.error || '删除失败'
      })
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除壁纸失败:', error)
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: '删除壁纸失败'
      })
    }
  }
}

onMounted(() => {
  loadCover()
  document.addEventListener('click', hideContextMenu)
})

onUnmounted(() => {
  document.removeEventListener('click', hideContextMenu)
})
</script>

<style scoped lang="scss">
.wallpaper-card {
  cursor: pointer;
}

.card-cover {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 宽高比 */
  background: #e0e0e0;
  overflow: hidden;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.card-cover.selected {
  box-shadow:
    0 0 0 3px var(--el-color-primary-light-3),
    0 1px 12px rgba(10, 204, 134, 0.4);
}

.cover-placeholder {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, #d0d0d0 0%, #e0e0e0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.cover-image {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: all 0.3s ease;
}

.card-cover:hover .cover-image {
  filter: brightness(0.6);
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1;
}

.card-cover:hover .hover-overlay {
  opacity: 1;
}

.play-icon {
  width: 32px;
  height: 32px;
  color: white;
  transition: transform 0.2s ease;
}

.card-cover:hover .play-icon {
  transform: scale(1.15);
}

.wallpaper-name {
  margin-top: 8px;
  font-size: 14px;
  color: #333;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.context-menu {
  position: fixed;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  z-index: 9999;
  min-width: 120px;
  padding: 4px 0;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 8px 16px;
  cursor: pointer;
  font-size: 14px;
  color: #606266;
  transition: background-color 0.3s;

  &:hover {
    background-color: #f5f7fa;
  }

  .el-icon {
    margin-right: 8px;
    font-size: 16px;
  }

  span {
    flex: 1;
  }

  &.danger-item {
    color: #f56c6c;

    &:hover {
      color: #f56c6c !important;
      background-color: #fef0f0 !important;
    }

    .el-icon {
      color: #f56c6c;
    }
  }
}
</style>
