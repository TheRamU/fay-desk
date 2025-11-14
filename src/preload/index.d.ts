import { ElectronAPI } from "@electron-toolkit/preload";

interface WallpaperInfo {
  id: string; // 壁纸文件夹名称（唯一标识）
  name: string; // 壁纸显示名称
  path: string;
  coverPath?: string;
  configPath?: string;
  htmlPath?: string;
}

interface WallpaperListResponse {
  success: boolean;
  wallpapers: WallpaperInfo[];
  error?: string;
}

interface WallpaperCoverResponse {
  success: boolean;
  data?: string;
  error?: string;
}

interface WallpaperState {
  isRunning: boolean;
  selectedWallpaperId: string | null;
}

interface WallpaperStateResponse {
  success: boolean;
  state?: WallpaperState;
  error?: string;
}

interface WallpaperOperationResponse {
  success: boolean;
  state?: WallpaperState;
  error?: string;
}

interface WallpaperImportResponse {
  success: boolean;
  wallpaperId?: string;
  error?: string;
}

interface WallpaperDeleteResponse {
  success: boolean;
  error?: string;
}

interface WallpaperAPI {
  start: () => void;
  stop: () => void;
  getStatus: () => Promise<boolean>;
  getState: () => Promise<WallpaperStateResponse>;
  getList: () => Promise<WallpaperListResponse>;
  getCover: (wallpaperId: string) => Promise<WallpaperCoverResponse>;
  switchWallpaper: (wallpaperId: string) => Promise<WallpaperOperationResponse>;
  toggleWallpaper: (wallpaperId?: string) => Promise<WallpaperOperationResponse>;
  setSelectedWallpaper: (wallpaperId: string) => Promise<WallpaperOperationResponse>;
  importWallpaper: () => Promise<WallpaperImportResponse>;
  deleteWallpaper: (wallpaperId: string) => Promise<WallpaperDeleteResponse>;
  onStatusChange: (callback: (isRunning: boolean) => void) => () => void;
  removeStatusListener: () => void;
  onSubtitleOn: (callback: (text: string) => void) => () => void;
  onSubtitleOff: (callback: () => void) => () => void;
}

interface TrayAPI {
  updateMenu: () => void;
}

interface AvatarConfig {
  appId: string;
  appSecret: string;
}

interface AvatarResponse {
  success: boolean;
  error?: string;
}

interface AvatarStatusResponse extends AvatarResponse {
  connected?: boolean;
}

interface AvatarConfigResponse extends AvatarResponse {
  config?: AvatarConfig | null;
}

interface AvatarConfigUpdateData {
  config: AvatarConfig | null;
  hasValidConfig: boolean;
}

interface AvatarAPI {
  connect: (config: AvatarConfig) => Promise<AvatarResponse>;
  disconnect: () => Promise<AvatarResponse>;
  speak: (text: string) => Promise<AvatarResponse>;
  getStatus: () => Promise<AvatarStatusResponse>;
  getConfig: () => Promise<AvatarConfigResponse>;
  saveConfig: (config: AvatarConfig) => Promise<AvatarResponse>;
  clearConfig: () => Promise<AvatarResponse>;
  onConfigUpdated: (callback: (data: AvatarConfigUpdateData) => void) => () => void;
}

interface OpenAIConfig {
  baseURL: string;
  apiKey: string;
}

interface OpenAIModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
  isCustom?: boolean;
  displayName?: string;
}

interface OpenAIResponse {
  success: boolean;
  error?: string;
}

interface OpenAIConfigResponse extends OpenAIResponse {
  config?: OpenAIConfig | null;
}

interface OpenAIModelsResponse extends OpenAIResponse {
  models: OpenAIModel[];
}

interface OpenAISelectedModelResponse extends OpenAIResponse {
  selectedModel: string | null;
}

interface ChatMessage {
  role: string;
  content: string;
  timestamp?: number;
}

interface ChatConfig {
  historyMessageCount: number;
}

interface StreamState {
  requestId: string;
  userMessage: string;
  model: string;
  accumulatedContent: string;
  startTime: number;
  isCompleted: boolean;
}

interface ChatResponse {
  success: boolean;
  error?: string;
}

interface ChatHistoryResponse {
  success: boolean;
  messages: ChatMessage[];
  error?: string;
}

interface ChatConfigResponse {
  success: boolean;
  config?: ChatConfig | null;
  error?: string;
}

interface ActiveStreamsResponse {
  success: boolean;
  streams: StreamState[];
  error?: string;
}

interface ReconnectStreamResponse {
  success: boolean;
  message?: string;
  error?: string;
  accumulatedContent?: string;
}

interface OpenAIAPI {
  getConfig: () => Promise<OpenAIConfigResponse>;
  saveConfig: (config: OpenAIConfig) => Promise<OpenAIResponse>;
  clearConfig: () => Promise<OpenAIResponse>;
  getModels: () => Promise<OpenAIModelsResponse>;
  refreshModels: () => Promise<OpenAIModelsResponse>;
  addCustomModel: (data: { modelId: string; displayName: string }) => Promise<OpenAIResponse>;
  updateCustomModel: (data: { modelId: string; displayName: string }) => Promise<OpenAIResponse>;
  deleteCustomModel: (modelId: string) => Promise<OpenAIResponse>;
  saveSelectedModel: (modelId: string) => Promise<OpenAIResponse>;
  getSelectedModel: () => Promise<OpenAISelectedModelResponse>;
}

interface ChatAPI {
  stream: (data: { userMessage: string; requestId: string }) => Promise<ChatResponse>;
  onStreamData: (callback: (data: { requestId: string; content: string }) => void) => () => void;
  onStreamEnd: (callback: (data: { requestId: string }) => void) => () => void;
  onStreamError: (callback: (data: { requestId: string; error: string }) => void) => () => void;
  onStreamStopped: (callback: (data: { requestId: string }) => void) => () => void;
  onStreamStarted: (callback: (data: { requestId: string; userMessage: string }) => void) => () => void;
  stopStream: (requestId: string) => Promise<ChatResponse>;
  // 流式响应管理
  getActiveStreams: () => Promise<ActiveStreamsResponse>;
  reconnectStream: (requestId: string) => Promise<ReconnectStreamResponse>;
  // 跨窗口状态同步
  onMessageAdded: (callback: (data: { message: ChatMessage; requestId: string }) => void) => () => void;
  onMessageCompleted: (callback: (data: { message: ChatMessage; requestId: string }) => void) => () => void;
  // 聊天历史记录
  getHistory: () => Promise<ChatHistoryResponse>;
  saveHistory: (messages: ChatMessage[]) => Promise<ChatResponse>;
  addMessage: (message: ChatMessage) => Promise<ChatResponse>;
  clearHistory: () => Promise<ChatResponse>;
  // 聊天配置
  getConfig: () => Promise<ChatConfigResponse>;
  saveConfig: (config: ChatConfig) => Promise<ChatResponse>;
  updateConfig: (partialConfig: Partial<ChatConfig>) => Promise<ChatResponse>;
  resetConfig: () => Promise<ChatResponse>;
}

interface FloatingResponse {
  success: boolean;
  isFloating?: boolean;
  error?: string;
}

interface FloatingAPI {
  toggle: () => Promise<FloatingResponse>;
  getStatus: () => Promise<FloatingResponse>;
}

interface CommonSettingConfig {
  autoStartWallpaper: boolean;
  autoStartOnBoot: boolean;
  avatarEnabled: boolean;
}

interface CommonSettingResponse {
  success: boolean;
  error?: string;
}

interface CommonSettingConfigResponse extends CommonSettingResponse {
  config?: CommonSettingConfig | null;
}

interface AutoStartWallpaperResponse extends CommonSettingResponse {
  autoStartWallpaper?: boolean;
}

interface AutoStartOnBootResponse extends CommonSettingResponse {
  autoStartOnBoot?: boolean;
}

interface AvatarEnabledResponse extends CommonSettingResponse {
  avatarEnabled?: boolean;
}

interface CommonSettingAPI {
  getConfig: () => Promise<CommonSettingConfigResponse>;
  saveConfig: (config: CommonSettingConfig) => Promise<CommonSettingResponse>;
  updateConfig: (partialConfig: Partial<CommonSettingConfig>) => Promise<CommonSettingResponse>;
  resetConfig: () => Promise<CommonSettingResponse>;
  getAutoStartWallpaper: () => Promise<AutoStartWallpaperResponse>;
  setAutoStartWallpaper: (enabled: boolean) => Promise<CommonSettingResponse>;
  getAutoStartOnBoot: () => Promise<AutoStartOnBootResponse>;
  setAutoStartOnBoot: (enabled: boolean) => Promise<CommonSettingResponse>;
  getAvatarEnabled: () => Promise<AvatarEnabledResponse>;
  setAvatarEnabled: (enabled: boolean) => Promise<CommonSettingResponse>;
  toggleAvatarWithRestart: (enabled: boolean) => Promise<CommonSettingResponse>;
  onAvatarEnabledChanged: (callback: (data: { avatarEnabled: boolean }) => void) => () => void;
}

interface ShortcutConfig {
  showMainWindow: string;
  showFloatingWindow: string;
}

interface ShortcutConfigResponse {
  success: boolean;
  config?: ShortcutConfig;
  error?: string;
}

interface ShortcutUpdateResponse {
  success: boolean;
  error?: string;
}

interface ShortcutAPI {
  getConfig: () => Promise<ShortcutConfigResponse>;
  saveConfig: (config: ShortcutConfig) => Promise<ShortcutUpdateResponse>;
  updateShortcut: (key: keyof ShortcutConfig, value: string) => Promise<ShortcutUpdateResponse>;
  getShowMainWindow: () => Promise<string>;
  setShowMainWindow: (shortcut: string) => Promise<ShortcutUpdateResponse>;
  getShowFloatingWindow: () => Promise<string>;
  setShowFloatingWindow: (shortcut: string) => Promise<ShortcutUpdateResponse>;
  reset: () => Promise<ShortcutUpdateResponse>;
}

interface CustomAPI {
  wallpaper: WallpaperAPI;
  tray: TrayAPI;
  avatar: AvatarAPI;
  openai: OpenAIAPI;
  chat: ChatAPI;
  floating: FloatingAPI;
  commonSetting: CommonSettingAPI;
  shortcut: ShortcutAPI;
}

declare global {
  interface Window {
    electron: ElectronAPI;
    api: CustomAPI;
  }
}
