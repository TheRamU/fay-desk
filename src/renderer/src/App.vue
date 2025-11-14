<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TitleBar from './components/layout/TitleBar.vue'
import Sidebar from '@renderer/components/layout/Sidebar.vue'

const route = useRoute()
const router = useRouter()
const isFloatingMode = computed(() => route.path === '/floating')

const handleNavigateToRoute = (_event: any, routePath: string) => {
  router.push(routePath)
}

onMounted(() => {
  window.electron.ipcRenderer.on('navigate-to-route', handleNavigateToRoute)
})

onUnmounted(() => {
  window.electron.ipcRenderer.removeListener('navigate-to-route', handleNavigateToRoute)
})
</script>

<template>
  <!-- 悬浮窗模式：直接显示路由内容 -->
  <router-view v-if="isFloatingMode" />

  <!-- 正常模式：显示完整布局 -->
  <div v-else class="app-container">
    <Sidebar />
    <div class="app-right">
      <TitleBar />
      <div class="app-main">
        <router-view />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-container {
  background-color: #f0f6f6;
  height: 100vh;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.app-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.app-main {
  flex: 1;
  overflow: auto;
  box-sizing: border-box;
  margin: 0 0 20px;
}
</style>
