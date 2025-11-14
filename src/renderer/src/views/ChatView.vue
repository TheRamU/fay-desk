<template>
  <div class="chat-view">
    <ChatHeader
      v-model="selectedModel"
      @clear-history="handleClearHistory"
      @model-changed="handleModelChanged"
    />

    <template v-if="messages.length > 0">
      <MessageList
        ref="messageListRef"
        v-model:messages="messages"
        :is-streaming="isStreaming"
        :streaming-message-index="streamingMessageIndex"
        @update:streaming-message-index="streamingMessageIndex = $event"
      />

      <ChatInput
        :disabled="!isConfigured"
        :loading="isLoading"
        :is-generating="isStreaming"
        :placeholder="inputPlaceholder"
        :autofocus="true"
        @send="handleSendMessage"
        @stop="handleStopGeneration"
      />
    </template>

    <template v-else>
      <div class="welcome-container">
        <div class="welcome-content">
          <div class="welcome-text">Hi~ 我是 <span class="fay-text">Fay</span></div>
        </div>
        <div class="welcome-input">
          <ChatInput
            :disabled="!isConfigured"
            :loading="isLoading"
            :is-generating="isStreaming"
            :placeholder="inputPlaceholder"
            :autofocus="true"
            @send="handleSendMessage"
            @stop="handleStopGeneration"
          />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { ElNotification } from 'element-plus'
import MessageList from '../components/chat/MessageList.vue'
import ChatInput from '../components/chat/ChatInput.vue'
import ChatHeader from '../components/chat/ChatHeader.vue'
import type { Message } from '@renderer/types/chat'

const messages = ref<Message[]>([])
const isLoading = ref(false)
const isStreaming = ref(false)
const isConfigured = ref(false)
const selectedModel = ref('')
const activeModel = ref('')
const messageListRef = ref<InstanceType<typeof MessageList>>()
const currentRequestId = ref('')
const streamingMessageIndex = ref(-1)

let cleanupStreamData: (() => void) | null = null
let cleanupStreamEnd: (() => void) | null = null
let cleanupStreamError: (() => void) | null = null
let cleanupStreamStopped: (() => void) | null = null
let cleanupMessageAdded: (() => void) | null = null
let cleanupMessageCompleted: (() => void) | null = null

const inputPlaceholder = computed(() => {
  if (!isConfigured.value) {
    return '请先配置 OpenAI API 密钥'
  }
  if (!selectedModel.value) {
    return '请选择模型'
  }
  return '输入消息...'
})

onMounted(async () => {
  await loadConfig()
  await loadChatHistory()
  setupStreamListeners()
  await reconnectActiveStreams()
})

onUnmounted(() => {
  cleanupStreamListeners()
})

const loadConfig = async (): Promise<void> => {
  try {
    const result = await window.api.openai.getConfig()
    isConfigured.value = result.success && !!result.config
  } catch (error) {
    console.error('加载配置失败:', error)
    isConfigured.value = false
  }
}

const loadChatHistory = async (): Promise<void> => {
  try {
    const result = await window.api.chat.getHistory()
    if (result.success && result.messages.length > 0) {
      messages.value = result.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }))
      nextTick(async () => {
        await scrollToBottom()
      })
    }
  } catch (error) {
    console.error('加载聊天历史记录失败:', error)
  }
}

const handleModelChanged = (modelId: string): void => {
  selectedModel.value = modelId
  activeModel.value = modelId
}

const setupStreamListeners = (): void => {
  cleanupStreamData = window.api.chat.onStreamData((data) => {
    if (data.requestId === currentRequestId.value) {
      if (streamingMessageIndex.value >= 0) {
        messages.value[streamingMessageIndex.value].content += data.content
        scrollToBottom()
      }
    } else {
      if (!currentRequestId.value && messages.value.length > 0) {
        const lastMessage = messages.value[messages.value.length - 1]
        if (lastMessage.role === 'assistant' && lastMessage.content === '') {
          currentRequestId.value = data.requestId
          streamingMessageIndex.value = messages.value.length - 1
          isStreaming.value = true
          isLoading.value = true
        }
      }

      if (data.requestId === currentRequestId.value && streamingMessageIndex.value >= 0) {
        messages.value[streamingMessageIndex.value].content += data.content
        scrollToBottom()
      }
    }
  })

  cleanupStreamEnd = window.api.chat.onStreamEnd((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      streamingMessageIndex.value = -1
      currentRequestId.value = ''
    }
  })

  cleanupStreamError = window.api.chat.onStreamError((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      streamingMessageIndex.value = -1
      currentRequestId.value = ''
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: `AI 响应失败: ${data.error}`
      })
      // 移除失败的消息
      if (streamingMessageIndex.value >= 0) {
        messages.value.splice(streamingMessageIndex.value, 1)
      }
    }
  })

  cleanupStreamStopped = window.api.chat.onStreamStopped((data) => {
    if (data.requestId === currentRequestId.value) {
      isLoading.value = false
      isStreaming.value = false
      streamingMessageIndex.value = -1
      currentRequestId.value = ''
    }
  })

  cleanupMessageAdded = window.api.chat.onMessageAdded((data) => {
    if (data.requestId !== currentRequestId.value) {
      const userMessage: Message = {
        role: 'user',
        content: data.message.content,
        timestamp: data.message.timestamp
      }
      messages.value.push(userMessage)

      const aiMessage: Message = {
        role: 'assistant',
        content: '',
        timestamp: Date.now()
      }
      messages.value.push(aiMessage)
      streamingMessageIndex.value = messages.value.length - 1

      currentRequestId.value = data.requestId
      isLoading.value = true
      isStreaming.value = true

      scrollToBottom()
    }
  })

  cleanupMessageCompleted = window.api.chat.onMessageCompleted((data) => {
    if (data.requestId === currentRequestId.value) {
      if (streamingMessageIndex.value >= 0) {
        messages.value[streamingMessageIndex.value].content = data.message.content
      }

      isLoading.value = false
      isStreaming.value = false
      streamingMessageIndex.value = -1
      currentRequestId.value = ''

      scrollToBottom()
    }
  })
}

const cleanupStreamListeners = (): void => {
  if (cleanupStreamData) cleanupStreamData()
  if (cleanupStreamEnd) cleanupStreamEnd()
  if (cleanupStreamError) cleanupStreamError()
  if (cleanupStreamStopped) cleanupStreamStopped()
  if (cleanupMessageAdded) cleanupMessageAdded()
  if (cleanupMessageCompleted) cleanupMessageCompleted()
}

const handleSendMessage = async (text: string): Promise<void> => {
  if (!isConfigured.value) {
    ElNotification({
      type: 'warning',
      customClass: 'warn',
      title: '请先在设置中配置 OpenAI API'
    })
    return
  }

  if (!selectedModel.value) {
    ElNotification({
      type: 'warning',
      customClass: 'warn',
      title: '请选择模型'
    })
    return
  }

  activeModel.value = selectedModel.value
  const userMessage: Message = {
    role: 'user',
    content: text,
    timestamp: Date.now()
  }
  messages.value.push(userMessage)
  await scrollToBottom()

  const aiMessage: Message = {
    role: 'assistant',
    content: '',
    timestamp: Date.now()
  }
  messages.value.push(aiMessage)
  streamingMessageIndex.value = messages.value.length - 1

  isLoading.value = true
  isStreaming.value = true

  await scrollToBottom()

  currentRequestId.value = `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  try {
    const result = await window.api.chat.stream({
      userMessage: text,
      requestId: currentRequestId.value
    })

    if (!result.success) {
      throw new Error(result.error || '发送失败')
    }
  } catch (error: unknown) {
    isLoading.value = false
    isStreaming.value = false
    streamingMessageIndex.value = -1
    currentRequestId.value = ''
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: `发送失败: ${error instanceof Error ? error.message : '未知错误'}`
    })
    messages.value.pop()
  }
}

const handleStopGeneration = async (): Promise<void> => {
  if (!currentRequestId.value) return

  try {
    await window.api.chat.stopStream(currentRequestId.value)
  } catch (error: unknown) {
    console.error('停止生成失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '停止失败'
    })
  }
}

const scrollToBottom = async (): Promise<void> => {
  if (messageListRef.value) {
    await messageListRef.value.scrollToBottom()
  }
}

const handleClearHistory = async (): Promise<void> => {
  try {
    const result = await window.api.chat.clearHistory()
    if (result.success) {
      messages.value = []
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: '清空历史记录失败'
      })
    }
  } catch (error: unknown) {
    console.error('清空历史记录失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '清空历史记录失败'
    })
  }
}

const reconnectActiveStreams = async (): Promise<void> => {
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
      const hasUserMessage = messages.value.some(
        (msg) => msg.role === 'user' && msg.content === latestStream.userMessage
      )

      if (!hasUserMessage && latestStream.userMessage) {
        const userMessage: Message = {
          role: 'user',
          content: latestStream.userMessage,
          timestamp: latestStream.startTime
        }
        messages.value.push(userMessage)
      }

      if (latestStream.accumulatedContent || !latestStream.isCompleted) {
        let targetAssistantIndex = -1
        let userMessageIndex = -1

        let closestTimeDiff = Infinity
        for (let i = 0; i < messages.value.length; i++) {
          const msg = messages.value[i]
          if (msg.role === 'user' && msg.content === latestStream.userMessage) {
            const timeDiff = Math.abs((msg.timestamp || 0) - latestStream.startTime)
            if (timeDiff < closestTimeDiff) {
              closestTimeDiff = timeDiff
              userMessageIndex = i
            }
          }
        }

        if (userMessageIndex >= 0) {
          for (let j = userMessageIndex + 1; j < messages.value.length; j++) {
            if (messages.value[j].role === 'assistant') {
              targetAssistantIndex = j
              break
            }
          }
        }

        if (targetAssistantIndex >= 0) {
          messages.value[targetAssistantIndex].content = latestStream.accumulatedContent || ''
          streamingMessageIndex.value = targetAssistantIndex
        } else if (userMessageIndex >= 0) {
          const aiMessage: Message = {
            role: 'assistant',
            content: latestStream.accumulatedContent || '',
            timestamp: Date.now()
          }
          messages.value.splice(userMessageIndex + 1, 0, aiMessage)
          streamingMessageIndex.value = userMessageIndex + 1
        } else {
          if (latestStream.userMessage) {
            const userMessage: Message = {
              role: 'user',
              content: latestStream.userMessage,
              timestamp: latestStream.startTime
            }
            messages.value.push(userMessage)
          }

          const aiMessage: Message = {
            role: 'assistant',
            content: latestStream.accumulatedContent || '',
            timestamp: Date.now()
          }
          messages.value.push(aiMessage)
          streamingMessageIndex.value = messages.value.length - 1
        }

        await scrollToBottom()
      }

      const reconnectResult = await window.api.chat.reconnectStream(latestStream.requestId)
      if (reconnectResult.success) {
        if (latestStream.isCompleted) {
          isLoading.value = false
          isStreaming.value = false
          streamingMessageIndex.value = -1
          currentRequestId.value = ''
        }
      } else {
        isLoading.value = false
        isStreaming.value = false
        streamingMessageIndex.value = -1
        currentRequestId.value = ''
      }
    }
  } catch (error) {
    isLoading.value = false
    isStreaming.value = false
    streamingMessageIndex.value = -1
    currentRequestId.value = ''
  }
}
</script>

<style scoped lang="scss">
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: #fff;
  margin-right: 20px;
  border-radius: 8px;
  overflow: hidden;
}

.welcome-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 40px;
  height: 100%;
  box-sizing: border-box;
  margin-bottom: 100px;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.welcome-text {
  font-size: 28px;
  font-weight: 400;
  color: #333;
  text-align: center;
  user-select: none;
  line-height: 1.4;

  .fay-text {
    background-image: linear-gradient(-225deg, #20e2d7 0%, #87e220 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    font-weight: 400;
  }
}

.welcome-input {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
}
</style>
