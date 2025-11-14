export interface OpenAIConfig {
  baseURL: string
  apiKey: string
}

export interface OpenAIModel {
  id: string
  object: string
  created: number
  owned_by: string
  isCustom?: boolean
  displayName?: string
}

export interface OpenAIConfigData {
  config: OpenAIConfig
  models: OpenAIModel[]
  lastUpdated: number
  selectedModel?: string
}
