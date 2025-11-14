<script setup lang="ts">
import PauseIcon from '@renderer/icons/PauseIcon.vue'
import PlayIcon from '@renderer/icons/PlayIcon.vue'
import GameIcon from '@renderer/icons/GameIcon.vue'
import { ref, onMounted, onUnmounted, computed } from 'vue'

const isWallpaperPlaying = ref(false)
const subtitleText = ref('')
const isAvatarEnabled = ref(true)
const hasXmovConfig = ref(false)
let cleanupListener: (() => void) | null = null
let subtitleOnCleanup: (() => void) | null = null
let subtitleOffCleanup: (() => void) | null = null
let avatarConfigCleanup: (() => void) | null = null
let subtitleTimer: number | null = null
const playHoverTitle = computed(() => {
  return isWallpaperPlaying.value ? '关闭壁纸' : '开启壁纸'
})

const avatarHoverTitle = computed(() => {
  if (!hasXmovConfig.value) {
    return '请先配置 Xmov SDK'
  }
  return isAvatarEnabled.value ? '数字人已开启' : '数字人已关闭'
})

const isAvatarButtonDisabled = computed(() => {
  return !hasXmovConfig.value
})

const toggleWallpaper = async (): Promise<void> => {
  if (isWallpaperPlaying.value) {
    window.api.wallpaper.stop()
  } else {
    window.api.wallpaper.start()
  }
}

const toggleAvatar = async (): Promise<void> => {
  if (isAvatarButtonDisabled.value) {
    return
  }

  try {
    const newState = !isAvatarEnabled.value
    const response = await window.api.commonSetting.toggleAvatarWithRestart(newState)

    if (response.success) {
      isAvatarEnabled.value = newState
    } else {
      console.error('切换数字人开关状态失败:', response.error)
    }
  } catch (error) {
    console.error('切换数字人状态失败:', error)
  }
}

onMounted(async () => {
  isWallpaperPlaying.value = await window.api.wallpaper.getStatus()

  try {
    const avatarResponse = await window.api.commonSetting.getAvatarEnabled()
    if (avatarResponse.success && avatarResponse.avatarEnabled !== undefined) {
      isAvatarEnabled.value = avatarResponse.avatarEnabled
    }
  } catch (error) {
    console.error('获取数字人开关状态失败:', error)
  }

  try {
    const configResponse = await window.api.avatar.getConfig()
    if (configResponse.success && configResponse.config) {
      hasXmovConfig.value = !!(configResponse.config.appId && configResponse.config.appSecret)
    } else {
      hasXmovConfig.value = false
    }
  } catch (error) {
    console.error('获取Xmov SDK配置失败:', error)
    hasXmovConfig.value = false
  }

  cleanupListener = window.api.wallpaper.onStatusChange((isRunning: boolean) => {
    isWallpaperPlaying.value = isRunning
    if (!isRunning) {
      subtitleText.value = ''
      if (subtitleTimer) {
        clearTimeout(subtitleTimer)
        subtitleTimer = null
      }
    }
  })

  subtitleOnCleanup = window.api.wallpaper.onSubtitleOn((text: string) => {
    subtitleText.value = text
    if (subtitleTimer) {
      clearTimeout(subtitleTimer)
    }
    subtitleTimer = window.setTimeout(() => {
      subtitleText.value = ''
    }, 10000)
  })

  subtitleOffCleanup = window.api.wallpaper.onSubtitleOff(() => {
    subtitleText.value = ''
    if (subtitleTimer) {
      clearTimeout(subtitleTimer)
      subtitleTimer = null
    }
  })

  avatarConfigCleanup = window.api.avatar.onConfigUpdated((data) => {
    hasXmovConfig.value = data.hasValidConfig
  })
})

onUnmounted(() => {
  if (cleanupListener) {
    cleanupListener()
    cleanupListener = null
  }
  if (subtitleOnCleanup) {
    subtitleOnCleanup()
    subtitleOnCleanup = null
  }
  if (subtitleOffCleanup) {
    subtitleOffCleanup()
    subtitleOffCleanup = null
  }
  if (avatarConfigCleanup) {
    avatarConfigCleanup()
    avatarConfigCleanup = null
  }
  if (subtitleTimer) {
    clearTimeout(subtitleTimer)
    subtitleTimer = null
  }
})
</script>

<template>
  <div class="wallpaper-controls">
    <el-icon
      class="wallpaper-play-button"
      :class="{ 'is-playing': !isWallpaperPlaying }"
      :title="playHoverTitle"
      @click="toggleWallpaper"
    >
      <component :is="isWallpaperPlaying ? PauseIcon : PlayIcon" :title="playHoverTitle" />
    </el-icon>

    <el-icon
      class="avatar-toggle-button"
      :class="{ 'is-enabled': isAvatarEnabled, 'is-disabled': isAvatarButtonDisabled }"
      :title="avatarHoverTitle"
      @click="toggleAvatar"
    >
      <GameIcon />
    </el-icon>

    <Transition name="subtitle-fade" appear>
      <div v-if="subtitleText" class="subtitle-container">
        <div class="subtitle-text" :class="{ scrolling: subtitleText.length > 60 }">
          {{ subtitleText }}
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.wallpaper-controls {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: drag;

  .wallpaper-play-button {
    -webkit-app-region: no-drag;
    cursor: pointer;
    font-size: 14px;
    color: var(--el-color-primary);
    width: 36px;
    height: 36px;
    background: white;
    border-radius: 100%;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;

    &.is-playing {
      padding-left: 2px;
    }

    &:hover {
      background: var(--el-color-primary);
      color: white;
    }
  }

  .avatar-toggle-button {
    -webkit-app-region: no-drag;
    cursor: pointer;
    font-size: 14px;
    width: 36px;
    height: 36px;
    background: white;
    border-radius: 100%;
    box-sizing: border-box;
    transition: all 0.2s ease-in-out;
    color: #999;

    &.is-enabled {
      color: var(--el-color-primary);
    }

    &:hover:not(.is-disabled) {
      background: var(--el-color-primary-light-8);
      color: var(--el-color-primary);

      &.is-enabled {
        background: var(--el-color-primary);
        color: white;
      }
    }

    &.is-disabled {
      cursor: not-allowed;
      opacity: 0.6;
    }
  }

  .subtitle-container {
    flex: 1;
    max-width: 400px;
    height: 36px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 18px;
    padding: 0 16px;
    display: flex;
    align-items: center;
    overflow: hidden;
    position: relative;
    -webkit-app-region: no-drag;

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 20px;
      background: linear-gradient(to right, rgba(255, 255, 255, 0.9), transparent);
      z-index: 2;
      pointer-events: none;
    }

    .subtitle-text {
      white-space: nowrap;
      font-size: 14px;
      color: #333;
      line-height: 1;
      transition: transform 0.3s ease;

      &.scrolling {
        animation: scrollLeft 8s linear infinite;
      }
    }
  }
}

@keyframes scrollLeft {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(calc(-100% + 200px));
  }
}

.subtitle-fade-enter-active,
.subtitle-fade-leave-active {
  transition: all 0.4s ease-in-out;
}

.subtitle-fade-enter-from {
  opacity: 0;
  transform: scale(0.95);
}

.subtitle-fade-leave-to {
  opacity: 0;
}
</style>
