export interface WallpaperInfo {
  id: string
  name: string
  path: string
  coverPath?: string
  configPath?: string
  htmlPath?: string
}

/** 从 wallpaper.json 读取的配置 */
export interface WallpaperConfigFile {
  name?: string
  author?: string
}

export interface StreamState {
  requestId: string
  abortController: AbortController
  startTime: number
  userMessage: string
  model: string
  accumulatedContent: string
  isCompleted: boolean
  windowId?: number
}

export interface WSMessage {
  type: string
  id?: string
  data?: any
  result?: any
}
