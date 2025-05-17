<template>
  <div class="app-container">
    <router-view></router-view>
    <AIConfigModal v-model:showAIConfigModal="showAIConfigModal" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AIConfigModal from './components/AIConfigModal.vue'

const showAIConfigModal = ref(false)

onMounted(() => {
  window.electronAPI.onOpenAISettings(() => {
    showAIConfigModal.value = true
  })
})
</script>

<style scoped>
.app-container {
  @apply h-screen overflow-hidden flex justify-center;
}
</style>