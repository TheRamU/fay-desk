/**
 * OpenAI 相关类型定义
 */

export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
  isCustom?: boolean
  displayName?: string
}

export interface OpenAIConfig {
  baseURL: string
  apiKey: string
}

export interface PresetOption {
  label: string
  value: string
  tutorialUrl: string
}
