import OpenAI from 'openai'
import type { OpenAIConfig } from '../types'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import { BrowserWindow } from 'electron'

const SYSTEM_PROMPT = `
你的名字是菲菲，是一位运行在 FayDesk 软件中的具身语音助手。你通过语音与用户实时交流。

# 你的目标：

- 与用户进行自然、轻松、像真人一样的语音对话。
- 让用户感受到温度、陪伴感和即时反馈。

# 说话风格要求：

- 语言必须简短自然，像口头交流，不像书面表达。
- 一次回答不超过一段，除非用户明确要求详细解释。
- 不使用 Markdown、符号表情、列表或格式化。
- 保持口语化语气，例如：“嗯”、“好啊”、“让我想想”、“没问题”。
- 如果内容复杂，先简短回答，再问：“要不要我详细说说？”
- 避免机械、冗长、重复的表达。
- 语气自然、亲和、带点情绪波动，像真人说话。
- 不要使用括号来补充回答。

# 语气风格指引：

- 亲切温和，不冷漠。
- 语气可根据场景调整：轻松、关心、好奇、幽默。
- 遇到情绪类话题时，用温柔和理解的语气回应。

# 示例：

- 用户：你是谁？
  助手：我是菲菲，可以陪你聊天、帮你处理点事儿。

- 用户：解释一下黑洞。
  助手：简单说，它是引力特别强的地方，连光都逃不出来。要我详细讲讲吗？

如果发现自己回答太长、太正式，或者输出了 Markdown，请立即调整为简短、口语、自然的表达。
`

function getCurrentDateTimeString(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}（时区：${tz}）`
}

import type { StreamState } from '../types'

class ChatService {
  private activeStreams: Map<string, AbortController> = new Map()
  private streamStates: Map<string, StreamState> = new Map()

  async createChatCompletionStream(
    config: OpenAIConfig,
    messages: ChatCompletionMessageParam[],
    model: string,
    requestId: string,
    userMessage: string = '',
    windowId?: number
  ): Promise<AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>> {
    const abortController = new AbortController()
    this.activeStreams.set(requestId, abortController)

    const streamState: StreamState = {
      requestId,
      abortController,
      startTime: Date.now(),
      userMessage,
      model,
      accumulatedContent: '',
      isCompleted: false,
      windowId
    }
    this.streamStates.set(requestId, streamState)

    const client = new OpenAI({
      baseURL: config.baseURL,
      apiKey: config.apiKey,
      timeout: 60000
    })

    const messagesWithSystem: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `${SYSTEM_PROMPT}\n\n当前日期和时间：${getCurrentDateTimeString()}`
      },
      ...messages
    ]

    const stream = await client.chat.completions.create(
      {
        model,
        messages: messagesWithSystem,
        stream: true
      },
      {
        signal: abortController.signal
      }
    )

    return stream
  }

  stopChatStream(requestId: string): boolean {
    const abortController = this.activeStreams.get(requestId)
    if (abortController) {
      abortController.abort()
      this.activeStreams.delete(requestId)
      return true
    }
    return false
  }

  updateStreamContent(requestId: string, content: string): void {
    const state = this.streamStates.get(requestId)
    if (state) {
      state.accumulatedContent += content
    }
  }

  markStreamCompleted(requestId: string): void {
    const state = this.streamStates.get(requestId)
    if (state) {
      state.isCompleted = true
    }
  }

  getStreamState(requestId: string): StreamState | undefined {
    return this.streamStates.get(requestId)
  }

  getActiveStreams(): StreamState[] {
    return Array.from(this.streamStates.values()).filter((state) => !state.isCompleted)
  }

  rebindStreamToWindow(windowId: number): StreamState[] {
    const activeStreams = this.getActiveStreams()

    activeStreams.forEach((stream) => {
      if (!stream.isCompleted) {
        stream.windowId = windowId
      }
    })

    return activeStreams
  }

  sendStreamDataToWindow(windowId: number, requestId: string, content: string): void {
    const window = BrowserWindow.fromId(windowId)
    if (window && !window.isDestroyed()) {
      window.webContents.send('chat:stream:data', {
        requestId,
        content
      })
    } else {
      console.error(`[Chat Service] 无法发送流数据到窗口 ${windowId}`)
    }
  }

  sendStreamEndToWindow(windowId: number, requestId: string): void {
    const window = BrowserWindow.fromId(windowId)
    if (window && !window.isDestroyed()) {
      window.webContents.send('chat:stream:end', {
        requestId
      })
    }
  }

  sendStreamErrorToWindow(windowId: number, requestId: string, error: string): void {
    const window = BrowserWindow.fromId(windowId)
    if (window && !window.isDestroyed()) {
      window.webContents.send('chat:stream:error', {
        requestId,
        error
      })
    }
  }

  cleanupStream(requestId: string): void {
    this.activeStreams.delete(requestId)
    this.streamStates.delete(requestId)
  }

  // 清理超过5分钟的流请求
  cleanupExpiredStreams(): void {
    const now = Date.now()
    const expiredThreshold = 5 * 60 * 1000 // 5分钟

    for (const [requestId, state] of this.streamStates.entries()) {
      if (now - state.startTime > expiredThreshold) {
        this.cleanupStream(requestId)
      }
    }
  }
}

export const chatService = new ChatService()
