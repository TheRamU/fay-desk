/**
 * 通用组件类型定义
 */

import type { WallpaperInfo } from './wallpaper'

export interface ShortcutRecorderProps {
  modelValue: string
  placeholder?: string
  disabled?: boolean
}

export interface ShortcutRecorderEmits {
  (e: 'update:modelValue', value: string): void
  (e: 'change', value: string): void
}

export interface ModelDialogProps {
  visible: boolean
  loading?: boolean
  mode?: 'add' | 'edit'
  initialData?: ModelData
}

export interface ModelDialogEmits {
  (e: 'update:visible', value: boolean): void
  (e: 'confirm', data: ModelData): void
}

export interface ModelListProps {
  models: any[]
  loading: boolean
  configValid: boolean
}

export interface ModelListEmits {
  (e: 'refresh'): void
  (e: 'add'): void
  (e: 'edit', model: any): void
  (e: 'delete', modelId: string): void
}

export interface WallpaperCardProps {
  wallpaper: WallpaperInfo
}

export interface WallpaperCardEmits {
  refresh: []
  'context-menu-show': [wallpaperId: string]
}

export interface ModelData {
  modelId: string
  displayName: string
}
