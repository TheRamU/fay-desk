import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  // 壁纸控制
  wallpaper: {
    start: () => ipcRenderer.send('start-wallpaper'),
    stop: () => ipcRenderer.send('stop-wallpaper'),
    getStatus: () => ipcRenderer.invoke('get-wallpaper-status'),
    getState: () => ipcRenderer.invoke('get-wallpaper-state'),
    getList: () => ipcRenderer.invoke('get-wallpaper-list'),
    getCover: (wallpaperId: string) => ipcRenderer.invoke('get-wallpaper-cover', wallpaperId),
    switchWallpaper: (wallpaperId: string) => ipcRenderer.invoke('switch-wallpaper', wallpaperId),
    toggleWallpaper: (wallpaperId?: string) => ipcRenderer.invoke('toggle-wallpaper', wallpaperId),
    setSelectedWallpaper: (wallpaperId: string) =>
      ipcRenderer.invoke('set-selected-wallpaper', wallpaperId),
    importWallpaper: () => ipcRenderer.invoke('import-wallpaper'),
    deleteWallpaper: (wallpaperId: string) => ipcRenderer.invoke('delete-wallpaper', wallpaperId),
    onStatusChange: (callback: (isRunning: boolean) => void) => {
      const listener = (_: unknown, isRunning: boolean): void => callback(isRunning)
      ipcRenderer.on('wallpaper-status-changed', listener)
      return () => {
        ipcRenderer.removeListener('wallpaper-status-changed', listener)
      }
    },
    removeStatusListener: () => {
      ipcRenderer.removeAllListeners('wallpaper-status-changed')
    },
    onSubtitleOn: (callback: (text: string) => void) => {
      const listener = (_: unknown, data: { text: string }): void => callback(data.text)
      ipcRenderer.on('subtitle:on', listener)
      return () => {
        ipcRenderer.removeListener('subtitle:on', listener)
      }
    },
    onSubtitleOff: (callback: () => void) => {
      const listener = (_: unknown): void => callback()
      ipcRenderer.on('subtitle:off', listener)
      return () => {
        ipcRenderer.removeListener('subtitle:off', listener)
      }
    }
  },
  // 托盘控制
  tray: {
    updateMenu: () => ipcRenderer.send('update-tray-menu')
  },
  // 数字人控制
  avatar: {
    connect: (config: { appId: string; appSecret: string }) =>
      ipcRenderer.invoke('avatar:connect', config),
    disconnect: () => ipcRenderer.invoke('avatar:disconnect'),
    speak: (text: string) => ipcRenderer.invoke('avatar:speak', text),
    getStatus: () => ipcRenderer.invoke('avatar:getStatus'),
    getConfig: () => ipcRenderer.invoke('avatar:getConfig'),
    saveConfig: (config: { appId: string; appSecret: string }) =>
      ipcRenderer.invoke('avatar:saveConfig', config),
    clearConfig: () => ipcRenderer.invoke('avatar:clearConfig'),
    onConfigUpdated: (callback: (data: { config: any; hasValidConfig: boolean }) => void) => {
      const listener = (_: unknown, data: { config: any; hasValidConfig: boolean }): void =>
        callback(data)
      ipcRenderer.on('avatar:config:updated', listener)
      return () => {
        ipcRenderer.removeListener('avatar:config:updated', listener)
      }
    }
  },
  // OpenAI API 控制
  openai: {
    getConfig: () => ipcRenderer.invoke('openai:getConfig'),
    saveConfig: (config: { baseURL: string; apiKey: string }) =>
      ipcRenderer.invoke('openai:saveConfig', config),
    clearConfig: () => ipcRenderer.invoke('openai:clearConfig'),
    getModels: () => ipcRenderer.invoke('openai:getModels'),
    refreshModels: () => ipcRenderer.invoke('openai:refreshModels'),
    addCustomModel: (data: { modelId: string; displayName: string }) =>
      ipcRenderer.invoke('openai:addCustomModel', data),
    updateCustomModel: (data: { modelId: string; displayName: string }) =>
      ipcRenderer.invoke('openai:updateCustomModel', data),
    deleteCustomModel: (modelId: string) => ipcRenderer.invoke('openai:deleteCustomModel', modelId),
    saveSelectedModel: (modelId: string) => ipcRenderer.invoke('openai:saveSelectedModel', modelId),
    getSelectedModel: () => ipcRenderer.invoke('openai:getSelectedModel')
  },
  // 聊天控制
  chat: {
    stream: (data: { userMessage: string; requestId: string }) =>
      ipcRenderer.invoke('chat:stream', data),
    onStreamData: (callback: (data: { requestId: string; content: string }) => void) => {
      const listener = (_: unknown, data: { requestId: string; content: string }): void =>
        callback(data)
      ipcRenderer.on('chat:stream:data', listener)
      return () => {
        ipcRenderer.removeListener('chat:stream:data', listener)
      }
    },
    onStreamEnd: (callback: (data: { requestId: string }) => void) => {
      const listener = (_: unknown, data: { requestId: string }): void => callback(data)
      ipcRenderer.on('chat:stream:end', listener)
      return () => {
        ipcRenderer.removeListener('chat:stream:end', listener)
      }
    },
    onStreamError: (callback: (data: { requestId: string; error: string }) => void) => {
      const listener = (_: unknown, data: { requestId: string; error: string }): void =>
        callback(data)
      ipcRenderer.on('chat:stream:error', listener)
      return () => {
        ipcRenderer.removeListener('chat:stream:error', listener)
      }
    },
    onStreamStopped: (callback: (data: { requestId: string }) => void) => {
      const listener = (_: unknown, data: { requestId: string }): void => callback(data)
      ipcRenderer.on('chat:stream:stopped', listener)
      return () => {
        ipcRenderer.removeListener('chat:stream:stopped', listener)
      }
    },
    onStreamStarted: (callback: (data: { requestId: string; userMessage: string }) => void) => {
      const listener = (_: unknown, data: { requestId: string; userMessage: string }): void =>
        callback(data)
      ipcRenderer.on('chat:stream:started', listener)
      return () => {
        ipcRenderer.removeListener('chat:stream:started', listener)
      }
    },
    stopStream: (requestId: string) => ipcRenderer.invoke('chat:stopStream', requestId),
    // 流式响应管理
    getActiveStreams: () => ipcRenderer.invoke('chat:getActiveStreams'),
    reconnectStream: (requestId: string) => ipcRenderer.invoke('chat:reconnectStream', requestId),
    // 跨窗口状态同步
    onMessageAdded: (callback: (data: { message: any; requestId: string }) => void) => {
      const listener = (_: unknown, data: { message: any; requestId: string }): void =>
        callback(data)
      ipcRenderer.on('chat:message:added', listener)
      return () => {
        ipcRenderer.removeListener('chat:message:added', listener)
      }
    },
    onMessageCompleted: (callback: (data: { message: any; requestId: string }) => void) => {
      const listener = (_: unknown, data: { message: any; requestId: string }): void =>
        callback(data)
      ipcRenderer.on('chat:message:completed', listener)
      return () => {
        ipcRenderer.removeListener('chat:message:completed', listener)
      }
    },
    // 聊天历史记录
    getHistory: () => ipcRenderer.invoke('chat:getHistory'),
    saveHistory: (messages: Array<{ role: string; content: string; timestamp: number }>) =>
      ipcRenderer.invoke('chat:saveHistory', messages),
    addMessage: (message: { role: string; content: string; timestamp: number }) =>
      ipcRenderer.invoke('chat:addMessage', message),
    clearHistory: () => ipcRenderer.invoke('chat:clearHistory'),
    // 聊天配置
    getConfig: () => ipcRenderer.invoke('chat:getConfig'),
    saveConfig: (config: { historyMessageCount: number }) =>
      ipcRenderer.invoke('chat:saveConfig', config),
    updateConfig: (partialConfig: Partial<{ historyMessageCount: number }>) =>
      ipcRenderer.invoke('chat:updateConfig', partialConfig),
    resetConfig: () => ipcRenderer.invoke('chat:resetConfig')
  },
  // 悬浮窗控制
  floating: {
    toggle: () => ipcRenderer.invoke('floating:toggle'),
    getStatus: () => ipcRenderer.invoke('floating:getStatus')
  },
  // 通用配置控制
  commonSetting: {
    getConfig: () => ipcRenderer.invoke('commonSetting:getConfig'),
    saveConfig: (config: {
      autoStartWallpaper: boolean
      autoStartOnBoot: boolean
      avatarEnabled: boolean
    }) => ipcRenderer.invoke('commonSetting:saveConfig', config),
    updateConfig: (
      partialConfig: Partial<{
        autoStartWallpaper: boolean
        autoStartOnBoot: boolean
        avatarEnabled: boolean
      }>
    ) => ipcRenderer.invoke('commonSetting:updateConfig', partialConfig),
    resetConfig: () => ipcRenderer.invoke('commonSetting:resetConfig'),
    getAutoStartWallpaper: () => ipcRenderer.invoke('commonSetting:getAutoStartWallpaper'),
    setAutoStartWallpaper: (enabled: boolean) =>
      ipcRenderer.invoke('commonSetting:setAutoStartWallpaper', enabled),
    getAutoStartOnBoot: () => ipcRenderer.invoke('commonSetting:getAutoStartOnBoot'),
    setAutoStartOnBoot: (enabled: boolean) =>
      ipcRenderer.invoke('commonSetting:setAutoStartOnBoot', enabled),
    getAvatarEnabled: () => ipcRenderer.invoke('commonSetting:getAvatarEnabled'),
    setAvatarEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('commonSetting:setAvatarEnabled', enabled),
    toggleAvatarWithRestart: (enabled: boolean) =>
      ipcRenderer.invoke('commonSetting:toggleAvatarWithRestart', enabled),
    onAvatarEnabledChanged: (callback: (data: { avatarEnabled: boolean }) => void) => {
      const listener = (_: unknown, data: { avatarEnabled: boolean }): void => callback(data)
      ipcRenderer.on('commonSetting:avatarEnabled:changed', listener)
      return () => {
        ipcRenderer.removeListener('commonSetting:avatarEnabled:changed', listener)
      }
    }
  },
  // 快捷键控制
  shortcut: {
    getConfig: () => ipcRenderer.invoke('shortcut:getConfig'),
    saveConfig: (config: { showMainWindow: string; showFloatingWindow: string }) =>
      ipcRenderer.invoke('shortcut:saveConfig', config),
    updateShortcut: (key: 'showMainWindow' | 'showFloatingWindow', value: string) =>
      ipcRenderer.invoke('shortcut:updateShortcut', key, value),
    getShowMainWindow: () => ipcRenderer.invoke('shortcut:getShowMainWindow'),
    setShowMainWindow: (shortcut: string) =>
      ipcRenderer.invoke('shortcut:setShowMainWindow', shortcut),
    getShowFloatingWindow: () => ipcRenderer.invoke('shortcut:getShowFloatingWindow'),
    setShowFloatingWindow: (shortcut: string) =>
      ipcRenderer.invoke('shortcut:setShowFloatingWindow', shortcut),
    reset: () => ipcRenderer.invoke('shortcut:reset')
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
