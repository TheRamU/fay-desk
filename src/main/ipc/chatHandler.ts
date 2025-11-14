import { ipcMain, BrowserWindow } from 'electron'
import { openaiConfigService } from '../services/openaiConfigService'
import { chatService } from '../services/chatService'
import { chatHistoryService } from '../services/chatHistoryService'
import { chatConfigService } from '../services/chatConfigService'
import type { ChatMessage, ChatConfig } from '../types'
import { wallpaperService } from '../services/wallpaperService'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

function broadcastToAllWindows(channel: string, data: any): void {
  BrowserWindow.getAllWindows().forEach((window) => {
    if (!window.isDestroyed()) {
      window.webContents.send(channel, data)
    }
  })
}

// 处理历史消息：去重和按对话轮数截取
// 去重规则：连续相同角色的消息只保留最后一条
// 截取规则：从最新消息向前计算，一轮 = 一个用户消息 + 一个助手消息
function processHistoryMessages(messages: ChatMessage[], maxCount: number): ChatMessage[] {
  if (maxCount === 0) {
    return []
  }

  const deduplicatedMessages: ChatMessage[] = []
  for (let i = 0; i < messages.length; i++) {
    const currentMessage = messages[i]
    const nextMessage = messages[i + 1]
    if (nextMessage && currentMessage.role === nextMessage.role) {
      continue
    }
    deduplicatedMessages.push(currentMessage)
  }

  const result: ChatMessage[] = []
  let conversationCount = 0
  let expectingRole: 'user' | 'assistant' | null = null

  for (let i = deduplicatedMessages.length - 1; i >= 0 && conversationCount < maxCount; i--) {
    const message = deduplicatedMessages[i]

    if (expectingRole === null) {
      result.unshift(message)
      if (message.role === 'assistant') {
        expectingRole = 'user'
      } else if (message.role === 'user') {
        conversationCount++
        expectingRole = 'assistant'
      }
    } else if (message.role === expectingRole) {
      result.unshift(message)
      if (expectingRole === 'user') {
        conversationCount++
        expectingRole = 'assistant'
      } else {
        expectingRole = 'user'
      }
    } else {
      break
    }
  }

  return result
}

export function registerChatHandlers(): void {
  ipcMain.handle(
    'chat:stream',
    async (
      event,
      data: {
        userMessage: string
        requestId: string
      }
    ) => {
      try {
        const config = openaiConfigService.get()
        if (!config || !openaiConfigService.isValid(config)) {
          return { success: false, error: '请先配置 OpenAI API' }
        }

        const selectedModelData = openaiConfigService.getSelectedModel()
        if (!selectedModelData) {
          return { success: false, error: '请先选择模型' }
        }

        const sender = BrowserWindow.fromWebContents(event.sender)
        if (!sender) {
          return { success: false, error: '无法获取窗口' }
        }
        const windowId = sender.id

        const userChatMessage: ChatMessage = {
          role: 'user',
          content: data.userMessage,
          timestamp: Date.now()
        }
        chatHistoryService.addMessage(userChatMessage)

        broadcastToAllWindows('chat:message:added', {
          message: userChatMessage,
          requestId: data.requestId
        })

        const chatConfig = chatConfigService.get()
        const maxHistoryCount = chatConfig.historyMessageCount
        const allHistoryMessages = chatHistoryService.getHistory()

        // 需要多携带一轮，因为其中一轮是用户新发送的消息
        const processedMessages = processHistoryMessages(allHistoryMessages, maxHistoryCount + 1)

        const chatMessages: ChatCompletionMessageParam[] = processedMessages
          .filter((msg) => msg.content.trim() !== '')
          .map((msg) => ({
            role: msg.role,
            content: msg.content
          }))

        const shouldSendToAvatar =
          wallpaperService.isRunning() && wallpaperService.isAvatarConnected()

        if (shouldSendToAvatar) {
          wallpaperService.interactiveIdle().catch((error) => {
            console.error('[Chat IPC] 打断播报失败:', error)
          })
        }

        const stream = await chatService.createChatCompletionStream(
          config,
          chatMessages,
          selectedModelData,
          data.requestId,
          data.userMessage,
          windowId
        )

        broadcastToAllWindows('chat:stream:started', {
          requestId: data.requestId,
          userMessage: data.userMessage
        })

        let assistantMessage = ''
        let isFirstChunk = true
        let pendingText = ''
        const FIRST_CHUNK_MIN_LENGTH = 20
        const sentenceSeparators = /[。！？；,.!?;]/g

        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              assistantMessage += content
              pendingText += content

              chatService.updateStreamContent(data.requestId, content)
              broadcastToAllWindows('chat:stream:data', {
                requestId: data.requestId,
                content
              })

              if (shouldSendToAvatar) {
                if (isFirstChunk && pendingText.length >= FIRST_CHUNK_MIN_LENGTH) {
                  wallpaperService.speakStream(pendingText, true, false).catch((error) => {
                    console.error('[Chat IPC] 数字人首次播报失败:', error)
                  })
                  pendingText = ''
                  isFirstChunk = false
                } else if (!isFirstChunk) {
                  const lastChar = content[content.length - 1]
                  if (sentenceSeparators.test(lastChar) && pendingText.length > 0) {
                    wallpaperService.speakStream(pendingText, false, false).catch((error) => {
                      console.error('[Chat IPC] 数字人流式播报失败:', error)
                    })
                    pendingText = ''
                  }
                }
              }
            }
          }

          if (shouldSendToAvatar && pendingText.length > 0) {
            wallpaperService.speakStream(pendingText, isFirstChunk, true).catch((error) => {
              console.error('[Chat IPC] 数字人最后一段播报失败:', error)
            })
          } else if (shouldSendToAvatar && assistantMessage.length > 0) {
            wallpaperService.speakStream('', false, true).catch((error) => {
              console.error('[Chat IPC] 数字人结束标记发送失败:', error)
            })
          }

          if (assistantMessage.trim()) {
            const assistantChatMessage: ChatMessage = {
              role: 'assistant',
              content: assistantMessage,
              timestamp: Date.now()
            }
            chatHistoryService.addMessage(assistantChatMessage)

            broadcastToAllWindows('chat:message:completed', {
              message: assistantChatMessage,
              requestId: data.requestId
            })
          }

          chatService.markStreamCompleted(data.requestId)
          broadcastToAllWindows('chat:stream:end', {
            requestId: data.requestId
          })
          chatService.cleanupStream(data.requestId)

          return {
            success: true
          }
        } catch (streamError: any) {
          if (streamError.name === 'AbortError' || streamError.code === 'ABORT_ERR') {
            broadcastToAllWindows('chat:stream:stopped', { requestId: data.requestId })
            chatService.cleanupStream(data.requestId)
            return { success: true }
          }
          throw streamError
        }
      } catch (error: any) {
        console.error('[Chat IPC] 流式聊天失败:', error)
        chatService.cleanupStream(data.requestId)
        broadcastToAllWindows('chat:stream:error', {
          requestId: data.requestId,
          error: error.message || '未知错误'
        })
        return { success: false, error: error.message || '未知错误' }
      }
    }
  )

  ipcMain.handle('chat:stopStream', async (_event, requestId: string) => {
    try {
      if (!requestId || requestId.trim() === '') {
        return { success: false, error: '请求ID不能为空' }
      }
      const success = chatService.stopChatStream(requestId)
      return { success, error: success ? null : '未找到活动的流请求' }
    } catch (error: any) {
      console.error('[Chat IPC] 停止流式聊天失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:getHistory', async () => {
    try {
      const messages = chatHistoryService.getHistory()
      return { success: true, messages }
    } catch (error: any) {
      console.error('[Chat IPC] 获取历史记录失败:', error)
      return { success: false, error: error.message || '未知错误', messages: [] }
    }
  })

  ipcMain.handle('chat:saveHistory', async (_event, messages: ChatMessage[]) => {
    try {
      const success = chatHistoryService.saveHistory(messages)
      return { success, error: success ? null : '保存失败' }
    } catch (error: any) {
      console.error('[Chat IPC] 保存历史记录失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:addMessage', async (_event, message: ChatMessage) => {
    try {
      const success = chatHistoryService.addMessage(message)
      return { success, error: success ? null : '添加消息失败' }
    } catch (error: any) {
      console.error('[Chat IPC] 添加消息失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:clearHistory', async () => {
    try {
      const success = chatHistoryService.clearHistory()
      return { success, error: success ? null : '清空失败' }
    } catch (error: any) {
      console.error('[Chat IPC] 清空历史记录失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:getActiveStreams', async (event) => {
    try {
      const sender = BrowserWindow.fromWebContents(event.sender)
      if (!sender) {
        return { success: false, error: '无法获取窗口', streams: [] }
      }
      const windowId = sender.id
      const activeStreams = chatService.rebindStreamToWindow(windowId)
      return {
        success: true,
        streams: activeStreams.map((state) => ({
          requestId: state.requestId,
          userMessage: state.userMessage,
          model: state.model,
          accumulatedContent: state.accumulatedContent,
          startTime: state.startTime,
          isCompleted: state.isCompleted
        }))
      }
    } catch (error: any) {
      console.error('[Chat IPC] 获取活动流失败:', error)
      return { success: false, error: error.message || '未知错误', streams: [] }
    }
  })

  ipcMain.handle('chat:reconnectStream', async (event, requestId: string) => {
    try {
      const sender = BrowserWindow.fromWebContents(event.sender)
      if (!sender) {
        return { success: false, error: '无法获取窗口' }
      }
      const windowId = sender.id
      const streamState = chatService.getStreamState(requestId)
      if (!streamState) {
        return { success: false, error: '流式请求不存在或已完成' }
      }
      if (streamState.isCompleted) {
        sender.webContents.send('chat:stream:end', { requestId })
        return { success: true, message: '流已完成' }
      }
      streamState.windowId = windowId
      return {
        success: true,
        message: '重连成功',
        accumulatedContent: streamState.accumulatedContent
      }
    } catch (error: any) {
      console.error('[Chat IPC] 重连流失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:getConfig', async () => {
    try {
      const config = chatConfigService.get()
      return { success: true, config }
    } catch (error: any) {
      console.error('[Chat IPC] 获取聊天配置失败:', error)
      return { success: false, error: error.message || '未知错误', config: null }
    }
  })

  ipcMain.handle('chat:saveConfig', async (_event, config: ChatConfig) => {
    try {
      const success = chatConfigService.save(config)
      return { success, error: success ? null : '保存失败' }
    } catch (error: any) {
      console.error('[Chat IPC] 保存聊天配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:updateConfig', async (_event, partialConfig: Partial<ChatConfig>) => {
    try {
      const success = chatConfigService.update(partialConfig)
      return { success, error: success ? null : '更新失败' }
    } catch (error: any) {
      console.error('[Chat IPC] 更新聊天配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  ipcMain.handle('chat:resetConfig', async () => {
    try {
      const success = chatConfigService.reset()
      return { success, error: success ? null : '重置失败' }
    } catch (error: any) {
      console.error('[Chat IPC] 重置聊天配置失败:', error)
      return { success: false, error: error.message || '未知错误' }
    }
  })

  // 定期清理超时的流请求（每分钟一次）
  setInterval(() => {
    chatService.cleanupExpiredStreams()
  }, 60000)
}
