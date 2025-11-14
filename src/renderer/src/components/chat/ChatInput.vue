<template>
  <div class="chat-input-wrapper">
    <div class="chat-input-capsule">
      <button
        class="floating-button"
        :disabled="
          disabled || loading || !hasXmovConfig || !isAvatarEnabled || !hasAvailableWallpaper
        "
        :title="floatingButtonTitle"
        @click="handleToggleFloating"
      >
        <el-icon><FloatingIcon /></el-icon>
      </button>
      <input
        ref="inputRef"
        v-model="inputText"
        type="text"
        :placeholder="placeholder"
        class="input-field"
        @keydown.enter.exact.prevent="handleSend"
      />
      <button
        class="send-button"
        :disabled="!canSend && !isGenerating"
        :class="{ active: canSend || isGenerating, stopping: isGenerating }"
        @click="handleButtonClick"
      >
        <el-icon v-if="isGenerating"><StopIcon /></el-icon>
        <el-icon v-else-if="loading" class="is-loading"><Loading /></el-icon>
        <el-icon v-else><SendIcon /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Loading } from '@element-plus/icons-vue'
import { ElNotification } from 'element-plus'
import SendIcon from '@renderer/icons/SendIcon.vue'
import StopIcon from '@renderer/icons/StopIcon.vue'
import FloatingIcon from '@renderer/icons/FloatingIcon.vue'
import type { ChatInputProps, ChatInputEmits } from '@renderer/types/chat'

const props = withDefaults(defineProps<ChatInputProps>(), {
  disabled: false,
  loading: false,
  placeholder: '输入消息...',
  isGenerating: false,
  autofocus: false
})

const emit = defineEmits<ChatInputEmits>()

const inputText = ref('')
const inputRef = ref<HTMLInputElement>()
const isAvatarEnabled = ref(true)
const hasXmovConfig = ref(false)
const hasAvailableWallpaper = ref(true)
let avatarEnabledCleanup: (() => void) | null = null
let wallpaperListChangeCleanup: (() => void) | null = null

const canSend = computed(() => {
  return (
    inputText.value.trim().length > 0 && !props.disabled && !props.loading && !props.isGenerating
  )
})

const floatingButtonTitle = computed(() => {
  if (!hasXmovConfig.value) {
    return '请先配置 Xmov SDK'
  }
  if (!isAvatarEnabled.value) {
    return '请先开启数字人功能'
  }
  if (!hasAvailableWallpaper.value) {
    return '没有可用的壁纸，请先添加壁纸'
  }
  return '浮窗模式'
})

const handleSend = () => {
  if (!canSend.value) return

  const text = inputText.value.trim()
  emit('send', text)
  inputText.value = ''
}

const handleButtonClick = () => {
  if (props.isGenerating) {
    emit('stop')
  } else {
    handleSend()
  }
}

const handleToggleFloating = async () => {
  try {
    if (!hasXmovConfig.value) {
      ElNotification({
        type: 'warning',
        customClass: 'warn',
        title: '请先配置 Xmov SDK'
      })
      return
    }

    if (!isAvatarEnabled.value) {
      ElNotification({
        type: 'warning',
        customClass: 'warn',
        title: '请先开启数字人功能'
      })
      return
    }

    const wallpaperState = await window.api.wallpaper.getState()

    if (!wallpaperState.success) {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: '获取壁纸状态失败'
      })
      return
    }

    if (!wallpaperState.state?.isRunning) {
      const wallpaperList = await window.api.wallpaper.getList()

      if (!wallpaperList.success || wallpaperList.wallpapers.length === 0) {
        ElNotification({
          type: 'warning',
          customClass: 'warn',
          title: '没有可用的壁纸，请先添加壁纸后再使用浮窗模式'
        })
        return
      }

      const selectedWallpaperId =
        wallpaperState.state?.selectedWallpaperId || wallpaperList.wallpapers[0].id

      const toggleResult = await window.api.wallpaper.toggleWallpaper(selectedWallpaperId)

      if (!toggleResult.success) {
        ElNotification({
          type: 'error',
          customClass: 'error',
          title: `启动壁纸失败: ${toggleResult.error}`
        })
        return
      }
    }

    await window.api.floating.toggle()
  } catch (error) {
    console.error('切换悬浮窗失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '切换悬浮窗失败'
    })
  }
}

const checkAvailableWallpaper = async (): Promise<void> => {
  try {
    const wallpaperList = await window.api.wallpaper.getList()
    hasAvailableWallpaper.value = wallpaperList.success && wallpaperList.wallpapers.length > 0
  } catch (error) {
    console.error('检查壁纸列表失败:', error)
    hasAvailableWallpaper.value = false
  }
}

onMounted(async () => {
  try {
    const result = await window.api.commonSetting.getAvatarEnabled()
    if (result.success) {
      isAvatarEnabled.value = result.avatarEnabled ?? true
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

  await checkAvailableWallpaper()

  avatarEnabledCleanup = window.api.commonSetting.onAvatarEnabledChanged((data) => {
    isAvatarEnabled.value = data.avatarEnabled
  })

  const handleWallpaperListChange = () => {
    checkAvailableWallpaper().catch((error) => {
      console.error('检查壁纸列表失败:', error)
    })
  }
  window.addEventListener('wallpaper-list-changed', handleWallpaperListChange)
  wallpaperListChangeCleanup = () => {
    window.removeEventListener('wallpaper-list-changed', handleWallpaperListChange)
  }

  if (props.autofocus && !props.disabled) {
    inputRef.value?.focus()
  }
})

onUnmounted(() => {
  if (avatarEnabledCleanup) {
    avatarEnabledCleanup()
    avatarEnabledCleanup = null
  }
  if (wallpaperListChangeCleanup) {
    wallpaperListChangeCleanup()
    wallpaperListChangeCleanup = null
  }
})
</script>

<style scoped lang="scss">
.chat-input-wrapper {
  padding: 0 20px 20px;
  background: transparent;
  display: flex;
  justify-content: center;
}

.chat-input-capsule {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f5f5f7;
  border-radius: 50px;
  padding: 8px 12px;
  max-width: 820px;
  width: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  border: 1px solid #ddd;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    inset: -2px;
    border-radius: 50px;
    padding: 2px;
    background: linear-gradient(135deg, #ffc62a 0%, #7bed9f 100%);
    -webkit-mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask:
      linear-gradient(#fff 0 0) content-box,
      linear-gradient(#fff 0 0);
    mask-composite: exclude;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.3s ease;
  }

  &:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  }

  &:focus-within {
    border-color: transparent;

    &::before {
      opacity: 0.8;
    }

    box-shadow:
      0 0 20px rgba(255, 211, 42, 0.2),
      0 0 20px rgba(123, 237, 159, 0.3);
  }
}

.floating-button,
.send-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #333;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover:not(:disabled) {
    background: rgba(0, 0, 0, 0.06);
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .el-icon {
    font-size: 16px;
  }
}

.floating-button {
  color: #666;

  &:hover:not(:disabled) {
    color: #0acc86;
  }
}

.send-button {
  background: #333;
  color: #fff;
  width: 36px;
  height: 36px;
  transition: all 0.2s ease;

  &.active {
    background: linear-gradient(135deg, #0acc86 0%, #0acccc 100%);
    color: #fff;

    &:hover {
      background: linear-gradient(135deg, #09c07d 0%, #0acccc 100%);
    }
  }

  &.stopping {
    background: #333;
    color: #fff;

    &:hover {
      background: #1a1a1a;
    }
  }

  &:disabled {
    cursor: not-allowed;
    background: var(--el-color-primary);
    color: #fff;
  }

  .is-loading {
    animation: rotating 1s linear infinite;
  }
}

.input-field {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #333;
  font-size: 15px;
  padding: 8px 0;
  min-width: 0;

  &::placeholder {
    color: #999;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
