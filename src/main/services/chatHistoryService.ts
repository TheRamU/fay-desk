import { secureConfigService } from './secureConfigService'
import type { ChatMessage, ChatHistoryData } from '../types'

const CHAT_HISTORY_KEY = 'chat_history'

class ChatHistoryService {
  private readonly MAX_CONVERSATION_ROUNDS = 110

  // 按对话轮数限制历史记录（一轮 = 一个用户消息 + 一个助手消息）
  private limitHistoryToMaxRounds(messages: ChatMessage[]): ChatMessage[] {
    if (messages.length === 0) {
      return messages
    }

    const result: ChatMessage[] = []
    let conversationRounds = 0
    let currentRound: ChatMessage[] = []
    let lastRole: 'user' | 'assistant' | null = null

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i]

      if (lastRole !== null && message.role !== lastRole) {
        result.unshift(...currentRound.reverse())
        conversationRounds++

        if (conversationRounds >= this.MAX_CONVERSATION_ROUNDS) {
          break
        }

        currentRound = [message]
      } else {
        currentRound.push(message)
      }

      lastRole = message.role
    }

    if (conversationRounds < this.MAX_CONVERSATION_ROUNDS && currentRound.length > 0) {
      result.unshift(...currentRound.reverse())
      conversationRounds++
    }

    return result
  }

  getHistory(): ChatMessage[] {
    try {
      const data = secureConfigService.get<ChatHistoryData>(CHAT_HISTORY_KEY)
      if (data && data.messages) {
        return data.messages
      }
      return []
    } catch (error) {
      console.error('[Chat History] 获取历史记录失败:', error)
      return []
    }
  }

  saveHistory(messages: ChatMessage[]): boolean {
    try {
      const data: ChatHistoryData = {
        messages,
        lastUpdated: Date.now()
      }
      const success = secureConfigService.set(CHAT_HISTORY_KEY, data)
      return success
    } catch (error) {
      console.error('[Chat History] 保存历史记录失败:', error)
      return false
    }
  }

  addMessage(message: ChatMessage): boolean {
    try {
      const messages = this.getHistory()
      messages.push(message)
      const limitedMessages = this.limitHistoryToMaxRounds(messages)
      return this.saveHistory(limitedMessages)
    } catch (error) {
      console.error('[Chat History] 添加消息失败:', error)
      return false
    }
  }

  clearHistory(): boolean {
    try {
      const success = secureConfigService.delete(CHAT_HISTORY_KEY)
      return success
    } catch (error) {
      console.error('[Chat History] 清空历史记录失败:', error)
      return false
    }
  }

  getRecentMessages(count: number): ChatMessage[] {
    try {
      const messages = this.getHistory()
      return messages.slice(-count)
    } catch (error) {
      console.error('[Chat History] 获取最近消息失败:', error)
      return []
    }
  }
}

export const chatHistoryService = new ChatHistoryService()
