export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface ChatHistoryData {
  messages: ChatMessage[]
  lastUpdated: number
}
