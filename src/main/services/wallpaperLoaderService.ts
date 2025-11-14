import * as fs from 'fs'
import { promises as fsPromises } from 'fs'
import * as path from 'path'
import { app, dialog } from 'electron'
import * as yauzl from 'yauzl'

import type { WallpaperInfo, WallpaperConfigFile } from '../types'

class WallpaperLoaderService {
  private wallpapers: WallpaperInfo[] = []
  private wallpapersDir: string = ''

  async initialize(): Promise<void> {
    this.wallpapersDir = this.getWallpapersDirectory()
    await this.initializeAsync()
  }

  private async initializeAsync(): Promise<void> {
    try {
      if (app.isPackaged) {
        await this.ensureWallpapersInUserDataAsync()
      }
      this.loadWallpapers()
    } catch (error) {
      console.error('[WallpaperLoader] 异步初始化失败:', error)
    }
  }

  private getWallpapersDirectory(): string {
    if (app.isPackaged) {
      return path.join(app.getPath('userData'), 'wallpapers')
    } else {
      // 开发环境：resources 目录在项目根目录
      return path.join(app.getAppPath(), 'resources', 'wallpapers')
    }
  }

  private getResourceWallpapersDirectory(): string {
    // 生产环境：resources 目录在 app.asar 外部
    return path.join(process.resourcesPath, 'wallpapers')
  }

  private async ensureWallpapersInUserDataAsync(): Promise<void> {
    const userDataWallpapersDir = path.join(app.getPath('userData'), 'wallpapers')
    const resourceWallpapersDir = this.getResourceWallpapersDirectory()

    try {
      let needsCopy = false

      try {
        await fsPromises.access(userDataWallpapersDir)
        const entries = await fsPromises.readdir(userDataWallpapersDir)
        if (entries.length === 0) {
          needsCopy = true
        }
      } catch {
        needsCopy = true
      }

      if (needsCopy) {
        try {
          await fsPromises.access(resourceWallpapersDir)
          try {
            await fsPromises.rm(userDataWallpapersDir, { recursive: true, force: true })
          } catch {
            // 忽略删除错误
          }
          await this.copyDirectoryAsync(resourceWallpapersDir, userDataWallpapersDir)
        } catch {
          await fsPromises.mkdir(userDataWallpapersDir, { recursive: true })
        }
      }
    } catch (error) {
      console.error('[WallpaperLoader] 确保壁纸文件夹存在时发生错误:', error)
      try {
        await fsPromises.mkdir(userDataWallpapersDir, { recursive: true })
      } catch (createError) {
        console.error('[WallpaperLoader] 创建壁纸目录失败:', createError)
      }
    }
  }

  private async copyDirectoryAsync(src: string, dest: string): Promise<void> {
    try {
      await fsPromises.mkdir(dest, { recursive: true })
      const entries = await fsPromises.readdir(src, { withFileTypes: true })

      await Promise.all(
        entries.map(async (entry) => {
          const srcPath = path.join(src, entry.name)
          const destPath = path.join(dest, entry.name)

          if (entry.isDirectory()) {
            await this.copyDirectoryAsync(srcPath, destPath)
          } else {
            await fsPromises.copyFile(srcPath, destPath)
          }
        })
      )
    } catch (error) {
      console.error(`[WallpaperLoader] 异步复制目录失败 [${src} -> ${dest}]:`, error)
      throw error
    }
  }

  private loadWallpapers(): void {
    try {
      if (!fs.existsSync(this.wallpapersDir)) {
        return
      }

      const entries = fs.readdirSync(this.wallpapersDir, { withFileTypes: true })
      const wallpaperDirs = entries.filter((entry) => entry.isDirectory())

      for (const dir of wallpaperDirs) {
        const wallpaperPath = path.join(this.wallpapersDir, dir.name)
        const wallpaperInfo = this.parseWallpaperDirectory(dir.name, wallpaperPath)

        if (wallpaperInfo) {
          this.wallpapers.push(wallpaperInfo)
        }
      }
    } catch (error) {
      console.error('[WallpaperLoader] 加载壁纸失败:', error)
    }
  }

  private parseWallpaperDirectory(name: string, dirPath: string): WallpaperInfo | null {
    try {
      const wallpaperInfo: WallpaperInfo = {
        id: name,
        name,
        path: dirPath
      }

      // 校验壁纸完整性
      const isValid = this.validateWallpaper(name, dirPath)
      if (!isValid) {
        return null
      }

      // 检查配置文件
      const configPath = path.join(dirPath, 'wallpaper.json')
      if (fs.existsSync(configPath)) {
        wallpaperInfo.configPath = configPath

        // 读取配置文件中的名称
        try {
          const configContent = fs.readFileSync(configPath, 'utf-8')
          const config: WallpaperConfigFile = JSON.parse(configContent)
          if (config.name) {
            wallpaperInfo.name = config.name // 使用配置文件中的名称
          }
        } catch (error) {
          console.error(`[WallpaperLoader] 读取配置文件失败 [${name}]:`, error)
        }
      }

      // 检查封面图（优先 cover.jpg）
      const coverJpgPath = path.join(dirPath, 'cover.jpg')
      const coverJpegPath = path.join(dirPath, 'cover.jpeg')
      const coverPngPath = path.join(dirPath, 'cover.png')

      if (fs.existsSync(coverJpgPath)) {
        wallpaperInfo.coverPath = coverJpgPath
      } else if (fs.existsSync(coverJpegPath)) {
        wallpaperInfo.coverPath = coverJpegPath
      } else if (fs.existsSync(coverPngPath)) {
        wallpaperInfo.coverPath = coverPngPath
      }

      // 检查HTML文件
      const htmlPath = path.join(dirPath, 'index.html')
      if (fs.existsSync(htmlPath)) {
        wallpaperInfo.htmlPath = htmlPath
      }

      return wallpaperInfo
    } catch (error) {
      console.error(`[WallpaperLoader] 解析壁纸目录失败 [${name}]:`, error)
      return null
    }
  }

  getWallpapers(): WallpaperInfo[] {
    return [...this.wallpapers].sort((a, b) => {
      // 13位毫秒时间戳优先排序：新导入的壁纸在前
      const isTimestampA = /^\d{13}$/.test(a.id)
      const isTimestampB = /^\d{13}$/.test(b.id)

      if (isTimestampA && isTimestampB) {
        return parseInt(b.id) - parseInt(a.id)
      } else if (isTimestampA && !isTimestampB) {
        return -1
      } else if (!isTimestampA && isTimestampB) {
        return 1
      } else {
        return a.id.localeCompare(b.id)
      }
    })
  }

  getWallpaperById(id: string): WallpaperInfo | undefined {
    return this.wallpapers.find((w) => w.id === id)
  }

  getWallpaperByName(name: string): WallpaperInfo | undefined {
    return this.wallpapers.find((w) => w.name === name)
  }

  private validateWallpaper(name: string, dirPath: string): boolean {
    try {
      const configPath = path.join(dirPath, 'wallpaper.json')
      if (!fs.existsSync(configPath)) {
        console.warn(`[WallpaperLoader] 壁纸 [${name}] 缺少 wallpaper.json 文件`)
        return false
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8')
        const config: WallpaperConfigFile = JSON.parse(configContent)

        if (!config.name) {
          console.warn(`[WallpaperLoader] 壁纸 [${name}] 的 wallpaper.json 缺少 name 字段`)
          return false
        }
        if (!config.author) {
          console.warn(`[WallpaperLoader] 壁纸 [${name}] 的 wallpaper.json 缺少 author 字段`)
          return false
        }
      } catch (error) {
        console.warn(`[WallpaperLoader] 壁纸 [${name}] 的 wallpaper.json 格式错误:`, error)
        return false
      }

      const htmlPath = path.join(dirPath, 'index.html')
      if (!fs.existsSync(htmlPath)) {
        console.warn(`[WallpaperLoader] 壁纸 [${name}] 缺少 index.html 文件`)
        return false
      }

      return true
    } catch (error) {
      console.error(`[WallpaperLoader] 校验壁纸 [${name}] 时发生错误:`, error)
      return false
    }
  }

  async importWallpaper(): Promise<{ success: boolean; error?: string; wallpaperId?: string }> {
    try {
      const result = await dialog.showOpenDialog({
        title: '选择壁纸压缩包',
        filters: [{ name: 'ZIP 压缩包', extensions: ['zip'] }],
        properties: ['openFile']
      })

      if (result.canceled || !result.filePaths.length) {
        return { success: false }
      }

      const zipPath = result.filePaths[0]

      const validationResult = await this.validateZipFile(zipPath)
      if (!validationResult.success) {
        return validationResult
      }

      const wallpaperId = Date.now().toString()
      const targetDir = path.join(this.wallpapersDir, wallpaperId)

      const extractResult = await this.extractZipFile(zipPath, targetDir)
      if (!extractResult.success) {
        return extractResult
      }

      this.reloadWallpapers()

      return { success: true, wallpaperId }
    } catch (error: any) {
      console.error('[WallpaperLoader] 导入壁纸失败:', error)
      return { success: false, error: error.message || '导入失败' }
    }
  }

  private async validateZipFile(zipPath: string): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('[WallpaperLoader] 打开zip文件失败:', err)
          resolve({ success: false, error: '无法打开压缩包文件' })
          return
        }

        if (!zipfile) {
          resolve({ success: false, error: '压缩包文件无效' })
          return
        }

        const requiredFiles = ['wallpaper.json', 'index.html']
        const foundFiles: string[] = []

        zipfile.readEntry()

        zipfile.on('entry', (entry) => {
          // 必需文件必须在根目录，不能在子文件夹中
          if (!entry.fileName.includes('/') || entry.fileName.endsWith('/')) {
            const fileName = entry.fileName.replace('/', '')
            if (requiredFiles.includes(fileName)) {
              foundFiles.push(fileName)
            }
          }
          zipfile.readEntry()
        })

        zipfile.on('end', () => {
          const missingFiles = requiredFiles.filter((file) => !foundFiles.includes(file))
          if (missingFiles.length > 0) {
            resolve({
              success: false,
              error: `压缩包缺少必需文件: ${missingFiles.join(', ')}`
            })
            return
          }

          resolve({ success: true })
        })

        zipfile.on('error', (error) => {
          console.error('[WallpaperLoader] 读取zip文件失败:', error)
          resolve({ success: false, error: '读取压缩包失败' })
        })
      })
    })
  }

  private async extractZipFile(
    zipPath: string,
    targetDir: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
        if (err) {
          console.error('[WallpaperLoader] 打开zip文件失败:', err)
          resolve({ success: false, error: '无法打开压缩包文件' })
          return
        }

        if (!zipfile) {
          resolve({ success: false, error: '压缩包文件无效' })
          return
        }

        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true })
        }

        let extractedCount = 0
        let hasError = false

        zipfile.readEntry()

        zipfile.on('entry', (entry) => {
          if (entry.fileName.endsWith('/')) {
            zipfile.readEntry()
            return
          }

          const outputPath = path.join(targetDir, entry.fileName)
          const outputDir = path.dirname(outputPath)

          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true })
          }

          zipfile.openReadStream(entry, (err, readStream) => {
            if (err) {
              console.error('[WallpaperLoader] 读取文件流失败:', err)
              hasError = true
              resolve({ success: false, error: '解压文件失败' })
              return
            }

            if (!readStream) {
              hasError = true
              resolve({ success: false, error: '无法读取文件流' })
              return
            }

            const writeStream = fs.createWriteStream(outputPath)

            readStream.pipe(writeStream)

            writeStream.on('close', () => {
              extractedCount++
              zipfile.readEntry()
            })

            writeStream.on('error', (error) => {
              console.error('[WallpaperLoader] 写入文件失败:', error)
              hasError = true
              resolve({ success: false, error: '写入文件失败' })
            })
          })
        })

        zipfile.on('end', async () => {
          if (hasError) {
            return
          }

          const validationResult = await this.validateExtractedWallpaper(targetDir)
          if (!validationResult.success) {
            try {
              await fsPromises.rm(targetDir, { recursive: true, force: true })
            } catch (error) {
              console.error('[WallpaperLoader] 删除无效壁纸文件夹失败:', error)
            }
            resolve(validationResult)
            return
          }

          resolve({ success: true })
        })

        zipfile.on('error', (error) => {
          console.error('[WallpaperLoader] 解压过程中出错:', error)
          resolve({ success: false, error: '解压过程中出错' })
        })
      })
    })
  }

  private async validateExtractedWallpaper(
    dirPath: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const configPath = path.join(dirPath, 'wallpaper.json')
      if (!fs.existsSync(configPath)) {
        console.warn('[WallpaperLoader] 解压的壁纸缺少 wallpaper.json 文件')
        return { success: false, error: '壁纸包缺少 wallpaper.json 文件' }
      }

      try {
        const configContent = fs.readFileSync(configPath, 'utf-8')
        const config: WallpaperConfigFile = JSON.parse(configContent)

        if (!config.name) {
          console.warn('[WallpaperLoader] 解压的壁纸 wallpaper.json 缺少 name 字段')
          return { success: false, error: 'wallpaper.json 缺少 name 字段' }
        }
        if (!config.author) {
          console.warn('[WallpaperLoader] 解压的壁纸 wallpaper.json 缺少 author 字段')
          return { success: false, error: 'wallpaper.json 缺少 author 字段' }
        }
      } catch (error) {
        console.warn('[WallpaperLoader] 解压的壁纸 wallpaper.json 格式错误:', error)
        return { success: false, error: 'wallpaper.json 格式错误' }
      }

      const htmlPath = path.join(dirPath, 'index.html')
      if (!fs.existsSync(htmlPath)) {
        console.warn('[WallpaperLoader] 解压的壁纸缺少 index.html 文件')
        return { success: false, error: '壁纸包缺少 index.html 文件' }
      }

      return { success: true }
    } catch (error) {
      console.error('[WallpaperLoader] 校验解压的壁纸时发生错误:', error)
      return { success: false, error: '校验壁纸失败' }
    }
  }

  reloadWallpapers(): void {
    this.wallpapers = []
    this.loadWallpapers()
  }

  async deleteWallpaper(wallpaperId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const wallpaper = this.getWallpaperById(wallpaperId)
      if (!wallpaper) {
        return { success: false, error: '壁纸不存在' }
      }

      await fsPromises.rm(wallpaper.path, { recursive: true, force: true })

      const index = this.wallpapers.findIndex((w) => w.id === wallpaperId)
      if (index !== -1) {
        this.wallpapers.splice(index, 1)
      }

      return { success: true }
    } catch (error: any) {
      console.error('[WallpaperLoader] 删除壁纸失败:', error)
      return { success: false, error: error.message || '删除失败' }
    }
  }
}

export const wallpaperLoaderService = new WallpaperLoaderService()
