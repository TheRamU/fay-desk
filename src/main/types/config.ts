export interface CommonConfig {
  autoStartWallpaper: boolean
  autoStartOnBoot: boolean
  avatarEnabled: boolean
  autoUpdate: boolean
}

export interface ChatConfig {
  /** 对话轮数（一轮 = 一个用户消息 + 一个AI消息） */
  historyMessageCount: number
}

export interface WallpaperConfig {
  selectedWallpaperId: string | null
  isRunning: boolean
}

export interface ShortcutConfig {
  showMainWindow: string
  showFloatingWindow: string
}

export interface ConfigItem {
  encrypted: string
  version: number
}

export interface ConfigStore {
  [key: string]: ConfigItem
}
