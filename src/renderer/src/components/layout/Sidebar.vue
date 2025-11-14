<script setup lang="ts">
import { useRoute } from 'vue-router'
import { computed } from 'vue'
import GitHubIcon from '@renderer/icons/GitHubIcon.vue'
import packageJson from '../../../../../package.json'
import ChatIcon from '@renderer/icons/ChatIcon.vue'
import WallpaperIcon from '@renderer/icons/WallpaperIcon.vue'
import SettingIcon from '@renderer/icons/SettingIcon.vue'
import AboutIcon from '@renderer/icons/AboutIcon.vue'
import FayDeskLogo from '@renderer/components/FayDeskLogo.vue'

const route = useRoute()
const version = packageJson.version

const activeIndex = computed(() => route.path || '/chat')

const openGitHub = (): void => {
  window.open('https://github.com/TheRamU/fay-desk', '_blank')
}
</script>

<template>
  <div class="sidebar">
    <div class="sidebar-drag-area">
      <FayDeskLogo :light="true" />
    </div>

    <el-menu class="sidebar-menu" :default-active="activeIndex" router>
      <el-menu-item index="/chat">
        <el-icon><ChatIcon /></el-icon>
        <span>对话聊天</span>
      </el-menu-item>
      <el-menu-item index="/wallpaper">
        <el-icon><WallpaperIcon /></el-icon>
        <span>Live 壁纸</span>
      </el-menu-item>
      <el-menu-item index="/setting">
        <el-icon><SettingIcon /></el-icon>
        <span>设置</span>
      </el-menu-item>
      <el-menu-item index="/about">
        <el-icon><AboutIcon /></el-icon>
        <span>关于</span>
      </el-menu-item>
    </el-menu>
    <div class="sidebar-footer">
      <span class="version-text">v{{ version }}</span>
      <el-icon class="github-button" @click="openGitHub"><GitHubIcon /></el-icon>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sidebar {
  width: 250px;
  height: 100%;
  box-sizing: border-box;

  padding: 0 20px 20px 20px;
  display: flex;
  flex-direction: column;

  .sidebar-drag-area {
    box-sizing: border-box;
    height: 70px;
    display: flex;
    align-items: center;
    -webkit-app-region: drag;
  }

  .sidebar-footer {
    padding-left: 10px;
    margin-top: auto;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .version-text {
      font-size: 12px;
      color: #999;
      user-select: none;
    }

    .github-button {
      cursor: pointer;
      width: 30px;
      height: 30px;
      border-radius: 6px;
      font-size: 18px;
      color: #888;
      background: transparent;
      transition: all 0.2s ease-in-out;

      &:hover {
        background: #ddd;
      }
    }
  }
}

:deep(.sidebar-menu) {
  --el-menu-level: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border: none;
  background: transparent;
  box-sizing: border-box;
  padding: 0;

  .el-menu-item {
    font-size: 14px;
    line-height: 14px;
    height: 40px;
    border-radius: 8px;
    padding: 10px !important;
    user-select: none;
    transition: all 0.1s ease-in-out;
    color: #0b0b0b;

    &.is-active,
    &:hover {
      background: var(--el-bg-color);
      box-shadow: 2px 6px 12px 0 rgba(0, 0, 0, 0.05);
      color: var(--el-color-primary);
    }

    .el-icon {
      font-size: 14px;
    }
  }
}
</style>
