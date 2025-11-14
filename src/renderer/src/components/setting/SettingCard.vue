<script setup lang="ts">
defineProps({
  id: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: '设置'
  },
  description: {
    type: String,
    default: ''
  },
  link: {
    type: String,
    default: ''
  },
  linkTip: {
    type: String,
    default: ''
  }
})

const openLink = (url: string): void => {
  if (url) {
    window.open(url, '_blank')
  }
}
</script>

<template>
  <div :id="id" class="setting-card">
    <div class="setting-card-header">
      <div class="setting-card-title-wrapper">
        <div class="setting-card-title">{{ title }}</div>
        <el-tooltip
          v-if="link"
          :disabled="!linkTip"
          effect="dark"
          :content="linkTip"
          placement="top"
          :show-arrow="false"
          offset="4"
        >
          <div v-if="link" class="setting-card-help" @click="openLink(link)">
            <span>?</span>
          </div>
        </el-tooltip>
      </div>
      <div v-if="description" class="setting-card-description">{{ description }}</div>
    </div>
    <div class="setting-card-content">
      <slot></slot>
    </div>
  </div>
</template>

<style scoped>
.setting-card {
  padding: 30px 30px;
  background: #fff;
  width: 100%;
  border-radius: 10px;
  box-sizing: border-box;

  .setting-card-header {
    margin-bottom: 30px;
  }

  .setting-card-title-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .setting-card-title {
    font-size: 18px;
    line-height: 18px;
    font-weight: 500;
  }

  .setting-card-help {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #eee;
    color: #777;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s;
    flex-shrink: 0;

    &:hover {
      background: #ddd;
    }

    span {
      line-height: 1;
    }
  }

  .setting-card-description {
    font-size: 12px;
    line-height: 14px;
    font-weight: 400;
    color: #999;
    margin-top: 8px;
  }
}
</style>
