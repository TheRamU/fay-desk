import { BrowserWindow, screen } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, existsSync } from 'fs'
import { wallpaperWebSocketService } from '../services/wallpaperWebSocketService'
import { commonConfigService } from '../services/commonConfigService'

export async function createWallpaperWindow(htmlPath?: string): Promise<BrowserWindow> {
  const primaryDisplay = screen.getPrimaryDisplay()
  const { width, height } = primaryDisplay.workAreaSize

  const window = new BrowserWindow({
    width,
    height,
    x: 0,
    y: 0,
    frame: false,
    transparent: true,
    skipTaskbar: true,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    closable: true,
    alwaysOnTop: false,
    focusable: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  const targetPath =
    htmlPath || join(__dirname, '../../resources/wallpapers/corner-store/index.html')
  window.loadFile(targetPath)

  let wsPort: number
  try {
    wsPort = await wallpaperWebSocketService.start()
  } catch (error) {
    console.error('[Wallpaper Window] 启动 WebSocket 服务失败:', error)
    throw error
  }

  window.webContents.on('dom-ready', async () => {
    try {
      const avatarEnabled = commonConfigService.getAvatarEnabled()
      await window.webContents.executeJavaScript(`
        window.__WS_PORT__ = ${wsPort};
        window.__AVATAR_ENABLED__ = ${avatarEnabled};
      `)
      let scriptPath = join(__dirname, 'scripts/wallpaper-controller.js')
      if (!existsSync(scriptPath)) {
        scriptPath = join(__dirname, 'main/scripts/wallpaper-controller.js')
      }
      if (!existsSync(scriptPath)) {
        scriptPath = join(dirname(__dirname), 'scripts/wallpaper-controller.js')
      }

      const controllerScript = readFileSync(scriptPath, 'utf-8')
      await window.webContents.executeJavaScript(controllerScript)
    } catch (error) {
      console.error('[Wallpaper Window] 脚本注入失败:', error)
    }
  })

  // 设置窗口忽略鼠标事件，让鼠标穿透到桌面
  window.setIgnoreMouseEvents(true)

  return window
}
