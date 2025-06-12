<template>
  <div class="settings-container">
    <div class="settings-header">
      <h1>系统设置</h1>
      <button @click="$emit('close')" class="close-button">×</button>
    </div>
    
    <div class="settings-content">
      <div class="setting-item">
        <div class="setting-label">工作区路径</div>
        <div class="setting-control">
          <div class="input-with-button">
            <input 
              id="workspace-path" 
              v-model="workspacePath" 
              type="text" 
              placeholder="请选择工作区路径"
              readonly
            />
            <button @click="selectWorkspace" class="browse-button">浏览</button>
          </div>
        </div>
      </div>
      
      <div class="divider"></div>
      
      <div class="setting-item">
        <div class="setting-label">使用系统代理</div>
        <div class="setting-control">
          <div class="toggle-switch">
            <input 
              id="use-proxy" 
              type="checkbox" 
              v-model="useSystemProxy" 
              @change="toggleProxy"
            />
            <label for="use-proxy"></label>
          </div>
        </div>
      </div>
      
      <div class="setting-hint">
        系统默认使用系统代理，如需使用AI配置中的代理，请关闭此选项
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const emit = defineEmits(['close']);

// 状态
const workspacePath = ref('');
const useSystemProxy = ref(false);

// 初始化设置
onMounted(() => {
  // 从localStorage读取工作区路径
  const savedPath = localStorage.getItem('workspacePath');
  if (savedPath) {
    workspacePath.value = savedPath;
  }
  
  // 从localStorage读取代理设置
  const proxyEnabled = localStorage.getItem('useSystemProxy');
  useSystemProxy.value = proxyEnabled !== 'false'; // 默认为true
});

// 选择工作区
const selectWorkspace = async () => {
  try {
    await window.electronAPI.changeWorkspace(true);
  } catch (error) {
    console.error('更换工作区失败:', error);
  }
};

// 切换代理
const toggleProxy = async () => {
  try {
    // 保存设置到localStorage
    localStorage.setItem('useSystemProxy', useSystemProxy.value.toString());
  } catch (error) {
    console.error('设置代理失败:', error);
    useSystemProxy.value = !useSystemProxy.value; // 恢复之前的状态
  }
};
</script>

<style scoped>
.settings-container {
  width: 450px;
  max-width: 90vw;
  padding: 0;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #eaeaea;
}

.settings-header h1 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  color: #333;
}

.settings-content {
  padding: 0;
}

.close-button {
  font-size: 22px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 8px;
  color: #666;
  transition: color 0.2s;
}

.close-button:hover {
  color: #000;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: #333;
}

.setting-control {
  flex: 1;
  max-width: 260px;
  display: flex;
  justify-content: flex-end;
}

.divider {
  height: 1px;
  background-color: #eaeaea;
  margin: 0;
}

.input-with-button {
  display: flex;
  width: 100%;
  gap: 8px;
}

input[type="text"] {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: #f8f9fa;
  color: #333;
}

input[type="text"]:focus {
  border-color: #4a90e2;
  outline: none;
}

.browse-button {
  padding: 8px 12px;
  background-color: #4a90e2;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  white-space: nowrap;
}

.browse-button:hover {
  background-color: #357ab8;
}

/* 开关样式 */
.toggle-switch {
  position: relative;
  width: 44px;
  height: 22px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-switch label {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  transition: .3s;
  border-radius: 22px;
}

.toggle-switch label:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: .3s;
  border-radius: 50%;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.toggle-switch input:checked + label {
  background-color: #4a90e2;
}

.toggle-switch input:checked + label:before {
  transform: translateX(22px);
}

.setting-hint {
  padding: 0 24px 16px;
  font-size: 12px;
  color: #888;
  margin-top: -8px;
  text-align: right;
}

.note {
  color: #ff9800;
  font-style: italic;
}
</style> 