export interface BaseResponse {
  success: boolean
  error?: string
}

export interface ShortcutConfigResponse extends BaseResponse {
  config?: import('./config').ShortcutConfig
}

export interface ShortcutUpdateResponse extends BaseResponse {}
