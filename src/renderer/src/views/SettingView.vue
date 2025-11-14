<template>
  <div class="setting-view">
    <div class="setting-container">
      <CommonSetting />
      <ShortcutSetting />
      <ChatSetting />
      <XmovSetting />
      <OpenAISetting />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import XmovSetting from '@renderer/components/setting/XmovSetting.vue'
import OpenAISetting from '@renderer/components/setting/OpenAISetting.vue'
import ChatSetting from '@renderer/components/setting/ChatSetting.vue'
import CommonSetting from '@renderer/components/setting/CommonSetting.vue'
import ShortcutSetting from '@renderer/components/setting/ShortcutSetting.vue'

const route = useRoute()

const scrollToSection = async (sectionId: string): Promise<void> => {
  if (!sectionId) return

  await nextTick()

  const element = document.getElementById(sectionId)

  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}

onMounted(async () => {
  const section = route.query.section as string
  if (section) {
    setTimeout(() => {
      scrollToSection(section)
    }, 100)
  }
})
</script>

<style scoped lang="scss">
.setting-view {
  height: 100%;
  overflow-y: auto;
  padding-right: 16px;
  margin-right: 4px;

  .setting-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-width: 1000px;
    margin: 0 auto;
  }

  &::-webkit-scrollbar {
    width: 4px;
    height: 4px;
    background-color: transparent;
  }
  &::-webkit-scrollbar-thumb {
    background-color: #ccc;
    border-radius: 4px;

    &:hover {
      background-color: #aaa;
    }
  }
  &::-webkit-scrollbar-track {
    background-color: transparent;
  }
}
</style>
