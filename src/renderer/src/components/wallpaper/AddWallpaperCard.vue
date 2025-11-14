<template>
  <div class="add-wallpaper-card">
    <div class="add-card-cover" @click="onAddClick">
      <div class="add-icon-container">
        <el-icon class="add-icon" :size="48">
          <Plus />
        </el-icon>
      </div>
      <div class="hover-overlay">
        <el-icon class="add-icon-hover" :size="48">
          <Plus />
        </el-icon>
      </div>
    </div>
    <div class="add-wallpaper-name">新增壁纸</div>
  </div>
</template>

<script setup lang="ts">
import { ElNotification } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'

const emit = defineEmits<{
  refresh: []
}>()

const onAddClick = async () => {
  try {
    const result = await window.api.wallpaper.importWallpaper()

    if (result.success) {
      emit('refresh')
    } else if (result.error) {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: result.error
      })
    }
  } catch (error: any) {
    console.error('导入壁纸出错:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '导入壁纸出错: ' + (error.message || '未知错误')
    })
  }
}
</script>

<style scoped lang="scss">
.add-wallpaper-card {
  cursor: pointer;
}

.add-card-cover {
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 宽高比 */
  background: transparent;
  overflow: hidden;
  border-radius: 8px;
  border: 2px dashed #d0d0d0;
  transition: all 0.3s ease;

  &:hover {
    border-color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.add-icon-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.add-icon {
  color: #d0d0d0;
  transition: all 0.3s ease;
}

.add-card-cover:hover .add-icon {
  color: var(--el-color-primary);
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 1;
}

.add-card-cover:hover .hover-overlay {
  opacity: 1;
}

.add-icon-hover {
  color: var(--el-color-primary);
  transition: transform 0.2s ease;
}

.add-wallpaper-name {
  margin-top: 8px;
  font-size: 14px;
  color: #666;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.add-wallpaper-card:hover .add-wallpaper-name {
  color: var(--el-color-primary);
}
</style>
