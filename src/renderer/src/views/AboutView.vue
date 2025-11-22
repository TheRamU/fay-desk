<template>
  <div class="about-view">
    <div class="about-content">
      <div class="logo-section">
        <el-icon class="logo-icon">
          <LogoIcon />
        </el-icon>
        <div class="logo-text">FayDesk</div>
        <div class="logo-version">版本: v{{ version }}</div>
      </div>

      <div class="action-section">
        <el-button type="primary" :icon="GitHubIcon" class="action-btn" @click="openGithub">
          Github
        </el-button>
        <el-button
          :icon="UpdateIcon"
          :loading="isCheckingUpdate || isDownloading"
          :disabled="isButtonDisabled"
          class="action-btn"
          @click="handleUpdateButtonClick"
        >
          {{ buttonText }}
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElNotification } from 'element-plus'
import GitHubIcon from '@renderer/icons/GitHubIcon.vue'
import LogoIcon from '@renderer/icons/LogoIcon.vue'
import packageJson from '../../../../package.json'
import UpdateIcon from '@renderer/icons/UpdateIcon.vue'
import type { UpdateStatus } from '@renderer/types/update'

const version = packageJson.version

const isCheckingUpdate = ref(false)
const updateStatus = ref<UpdateStatus | null>(null)
let removeListener: (() => void) | null = null

const isDownloading = computed(() => {
  return updateStatus.value?.downloading || false
})

const isDownloaded = computed(() => {
  return updateStatus.value?.downloaded || false
})

const buttonText = computed(() => {
  if (isDownloading.value) {
    return '正在下载更新'
  }
  if (isDownloaded.value) {
    return '点击重启以更新'
  }
  return '检查更新'
})

const isButtonDisabled = computed(() => {
  return isCheckingUpdate.value || isDownloading.value
})

const openGithub = (): void => {
  const githubUrl = 'https://github.com/TheRamU/fay-desk'
  window.open(githubUrl, '_blank')
}

const checkForUpdates = async (): Promise<void> => {
  isCheckingUpdate.value = true

  try {
    const result = await window.api.update.check()

    isCheckingUpdate.value = false

    if (!result.success) {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: '检查更新失败',
        message: result.error || '请稍后重试'
      })
      return
    }

    if (result.status?.available) {
      await window.api.update.download()
    } else {
      ElNotification({
        type: 'success',
        title: '当前已是最新版本'
      })
    }
  } catch (error) {
    console.error('检查更新失败:', error)
    isCheckingUpdate.value = false
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '检查更新失败',
      message: '请稍后重试'
    })
  }
}

const handleUpdateButtonClick = async (): Promise<void> => {
  if (isDownloaded.value) {
    await window.api.update.quitAndInstall()
  } else {
    await checkForUpdates()
  }
}

const loadStatus = async (): Promise<void> => {
  try {
    const result = await window.api.update.getStatus()
    if (result.success && result.status) {
      updateStatus.value = result.status
    }
  } catch (error) {
    console.error('获取更新状态失败:', error)
  }
}

onMounted(async () => {
  await loadStatus()

  removeListener = window.api.update.onStatusChanged((status: UpdateStatus) => {
    updateStatus.value = status
  })
})

onUnmounted(() => {
  if (removeListener) {
    removeListener()
  }
})
</script>

<style scoped lang="scss">
.about-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  box-sizing: border-box;
  margin-right: 20px;
  border-radius: 8px;
  overflow-y: auto;
  background-color: #fff;
}

.about-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px;
  margin-bottom: 50px;
  box-sizing: border-box;
  gap: 20px;

  .logo-section {
    .logo-icon {
      font-size: 150px;
    }

    .logo-text {
      font-size: 24px;
      font-weight: 500;
      letter-spacing: 1px;
      text-align: center;
      color: #333;
    }

    .logo-version {
      font-size: 16px;
      color: #666;
      text-align: center;
      margin-top: 16px;
    }
  }

  .action-section {
    display: flex;
    flex-wrap: wrap;

    .action-btn {
      min-width: 100px;
    }
  }
}
</style>
