<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElNotification } from 'element-plus'
import SettingCard from '@renderer/components/setting/SettingCard.vue'

const config = ref({
  appId: '',
  appSecret: ''
})

const originalConfig = ref({
  appId: '',
  appSecret: ''
})

const isConfigModified = computed(() => {
  return JSON.stringify(config.value) !== JSON.stringify(originalConfig.value)
})

const handleLoadConfig = async (): Promise<void> => {
  try {
    const result = await window.api.avatar.getConfig()
    if (result.success && result.config) {
      config.value = result.config
      originalConfig.value = JSON.parse(JSON.stringify(result.config))
    }
  } catch (error: unknown) {
    console.error('加载配置失败:', error)
  }
}

const handleSaveConfig = async (): Promise<void> => {
  try {
    const result = await window.api.avatar.saveConfig({
      appId: config.value.appId,
      appSecret: config.value.appSecret
    })

    if (result.success) {
      originalConfig.value = JSON.parse(JSON.stringify(config.value))
    } else {
      ElNotification({
        type: 'error',
        customClass: 'error',
        title: `保存失败: ${result.error || '未知错误'}`
      })
    }
  } catch (error: unknown) {
    console.error('保存配置失败:', error)
    ElNotification({
      type: 'error',
      customClass: 'error',
      title: '保存配置失败'
    })
  }
}

onMounted(async () => {
  await handleLoadConfig()
})
</script>

<template>
  <SettingCard
    title="Xmov SDK"
    description="驱动 Xmov 具身数字人"
    link="https://xingyun3d.com/developers/52-183?utm_campaign=1029launch&utm_source=FAYguo"
    link-tip="配置教程"
  >
    <div class="xmov-setting">
      <el-form :model="config" label-position="left" label-width="200" class="config-form">
        <el-form-item>
          <template #label>
            <div>App ID</div>
          </template>
          <el-input v-model="config.appId" placeholder="请输入魔珐星云 App ID" />
        </el-form-item>

        <el-form-item>
          <template #label>
            <div>App Secret</div>
          </template>
          <el-input
            v-model="config.appSecret"
            type="password"
            placeholder="请输入魔珐星云 App Secret"
            show-password
          />
        </el-form-item>
      </el-form>

      <div class="actions">
        <el-button type="primary" @click="handleSaveConfig" :disabled="!isConfigModified">
          保存
        </el-button>
      </div>
    </div>
  </SettingCard>
</template>

<style scoped lang="scss">
.xmov-setting {
  display: flex;
  flex-direction: column;

  .config-form {
    flex: 1;
  }

  .actions {
    display: flex;
    justify-content: flex-end;
  }
}
</style>
