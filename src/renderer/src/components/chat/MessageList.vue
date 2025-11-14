<template>
  <div ref="messagesContainer" class="chat-messages-container">
    <div class="chat-messages">
      <div v-if="messages.length === 0" class="empty-state">
        <el-empty description="开始与AI对话吧！" />
      </div>
      <MessageItem v-for="(msg, index) in filteredMessages" :key="index" :message="msg" />
      <div v-if="shouldShowTypingIndicator" class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import MessageItem from './MessageItem.vue'
import type { Message, MessageListProps, MessageListEmits } from '@renderer/types/chat'

const props = withDefaults(defineProps<MessageListProps>(), {
  messages: () => [],
  isStreaming: false,
  streamingMessageIndex: -1
})

const emit = defineEmits<MessageListEmits>()

const messagesContainer = ref<HTMLElement>()

const filteredMessages = computed(() => {
  return props.messages.filter((msg) => {
    if (msg.role === 'user') {
      return true
    }
    return msg.content.trim() !== ''
  })
})

const shouldShowTypingIndicator = computed(() => {
  if (!props.isStreaming || props.streamingMessageIndex < 0) {
    return false
  }

  const streamingMessage = props.messages[props.streamingMessageIndex]
  return streamingMessage && streamingMessage.content.trim() === ''
})

const scrollToBottom = async (): Promise<void> => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const updateMessages = (newMessages: Message[]): void => {
  emit('update:messages', newMessages)
}

const updateStreamingMessageIndex = (index: number): void => {
  emit('update:streamingMessageIndex', index)
}

const addMessage = (message: Message): void => {
  const newMessages = [...props.messages, message]
  emit('update:messages', newMessages)
}

const updateMessageContent = (index: number, content: string): void => {
  if (index >= 0 && index < props.messages.length) {
    const newMessages = [...props.messages]
    newMessages[index] = { ...newMessages[index], content }
    emit('update:messages', newMessages)
  }
}

const removeMessage = (index: number): void => {
  if (index >= 0 && index < props.messages.length) {
    const newMessages = [...props.messages]
    newMessages.splice(index, 1)
    emit('update:messages', newMessages)
  }
}

const insertMessage = (index: number, message: Message): void => {
  const newMessages = [...props.messages]
  newMessages.splice(index, 0, message)
  emit('update:messages', newMessages)
}

const clearMessages = (): void => {
  emit('update:messages', [])
}

defineExpose({
  scrollToBottom,
  updateMessages,
  updateStreamingMessageIndex,
  addMessage,
  updateMessageContent,
  removeMessage,
  insertMessage,
  clearMessages
})
</script>

<style scoped lang="scss">
.chat-messages-container {
  flex: 1;
  padding: 20px 30px 20px 40px;
  overflow-y: auto;
  width: calc(100% - 5px);
  box-sizing: border-box;
  background: #fff;
  margin-right: 5px;

  &::-webkit-scrollbar {
    width: 4px;
  }

  &::-webkit-scrollbar-thumb {
    background: #ddd;
    border-radius: 3px;

    &:hover {
      background: #ccc;
    }
  }
}

.chat-messages {
  max-width: 800px;
  margin: 0 auto;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  margin-bottom: 16px;

  span {
    width: 8px;
    height: 8px;
    background: #999;
    border-radius: 50%;
    animation: typing 1.4s infinite;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-10px);
  }
}
</style>
