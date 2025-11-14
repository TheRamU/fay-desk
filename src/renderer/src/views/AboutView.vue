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
          v-if="false"
          :icon="Refresh"
          :loading="isCheckingUpdate"
          class="action-btn"
          @click="checkForUpdates"
        >
          检查更新
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElNotification } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import GitHubIcon from '@renderer/icons/GitHubIcon.vue'
import LogoIcon from '@renderer/icons/LogoIcon.vue'
import packageJson from '../../../../package.json'
const version = packageJson.version

const isCheckingUpdate = ref(false)

const openGithub = (): void => {
  const githubUrl = 'https://github.com/TheRamU/fay-desk'
  window.open(githubUrl, '_blank')
}

const checkForUpdates = async (): Promise<void> => {
  isCheckingUpdate.value = true

  try {
    await new Promise((resolve) => setTimeout(resolve, 2000))

    ElMessage.success('当前已是最新版本')
  } catch (error) {
    console.error('检查更新失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '检查更新失败，请稍后重试'
    })
  } finally {
    isCheckingUpdate.value = false
  }
}
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
