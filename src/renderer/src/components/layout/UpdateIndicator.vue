<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import UpdateIcon from '@renderer/icons/UpdateIcon.vue'
import type { UpdateStatus } from '@renderer/types/update'

const updateStatus = ref<UpdateStatus | null>(null)
const isExpanded = ref(false)
let removeListener: (() => void) | null = null

const shouldShow = computed(() => {
  return updateStatus.value?.downloading || updateStatus.value?.downloaded
})

const progressPercent = computed(() => {
  if (!updateStatus.value?.progress) return 0
  return Math.round(updateStatus.value.progress.percent)
})

const isDownloading = computed(() => {
  return updateStatus.value?.downloading || false
})

const isDownloaded = computed(() => {
  return updateStatus.value?.downloaded || false
})

const handleClick = async (): Promise<void> => {
  if (isDownloaded.value) {
    await window.api.update.quitAndInstall()
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

    if (status.downloaded && !isExpanded.value) {
      setTimeout(() => {
        isExpanded.value = true
      }, 300)
    }
  })
})

onUnmounted(() => {
  if (removeListener) {
    removeListener()
  }
})
</script>

<template>
  <Transition name="indicator">
    <div
      v-if="shouldShow"
      class="update-indicator"
      :class="{ expanded: isExpanded }"
      @click="handleClick"
    >
      <div class="indicator-content">
        <div class="circle-indicator">
          <svg v-if="isDownloading || isDownloaded" class="progress-ring" width="24" height="24">
            <circle class="progress-ring-bg" cx="12" cy="12" r="6" stroke-width="1" fill="none" />
            <circle
              class="progress-ring-circle"
              cx="12"
              cy="12"
              r="6"
              stroke-width="2"
              fill="none"
              :stroke-dasharray="`${2 * Math.PI * 6}`"
              :stroke-dashoffset="`${2 * Math.PI * 6 * (1 - progressPercent / 100)}`"
            />
          </svg>

          <el-icon class="arrow-icon" :size="8">
            <UpdateIcon />
          </el-icon>
        </div>

        <Transition name="text">
          <span v-if="isExpanded && isDownloaded" class="update-text">点击重启以更新</span>
        </Transition>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.update-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 24px;
  margin-right: 8px;
  cursor: pointer;
  user-select: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &.expanded {
    .indicator-content {
      width: 110px;
      padding: 0 8px 0 0;

      &:hover {
        background-color: #e0e0e0;
      }
    }
  }

  &:hover {
    opacity: 0.8;
  }

  .indicator-content {
    border-radius: 16px;
    background-color: #fff;
    display: flex;
    align-items: center;
    width: 24px;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .circle-indicator {
    position: relative;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    .progress-ring {
      position: absolute;
      top: 0;
      left: 0;
      transform: rotate(-90deg);

      .progress-ring-bg {
        stroke: rgba(255, 255, 255, 0.3);
      }

      .progress-ring-circle {
        stroke: var(--el-color-primary);
        transition: stroke-dashoffset 0.3s ease;
      }
    }

    .arrow-icon {
      color: var(--el-color-primary);
      z-index: 1;
    }
  }

  .update-text {
    color: var(--el-text-color);
    font-size: 12px;
    line-height: 12px;
    white-space: nowrap;
  }
}

.indicator-enter-active,
.indicator-leave-active {
  transition: all 0.3s ease;
}

.indicator-enter-from,
.indicator-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.text-enter-active,
.text-leave-active {
  transition: all 0.3s ease;
}

.text-enter-from,
.text-leave-to {
  opacity: 0;
  transform: translateX(-10px);
}
</style>
