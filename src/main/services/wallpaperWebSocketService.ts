import { WebSocketServer, WebSocket } from 'ws'
import type { Server } from 'http'
import { createServer } from 'http'
import { BrowserWindow } from 'electron'
import type { WSMessage } from '../types'

class WallpaperWebSocketService {
  private wss: WebSocketServer | null = null
  private server: Server | null = null
  private client: WebSocket | null = null
  private port: number = 0
  private messageHandlers: Map<string, (result: any) => void> = new Map()
  private messageIdCounter = 0

  async start(startPort: number = 9300, endPort: number = 9400): Promise<number> {
    if (this.wss) {
      return this.port
    }

    for (let port = startPort; port <= endPort; port++) {
      try {
        await this.tryStartServer(port)
        this.port = port
        return port
      } catch (error) {
        if (port === endPort) {
          throw new Error(`无法在端口范围 ${startPort}-${endPort} 内启动 WebSocket 服务`)
        }
      }
    }

    throw new Error('无法启动 WebSocket 服务')
  }

  private tryStartServer(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const server = createServer()
      const wss = new WebSocketServer({ server })

      const onError = (error: Error) => {
        server.close()
        reject(error)
      }

      server.once('error', onError)

      server.listen(port, () => {
        server.removeListener('error', onError)
        this.server = server
        this.wss = wss
        this.setupWebSocketServer()
        resolve()
      })
    })
  }

  private setupWebSocketServer(): void {
    if (!this.wss) return

    this.wss.on('connection', (ws: WebSocket) => {
      this.client = ws

      ws.on('message', (data: Buffer) => {
        try {
          const message: WSMessage = JSON.parse(data.toString())
          this.handleMessage(message)
        } catch (error) {
          console.error('[WallpaperWS] 解析消息失败:', error)
        }
      })

      ws.on('close', () => {
        if (this.client === ws) {
          this.client = null
        }
      })

      ws.on('error', (error) => {
        console.error('[WallpaperWS] WebSocket 错误:', error)
      })
    })
  }

  private handleMessage(message: WSMessage): void {
    if (message.type === 'response' && message.id) {
      const handler = this.messageHandlers.get(message.id)
      if (handler) {
        handler(message.result)
        this.messageHandlers.delete(message.id)
      }
    } else if (message.type === 'subtitle_on') {
      this.broadcastSubtitleEvent('subtitle:on', message.data)
    } else if (message.type === 'subtitle_off') {
      this.broadcastSubtitleEvent('subtitle:off')
    }
  }

  private broadcastSubtitleEvent(eventType: string, data?: any): void {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach((window) => {
      if (!window.isDestroyed()) {
        window.webContents.send(eventType, data)
      }
    })
  }

  sendMessage<T = any>(type: string, data?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.client || this.client.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket 未连接'))
        return
      }

      const id = `msg_${++this.messageIdCounter}`
      const message: WSMessage = { type, id, data }

      // 30秒超时防止消息永久挂起
      const timeout = setTimeout(() => {
        this.messageHandlers.delete(id)
        reject(new Error('消息超时'))
      }, 30000)

      this.messageHandlers.set(id, (result) => {
        clearTimeout(timeout)
        if (result && result.success) {
          resolve(result)
        } else {
          reject(new Error(result?.error || '操作失败'))
        }
      })

      try {
        this.client.send(JSON.stringify(message))
      } catch (error) {
        clearTimeout(timeout)
        this.messageHandlers.delete(id)
        reject(error)
      }
    })
  }

  stop(): void {
    if (this.client) {
      this.client.close()
      this.client = null
    }

    if (this.wss) {
      this.wss.close()
      this.wss = null
    }

    if (this.server) {
      this.server.close()
      this.server = null
    }

    this.messageHandlers.clear()
    this.port = 0
  }

  getPort(): number {
    return this.port
  }

  isConnected(): boolean {
    return this.client !== null && this.client.readyState === WebSocket.OPEN
  }

  waitForConnection(timeout: number = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isConnected()) {
        resolve()
        return
      }

      const startTime = Date.now()
      const checkInterval = setInterval(() => {
        if (this.isConnected()) {
          clearInterval(checkInterval)
          resolve()
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval)
          reject(new Error('等待客户端连接超时'))
        }
      }, 100)
    })
  }
}

export const wallpaperWebSocketService = new WallpaperWebSocketService()
