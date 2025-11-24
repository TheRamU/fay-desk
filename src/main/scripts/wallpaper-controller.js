/**
 * 壁纸 WebSocket 控制脚本
 * 通过 WebSocket 接收渲染进程的控制指令
 * 端口号将在运行时注入：window.__WS_PORT__
 * 数字人开关状态将在运行时注入：window.__AVATAR_ENABLED__
 */

;(function () {
  const avatarEnabled = window.__AVATAR_ENABLED__ !== false

  window.avatarState = {
    connected: false,
    loading: false,
    currentSubtitle: '',
    wsConnected: false,
    avatarEnabled: avatarEnabled
  }

  let errorHideTimer = null
  let subtitleHideTimer = null

  const IDLE_TIMEOUT = 60 * 1000
  let idleTimer = null
  let isOnlineMode = true

  const WAKEUP_DELAY = 2 * 1000
  let wakeupTime = null
  let pendingCommands = []
  let wakeupExecutionTimer = null

  const ui = {
    showSubtitle(text) {
      const subtitleEl = document.getElementById('subtitle')
      if (subtitleEl) {
        subtitleEl.textContent = text
        subtitleEl.classList.add('show')
        window.avatarState.currentSubtitle = text
      }
    },

    hideSubtitle() {
      const subtitleEl = document.getElementById('subtitle')
      if (subtitleEl) {
        subtitleEl.classList.remove('show')
        window.avatarState.currentSubtitle = ''
      }
    },

    updateStatus(status, text) {
      const statusEl = document.getElementById('status')
      const statusTextEl = statusEl?.querySelector('.status-text')

      if (!statusEl || !statusTextEl) return

      if (errorHideTimer) {
        clearTimeout(errorHideTimer)
        errorHideTimer = null
      }

      if (!status) {
        statusEl.classList.remove('show', 'loading', 'error')
        statusTextEl.textContent = ''
        return
      }

      statusEl.className = 'status-indicator show ' + status
      statusTextEl.textContent = text || ''
    }
  }

  // ==================== Avatar API ====================
  window.avatarAPI = {
    getContainerId: () => 'xmov-avatar',
    showSubtitle: (text) => ui.showSubtitle(text),
    hideSubtitle: () => ui.hideSubtitle(),

    showError: (text = '发生错误') => {
      ui.updateStatus('error', text)

      if (errorHideTimer) {
        clearTimeout(errorHideTimer)
      }
      // 3秒后自动隐藏错误提示
      errorHideTimer = setTimeout(() => {
        window.avatarAPI.hideError()
        errorHideTimer = null
      }, 3000)
    },

    hideError: () => {
      ui.updateStatus(null)
    },

    showLoading: (text = '正在加载...') => {
      window.avatarState.loading = true
      ui.updateStatus('loading', text)
    },

    hideLoading: () => {
      window.avatarState.loading = false
      ui.updateStatus(null)
    },

    setConnected: (connected) => {
      window.avatarState.connected = connected
      if (connected) {
        window.avatarAPI.hideLoading()
      }
    }
  }

  async function loadSDK() {
    if (!avatarEnabled) {
      return { success: false, error: '数字人功能已禁用' }
    }

    try {
      // 加载外部 SDK 脚本
      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })

      await new Promise((resolve, reject) => {
        const script = document.createElement('script')
        script.src =
          'https://media.xingyun3d.com/xingyun3d/general/litesdk/xmovAvatar.0.1.0-alpha.72.js'
        script.onload = resolve
        script.onerror = reject
        document.head.appendChild(script)
      })

      if (window.CryptoJS && !window.CryptoJSTest) {
        window.CryptoJSTest = window.CryptoJS
      }

      // 注入自定义样式
      const style = document.createElement('style')
      style.textContent = `
        /* 移除数字人的位置和变换样式，修复位置异常问题 */
        #xmov-avatar > div canvas {
          position: static !important;
          transform: none !important;
          left: 0 !important;
          top: 0 !important;
        }

        #xmov-avatar > div #avatar-bg-container {
          display: none !important;
        }
      `
      document.head.appendChild(style)

      window.avatarAPI.hideLoading()

      return { success: true }
    } catch (error) {
      console.error('[Wallpaper Controller] SDK 加载失败:', error)
      window.avatarAPI.showError('SDK 加载失败: ' + error.message)
      return { success: false, error: error.message }
    }
  }

  function createContainer(containerId) {
    const container = document.getElementById('xmov-avatar')
    if (container) {
      container.innerHTML = ''
      const sdkContainer = document.createElement('div')
      sdkContainer.id = containerId
      sdkContainer.style.height = '100%'
      container.appendChild(sdkContainer)
      return { success: true }
    }
    return { success: false, error: '未找到容器元素' }
  }

  async function connectAvatar(config) {
    if (!avatarEnabled) {
      return { success: false, error: '数字人功能已禁用' }
    }

    try {
      if (!window.XmovAvatar) throw new Error('XmovAvatar SDK 未加载')

      window.avatarAPI.showLoading('正在连接数字人...')

      // Promise 包装以支持错误处理
      await new Promise((resolve, reject) => {
        let initError = null

        const sdkConfig = {
          containerId: '#' + config.containerId,
          appId: config.appId,
          appSecret: config.appSecret,
          enableDebugger: false,
          gatewayServer:
            'https://nebula-agent.xingyun3d.com/user/v1/ttsa/session?data_source=2&custom_id=fay-desk',
          onWidgetEvent: (event) => {
            if (event.type === 'subtitle_on') {
              if (subtitleHideTimer) {
                clearTimeout(subtitleHideTimer)
                subtitleHideTimer = null
              }

              window.avatarAPI.showSubtitle(event.text)
              sendMessage({
                type: 'subtitle_on',
                data: { text: event.text }
              })

              resetIdleTimer()

              // 10秒超时防止网络掉线导致字幕卡住
              subtitleHideTimer = setTimeout(() => {
                window.avatarAPI.hideSubtitle()
                sendMessage({
                  type: 'subtitle_off'
                })
                subtitleHideTimer = null
              }, 10000)
            } else if (event.type === 'subtitle_off') {
              if (subtitleHideTimer) {
                clearTimeout(subtitleHideTimer)
                subtitleHideTimer = null
              }

              window.avatarAPI.hideSubtitle()
              sendMessage({
                type: 'subtitle_off'
              })
            }
          },
          onStateChange: () => {},
          onMessage: (error) => {
            reject(error)
          }
        }

        window.avatarInstance = new window.XmovAvatar(sdkConfig)

        let initProgress = 0

        window.avatarInstance
          .init({
            onDownloadProgress: (progress) => {
              if (progress <= initProgress) return
              initProgress = progress
              if (!window.avatarState.connected) {
                window.avatarAPI.showLoading(
                  '初始化中 ' + Math.min(100.0, (progress / 40.0) * 100.0).toFixed(1) + '%'
                )
              }
            },
            onError: (error) => {
              const errorMsg = error?.message || String(error)
              console.error('[Wallpaper Controller] 初始化错误:', errorMsg)
              reject(new Error(error))
            },
            onClose: () => {
              if (!window.avatarState.connected && !initError) {
                reject(new Error('连接在初始化过程中关闭'))
              }
            }
          })
          .then(() => {
            resolve()
          })
          .catch((error) => {
            reject(error)
          })
      })

      resetIdleTimer()
      window.avatarAPI.showLoading('连接成功')
      window.avatarAPI.setConnected(true)

      return { success: true }
    } catch (error) {
      const errorMsg = error?.message || String(error)
      console.error('[Wallpaper Controller] 连接失败:', errorMsg)
      window.avatarAPI.showError('连接失败: ' + errorMsg)

      // 清理失败的 SDK 实例
      if (window.avatarInstance) {
        try {
          window.avatarInstance.destroy()
        } catch (destroyError) {
          console.error('[Wallpaper Controller] 清理实例失败:', destroyError)
        }
        window.avatarInstance = null
      }

      return { success: false, error: errorMsg }
    }
  }

  function disconnectAvatar() {
    if (window.avatarInstance) {
      try {
        window.avatarInstance.stop()
        window.avatarInstance.destroy()
        window.avatarInstance = null
        return { success: true }
      } catch (error) {
        console.error('[Wallpaper Controller] 断开失败:', error)
        return { success: false, error: error.message }
      }
    }
    return { success: true }
  }

  async function speak(text) {
    try {
      if (window.avatarInstance) {
        await window.avatarInstance.speak(text)
        return { success: true }
      } else {
        return { success: false, error: '数字人实例不存在' }
      }
    } catch (error) {
      console.error('[Wallpaper Controller] 播报失败:', error)
      return { success: false, error: error.message }
    }
  }

  async function speakStream(text, isStart, isEnd) {
    try {
      if (window.avatarInstance) {
        window.avatarInstance.speak(text, isStart, isEnd)
        return { success: true }
      } else {
        return { success: false, error: '数字人实例不存在' }
      }
    } catch (error) {
      console.error('[Wallpaper Controller] 流式播报失败:', error)
      return { success: false, error: error.message }
    }
  }

  async function interactiveIdle() {
    try {
      if (window.avatarInstance) {
        // 切换到待机互动状态，打断当前播报
        window.avatarInstance.interactiveidle()
        return { success: true }
      } else {
        return { success: false, error: '数字人实例不存在' }
      }
    } catch (error) {
      console.error('[Wallpaper Controller] 切换状态失败:', error)
      return { success: false, error: error.message }
    }
  }

  // 进入离线模式
  function enterOfflineMode() {
    try {
      if (
        isOnlineMode &&
        window.avatarInstance &&
        typeof window.avatarInstance.offlineMode === 'function'
      ) {
        console.log('[Wallpaper Controller] 进入离线模式')
        window.avatarInstance.offlineMode()
        isOnlineMode = false
      }
    } catch (error) {
      console.error('[Wallpaper Controller] 进入离线模式失败:', error)
    }
  }

  // 恢复在线状态
  function enterOnlineMode() {
    try {
      if (
        !isOnlineMode &&
        window.avatarInstance &&
        typeof window.avatarInstance.onlineMode === 'function'
      ) {
        console.log('[Wallpaper Controller] 恢复在线模式')
        window.avatarInstance.onlineMode()
        isOnlineMode = true
      }
    } catch (error) {
      console.error('[Wallpaper Controller] 恢复在线模式失败:', error)
    }
  }

  // 执行缓存的命令
  async function executePendingCommands() {
    if (pendingCommands.length === 0) return

    if (!window.avatarInstance) {
      pendingCommands = []
      return
    }

    const commands = [...pendingCommands]
    pendingCommands = []

    for (const cmd of commands) {
      try {
        if (!window.avatarInstance) {
          break
        }

        let result
        if (cmd.type === 'speak') {
          result = await speak(cmd.data.text)
        } else if (cmd.type === 'speakStream') {
          result = await speakStream(cmd.data.text, cmd.data.isStart, cmd.data.isEnd)
        }

        // 发送响应
        if (cmd.id) {
          sendMessage({ type: 'response', id: cmd.id, result })
        }
      } catch (error) {
        console.error('[Wallpaper Controller] 执行缓存命令失败:', error)
        if (cmd.id) {
          sendMessage({
            type: 'response',
            id: cmd.id,
            result: { success: false, error: error.message }
          })
        }
      }
    }
  }

  function cancelPendingCommands() {
    if (pendingCommands.length > 0) {
      pendingCommands = []
    }
    if (wakeupExecutionTimer) {
      clearTimeout(wakeupExecutionTimer)
      wakeupExecutionTimer = null
    }
  }

  // 重置空闲定时器
  function resetIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }

    enterOnlineMode()

    idleTimer = setTimeout(() => {
      enterOfflineMode()
      idleTimer = null
    }, IDLE_TIMEOUT)
  }

  let ws = null
  let reconnectTimer = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5

  async function handleSpeakMessage(type, data, id) {
    resetIdleTimer()

    // 检查是否刚被唤醒
    const now = Date.now()
    if (wakeupTime && now - wakeupTime < WAKEUP_DELAY) {
      // 缓存命令
      pendingCommands.push({ type, data, id })
      return null // 不发送响应，等执行时再发送
    } else {
      if (type === 'speak') {
        return await speak(data.text)
      } else {
        return await speakStream(data.text, data.isStart, data.isEnd)
      }
    }
  }

  async function handleInteractiveIdleMessage() {
    const wasOfflineMode = !isOnlineMode

    resetIdleTimer()

    const result = await interactiveIdle()

    // 只有当从离线模式切换到在线模式时才缓存命令
    if (wasOfflineMode) {
      wakeupTime = Date.now()
      cancelPendingCommands()
      wakeupExecutionTimer = setTimeout(() => {
        executePendingCommands()
        wakeupExecutionTimer = null
      }, WAKEUP_DELAY)
    } else {
      wakeupTime = null
      cancelPendingCommands()
    }

    return result
  }

  function connectWebSocket() {
    if (typeof window.__WS_PORT__ === 'undefined') {
      console.error('[Wallpaper Controller] WebSocket 端口未注入')
      setTimeout(connectWebSocket, 1000)
      return
    }

    const wsUrl = `ws://localhost:${window.__WS_PORT__}`

    try {
      ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        window.avatarState.wsConnected = true
        reconnectAttempts = 0

        sendMessage({ type: 'ready', data: { state: window.avatarState } })
      }

      ws.onmessage = async (event) => {
        let message
        try {
          message = JSON.parse(event.data)

          const { type, data, id } = message
          let result

          switch (type) {
            case 'loadSDK':
              result = await loadSDK()
              break

            case 'createContainer':
              result = createContainer(data.containerId)
              break

            case 'connectAvatar':
              result = await connectAvatar(data)
              break

            case 'disconnectAvatar':
              result = disconnectAvatar()
              break

            case 'speak':
            case 'speakStream':
              result = await handleSpeakMessage(type, data, id)
              break

            case 'interactiveIdle':
              result = await handleInteractiveIdleMessage()
              break

            case 'getState':
              result = { success: true, state: window.avatarState }
              break

            default:
              result = { success: false, error: '未知的消息类型: ' + type }
          }

          if (id && result !== null) {
            sendMessage({ type: 'response', id, result })
          }
        } catch (error) {
          console.error('[Wallpaper Controller] 处理消息失败:', error)
          if (message && message.id) {
            sendMessage({
              type: 'response',
              id: message.id,
              result: { success: false, error: error.message }
            })
          }
        }
      }

      ws.onerror = (error) => {
        console.error('[Wallpaper Controller] WebSocket 错误:', error)
        window.avatarState.wsConnected = false
      }

      ws.onclose = () => {
        window.avatarState.wsConnected = false
        ws = null

        // 指数退避重连，最大延迟 10 秒
        if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
          reconnectTimer = setTimeout(connectWebSocket, delay)
        } else {
          console.error('[Wallpaper Controller] 达到最大重连次数，停止重连')
        }
      }
    } catch (error) {
      console.error('[Wallpaper Controller] 创建 WebSocket 失败:', error)
    }
  }

  function sendMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message))
    }
  }

  if (avatarEnabled) {
    window.avatarAPI.showLoading('正在加载 SDK...')
  }

  connectWebSocket()

  window.addEventListener('beforeunload', () => {
    if (reconnectTimer) clearTimeout(reconnectTimer)
    if (subtitleHideTimer) clearTimeout(subtitleHideTimer)
    if (idleTimer) clearTimeout(idleTimer)
    if (wakeupExecutionTimer) clearTimeout(wakeupExecutionTimer)
    if (ws) ws.close()
  })
})()
