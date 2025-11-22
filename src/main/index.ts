import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createMainWindow } from './window/mainWindow'
import { registerWallpaperHandlers } from './ipc/wallpaperHandler'
import { registerTrayHandlers } from './ipc/trayHandler'
import { registerAvatarHandlers } from './ipc/avatarHandler'
import { registerOpenAIHandlers } from './ipc/openaiHandler'
import { registerChatHandlers } from './ipc/chatHandler'
import { registerFloatingHandlers } from './ipc/floatingHandler'
import { registerCommonSettingHandlers } from './ipc/commonSettingHandler'
import { registerShortcutHandlers } from './ipc/shortcutHandler'
import { registerUpdateHandlers } from './ipc/updateHandler'
import { trayService } from './services/trayService'
import { mainWindowService } from './services/mainWindowService'
import { wallpaperLoaderService } from './services/wallpaperLoaderService'
import { commonConfigService } from './services/commonConfigService'
import { wallpaperService } from './services/wallpaperService'
import { globalShortcutService } from './services/globalShortcutService'
import { updateService } from './services/updateService'

// 解决 Windows 控制台乱码问题
function setupConsoleEncoding(): void {
  if (process.platform === 'win32') {
    try {
      if (process.stdout.setDefaultEncoding) {
        process.stdout.setDefaultEncoding('utf8')
      }
      if (process.stderr.setDefaultEncoding) {
        process.stderr.setDefaultEncoding('utf8')
      }
    } catch (error) {
      console.error('设置控制台编码失败:', error)
    }
  }
}

// 检测应用是否通过开机自启动启动
// macOS 使用 wasOpenedAtLogin，Windows 使用 --startup 参数
function isStartedFromLogin(): boolean {
  try {
    const loginItemSettings = app.getLoginItemSettings()

    if (process.platform === 'darwin') {
      return loginItemSettings.wasOpenedAtLogin || false
    }

    if (process.platform === 'win32') {
      return process.argv.includes('--startup')
    }

    return false
  } catch (error) {
    console.error('[App] 检测开机启动状态失败:', error)
    return false
  }
}

async function initialize(): Promise<void> {
  setupConsoleEncoding()

  // 防止多开：请求单实例锁
  const gotTheLock = app.requestSingleInstanceLock()

  if (!gotTheLock) {
    console.log('[App] 应用已在运行，退出当前实例')
    app.quit()
    return
  }

  // 当第二个实例尝试启动时，显示已运行的主窗口
  app.on('second-instance', () => {
    console.log('[App] 检测到第二个实例启动，显示主窗口')
    if (!mainWindowService.isMainWindowAvailable()) {
      const newWindow = createMainWindow()
      mainWindowService.setMainWindow(newWindow)
    } else {
      mainWindowService.showMainWindow()
    }
  })

  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerWallpaperHandlers()
  registerTrayHandlers()
  registerAvatarHandlers()
  registerOpenAIHandlers()
  registerChatHandlers()
  registerFloatingHandlers()
  registerCommonSettingHandlers()
  registerShortcutHandlers()
  registerUpdateHandlers()

  const isAutoStarted = isStartedFromLogin()

  if (!isAutoStarted) {
    const mainWindow = createMainWindow()
    mainWindowService.setMainWindow(mainWindow)
  } else {
    // 开机自启动模式，不自动显示主窗口
    mainWindowService.clearMainWindow()
  }

  trayService.setMainWindowCreator(createMainWindow)
  trayService.create()

  globalShortcutService.registerAll()

  // 仅在打包环境下初始化更新服务
  if (app.isPackaged) {
    updateService.initialize()
  }

  // 仅在安装环境下设置开机自启动
  if (app.isPackaged) {
    try {
      const config = commonConfigService.get()
      if (config.autoStartOnBoot) {
        app.setLoginItemSettings({
          openAtLogin: true,
          path: process.execPath,
          args: ['--startup']
        })
      }
    } catch (error) {
      console.error('[App] 设置开机自启动失败:', error)
    }
  }

  // 异步加载壁纸资源，不阻塞窗口显示
  setImmediate(async () => {
    await wallpaperLoaderService.initialize()

    try {
      const config = commonConfigService.get()
      if (config.autoStartWallpaper) {
        const wallpaperState = wallpaperService.getState()
        if (wallpaperState.selectedWallpaperId) {
          wallpaperService.start(wallpaperState.selectedWallpaperId)
        } else {
          const wallpapers = wallpaperLoaderService.getWallpapers()
          if (wallpapers.length > 0) {
            wallpaperService.start(wallpapers[0].id)
          }
        }
      }
    } catch (error) {
      console.error('[App] 自动开启壁纸失败:', error)
    }
  })

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (!mainWindowService.isMainWindowAvailable()) {
      const newWindow = createMainWindow()
      mainWindowService.setMainWindow(newWindow)
    } else {
      mainWindowService.showMainWindow()
    }
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(initialize)

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {})

// 应用退出时清理资源
app.on('before-quit', () => {
  BrowserWindow.getAllWindows().forEach((window) => {
    window.removeAllListeners('close')
  })
  globalShortcutService.unregisterAll()
  trayService.destroy()
  updateService.destroy()
  mainWindowService.clearMainWindow()
})
