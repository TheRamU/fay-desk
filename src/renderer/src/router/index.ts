import { createRouter, createWebHashHistory } from 'vue-router'
import ChatView from '@renderer/views/ChatView.vue'
import WallpaperView from '@renderer/views/WallpaperView.vue'
import SettingView from '@renderer/views/SettingView.vue'
import AboutView from '@renderer/views/AboutView.vue'
import FloatingChatView from '@renderer/views/FloatingChatView.vue'

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    {
      path: '/',
      redirect: '/chat'
    },
    {
      path: '/chat',
      name: 'chat',
      component: ChatView
    },
    {
      path: '/wallpaper',
      name: 'wallpaper',
      component: WallpaperView
    },
    {
      path: '/setting',
      name: 'setting',
      component: SettingView
    },
    {
      path: '/about',
      name: 'about',
      component: AboutView
    },
    {
      path: '/floating',
      name: 'floating',
      component: FloatingChatView
    }
  ]
})

export default router
