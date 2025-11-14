<template>
  <div class="message-item" :class="{ 'message-user': isUser, 'message-ai': !isUser }">
    <div class="message-content">
      <div class="message-text">{{ message.content }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { MessageItemProps } from '@renderer/types/chat'

const props = defineProps<MessageItemProps>()

const isUser = props.message.role === 'user'
</script>

<style scoped lang="scss">
.message-item {
  display: flex;
  margin-bottom: 16px;
  animation: fadeIn 0.3s ease-in;
  user-select: text;

  &.message-user {
    justify-content: flex-end;

    .message-content {
      background: var(--el-color-primary);
      color: #fff;
      border-radius: 15px 12px 4px 12px;
    }
  }

  &.message-ai {
    justify-content: flex-start;

    .message-content {
      background: #f0f8f8;
      color: #333;
      border-radius: 12px 12px 12px 4px;
    }
  }
}

.message-content {
  max-width: 70%;
  padding: 12px 16px;
  word-wrap: break-word;
  word-break: break-word;
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
