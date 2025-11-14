/**
 * 聊天相关类型定义
 */

export interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp?: number
}

export interface ChatInputProps {
  disabled?: boolean
  loading?: boolean
  placeholder?: string
  isGenerating?: boolean
  autofocus?: boolean
}

export interface ChatInputEmits {
  (e: 'send', text: string): void
  (e: 'stop'): void
}

export interface MessageListProps {
  messages?: Message[]
  isStreaming?: boolean
  streamingMessageIndex?: number
}

export interface MessageListEmits {
  (e: 'update:messages', messages: Message[]): void
  (e: 'update:streamingMessageIndex', index: number): void
}

export interface MessageItemProps {
  message: Message
}

export interface ChatHeaderProps {
  modelValue?: string // 用于双向绑定当前选中的模型
}

export interface ChatHeaderEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'clear-history'): void
  (e: 'model-changed', modelId: string): void
}
