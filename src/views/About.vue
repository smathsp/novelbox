<template>
  <div class="about-page">
    <div class="close-button" @click="$emit('close')">×</div>
    <div class="about-header">
      <img src="/icon.ico" alt="NovelBox Logo" class="logo" />
      <h1>NovelBox</h1>
      <p>版本：{{ version }}</p>
      <p>一个专业的小说写作工具</p>
      <p>反馈邮箱：novelbox.feedback@gmail.com</p>
      <p>QQ群：461287820</p>
      <p class="license">采用 GNU 通用公共许可证 v3.0（GPL-3.0）</p>
    </div>
    <div class="about-actions">
      <button @click="checkUpdate">检查更新</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const version = ref('')

const checkUpdate = () => {
  if (window.electronAPI && window.electronAPI.openExternal) {
    window.electronAPI.openExternal('https://docs.qq.com/doc/DU2ZhVnZMR0tDSWt3')
  }
}

onMounted(() => {
  // 获取版本号
  if (window.electronAPI && window.electronAPI.getVersion) {
    window.electronAPI.getVersion().then((v: string) => {
      version.value = v
    })
  } else {
    version.value = '未知'
  }
})

</script>

<style scoped>
.about-page {
  max-width: 400px;
  margin: 40px auto;
  padding: 32px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 16px rgba(0,0,0,0.08);
  text-align: center;
  position: relative;
}

.close-button {
  position: absolute;
  top: 8px;
  right: 8px;
  width: 24px;
  height: 24px;
  line-height: 24px;
  text-align: center;
  border-radius: 50%;
  background: #f5f5f5;
  color: #666;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.about-page:hover .close-button {
  opacity: 1;
}

.close-button:hover {
  background: #e0e0e0;
  color: #333;
}

.logo {
  width: 80px;
  height: 80px;
  margin-bottom: 16px;
}
.about-header h1 {
  font-size: 2rem;
  margin-bottom: 8px;
}
.about-actions {
  margin-top: 32px;
}
button {
  padding: 8px 24px;
  border: none;
  border-radius: 8px;
  background: #409eff;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  margin-bottom: 12px;
}
button:disabled {
  background: #aaa;
  cursor: not-allowed;
}
.update-status {
  margin-top: 12px;
  color: #409eff;
}
.progress-bar {
  width: 100%;
  height: 8px;
  background: #eee;
  border-radius: 4px;
  margin: 12px 0;
  overflow: hidden;
}
.progress {
  height: 100%;
  background: #409eff;
  transition: width 0.3s;
}
.license {
  font-size: 0.9em;
  color: #666;
  margin-top: 16px;
}
</style> 