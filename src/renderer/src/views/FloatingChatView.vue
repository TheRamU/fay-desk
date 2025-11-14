<template>
  <div class="floating-chat-view">
    <div class="floating-input-container">
      <button class="floating-close-button" title="关闭浮窗" @click="handleClose">
        <el-icon><CloseIcon /></el-icon>
      </button>
      <input
        ref="inputEl"
        v-model="inputText"
        type="text"
        :placeholder="inputPlaceholder"
        class="floating-input"
        @keydown.enter.exact.prevent="handleSend"
      />
      <button
        class="floating-send-button"
        :disabled="!canSend && !isStreaming"
        :class="{ active: canSend || isStreaming, stopping: isStreaming }"
        @click="handleButtonClick"
      >
        <el-icon v-if="isStreaming"><StopIcon /></el-icon>
        <el-icon v-else-if="isLoading" class="is-loading"><LoadingIcon /></el-icon>
        <el-icon v-else><SendIcon /></el-icon>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElNotification } from 'element-plus'
import { Loading as LoadingIcon } from '@element-plus/icons-vue'
import SendIcon from '@renderer/icons/SendIcon.vue'
import StopIcon from '@renderer/icons/StopIcon.vue'
import CloseIcon from '@renderer/icons/CloseIcon.vue'

const inputText = ref('')
const isLoading = ref(false)
const isStreaming = ref(false)
const isConfigured = ref(false)
const selectedModel = ref('')
const currentRequestId = ref('')

const inputEl = ref<HTMLInputElement | null>(null)
let cleanupStreamData: (() => void) | null = null
let cleanupStreamEnd: (() => void) | null = null
let cleanupStreamError: (() => void) | null = null
let cleanupStreamStopped: (() => void) | null = null
let cleanupMessageAdded: (() => void) | null = null
let cleanupMessageCompleted: (() => void) | null = null

const inputPlaceholder = computed(() => {
  if (!isConfigured.value) {
    return '请先配置 OpenAI API'
  }
  if (!selectedModel.value) {
    return '请选择模型'
  }
  return '输入消息...'
})

const canSend = computed(() => {
  return (
    inputText.value.trim().length > 0 &&
    isConfigured.value &&
    selectedModel.value &&
    !isLoading.value &&
    !isStreaming.value
  )
})

onMounted(async () => {
  await loadConfig()
  setupStreamListeners()
  await reconnectActiveStreams()
})

onUnmounted(() => {
  cleanupStreamListeners()
})

const loadConfig = async () => {
  try {
    const result = await window.api.openai.getConfig()
    isConfigured.value = result.success && !!result.config

    if (isConfigured.value) {
      const modelResult = await window.api.openai.getSelectedModel()
      selectedModel.value = modelResult.success ? modelResult.selectedModel || '' : ''
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    isConfigured.value = false
  }
}

const setupStreamListeners = () => {
  cleanupStreamData = window.api.chat.onStreamData((data) => {
    if (data.requestId === currentRequestId.value) {
    }
  })

  cleanupStreamEnd = window.api.chat.onStreamEnd((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      currentRequestId.value = ''
    }
  })

  cleanupStreamError = window.api.chat.onStreamError((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      currentRequestId.value = ''
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: `AI 响应失败: ${data.error}`
      })
    }
  })

  cleanupStreamStopped = window.api.chat.onStreamStopped((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      currentRequestId.value = ''
    }
  })

  cleanupMessageAdded = window.api.chat.onMessageAdded((data) => {
    if (data.requestId !== currentRequestId.value) {
      currentRequestId.value = data.requestId
      isLoading.value = true
      isStreaming.value = true
    }
  })

  cleanupMessageCompleted = window.api.chat.onMessageCompleted((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      currentRequestId.value = ''
    }
  })
}

const cleanupStreamListeners = () => {
  if (cleanupStreamData) cleanupStreamData()
  if (cleanupStreamEnd) cleanupStreamEnd()
  if (cleanupStreamError) cleanupStreamError()
  if (cleanupStreamStopped) cleanupStreamStopped()
  if (cleanupMessageAdded) cleanupMessageAdded()
  if (cleanupMessageCompleted) cleanupMessageCompleted()
}

const handleSend = async () => {
  if (!canSend.value) return

  const text = inputText.value.trim()

  inputText.value = ''

  isLoading.value = true
  isStreaming.value = true

  currentRequestId.value = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const result = await window.api.chat.stream({
      userMessage: text,
      requestId: currentRequestId.value
    })

    if (!result.success) {
      throw new Error(result.error || '发送失败')
    }
  } catch (error: any) {
    isLoading.value = false
    isStreaming.value = false
    currentRequestId.value = ''
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: `发送失败: ${error.message || '未知错误'}`
    })
  }
}

const handleStopGeneration = async () => {
  if (!currentRequestId.value) return

  try {
    await window.api.chat.stopStream(currentRequestId.value)
  } catch (error: any) {
    console.error('停止生成失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '停止失败'
    })
  }
}

const handleButtonClick = () => {
  if (isStreaming.value) {
    handleStopGeneration()
  } else {
    handleSend()
  }
}

const reconnectActiveStreams = async () => {
  try {
    const result = await window.api.chat.getActiveStreams()

    if (result.success && result.streams.length > 0) {
      const latestStream = result.streams.reduce((latest, current) =>
        current.startTime > latest.startTime ? current : latest
      )

      // 设置当前请求状态
      currentRequestId.value = latestStream.requestId
      isLoading.value = true
      isStreaming.value = !latestStream.isCompleted
      const reconnectResult = await window.api.chat.reconnectStream(latestStream.requestId)
      if (reconnectResult.success) {
        if (latestStream.isCompleted) {
          isLoading.value = false
          isStreaming.value = false
          currentRequestId.value = ''
        }
      } else {
        isLoading.value = false
        isStreaming.value = false
        currentRequestId.value = ''
      }
    }
  } catch (error) {
    isLoading.value = false
    isStreaming.value = false
    currentRequestId.value = ''
  }
}

const handleClose = async () => {
  try {
    await window.api.floating.toggle()
  } catch (error) {
    console.error('关闭悬浮窗失败:', error)
  }
}

onMounted(() => {
  inputEl.value?.focus()
})
</script>

<style lang="scss">
body:has(.floating-chat-view) {
  overflow: hidden !important;
  background: transparent !important;
}

html:has(.floating-chat-view) {
  overflow: hidden !important;
  background: transparent !important;
}
</style>

<style scoped lang="scss">
.floating-chat-view {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  padding: 20px;
  -webkit-app-region: drag;
  overflow: hidden;
  box-sizing: border-box;
  background: transparent;
}

.floating-input-container {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(15px);
  border-radius: 50px;
  padding: 8px 12px;
  width: 100%;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.3);
  position: relative;
  transition: all 0.3s ease;

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

.floating-close-button {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: #666;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s ease;
  flex-shrink: 0;
  -webkit-app-region: no-drag;

  &:hover {
    background: rgba(0, 0, 0, 0.06);
    color: #ff4d4f;
  }

  .el-icon {
    font-size: 16px;
  }
}

.floating-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #333;
  font-size: 14px;
  padding: 8px 0;
  min-width: 0;
  -webkit-app-region: no-drag;

  &::placeholder {
    color: #999;
  }
}

.floating-send-button {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #333;
  border: none;
  cursor: pointer;
  color: #fff;
  padding: 8px;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  -webkit-app-region: no-drag;

  &.active {
    background: linear-gradient(135deg, #0acc86 0%, #0acccc 100%);

    &:hover {
      background: linear-gradient(135deg, #09c07d 0%, #0acccc 100%);
    }
  }

  &.stopping {
    background: #333;

    &:hover {
      background: #1a1a1a;
    }
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    background: var(--el-color-primary);
    color: #fff;
  }

  .el-icon {
    font-size: 16px;
  }

  .is-loading {
    animation: rotating 1s linear infinite;
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
