<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import CloseIcon from '@renderer/icons/CloseIcon.vue'
import MinimizeIcon from '@renderer/icons/MinimizeIcon.vue'
import MaximizeIcon from '@renderer/icons/MaximizeIcon.vue'
import RestoreIcon from '@renderer/icons/RestoreIcon.vue'
import WallpaperControls from '@renderer/components/layout/WallpaperControls.vue'

const isMaximized = ref(false)

const handleMinimize = (): void => {
  window.electron.ipcRenderer.send('window-minimize')
}

const handleMaximize = (): void => {
  window.electron.ipcRenderer.send('window-maximize')
}

const handleClose = (): void => {
  window.electron.ipcRenderer.send('window-close')
}

const handleMaximizeChange = (_event: unknown, maximized: boolean): void => {
  isMaximized.value = maximized
}

onMounted(() => {
  window.electron.ipcRenderer.on('window-maximized', handleMaximizeChange)
  window.electron.ipcRenderer.on('window-unmaximized', handleMaximizeChange)

  window.electron.ipcRenderer.send('window-is-maximized')
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('window-maximized', handleMaximizeChange)
  window.electron.ipcRenderer.removeListener('window-unmaximized', handleMaximizeChange)
})
</script>

<template>
  <div class="title-bar">
    <WallpaperControls />
    <div class="title-bar-controls">
      <div class="title-bar-button" @click="handleMinimize">
        <el-icon :size="16">
          <MinimizeIcon />
        </el-icon>
      </div>
      <div class="title-bar-button" @click="handleMaximize">
        <el-icon :size="16">
          <component :is="isMaximized ? RestoreIcon : MaximizeIcon" />
        </el-icon>
      </div>
      <div class="title-bar-button close-button" @click="handleClose">
        <el-icon :size="18">
          <CloseIcon />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.title-bar {
  display: flex;
  height: 70px;
  color: var(--el-text-color);
  user-select: none;
  position: relative;
  z-index: 1000;
  background-color: #f0f6f6;

  .title-bar-controls {
    display: flex;
    margin-right: 10px;
    align-items: center;
    -webkit-app-region: no-drag;

    .title-bar-button {
      color: var(--el-button-text-color);
      opacity: 0.5;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 100%;
      cursor: pointer;
      transition: all 0.2s;

      &:hover {
        color: var(--el-color-primary);
        opacity: 1;
      }

      &.close-button:hover {
        color: var(--el-color-danger);
      }
    }
  }
}
</style>
