/**
 * 壁纸相关类型定义
 */

export interface WallpaperInfo {
  id: string // 壁纸文件夹名称（唯一标识）
  name: string // 壁纸显示名称
  path: string
  coverPath?: string
  configPath?: string
  htmlPath?: string
}
