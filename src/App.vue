<template>
  <div class="app-container">
    <router-view></router-view>
    <AIConfigModal v-model:showAIConfigModal="showAIConfigModal" />
    <div v-if="showAbout" class="modal-overlay" @click="closeAbout"></div>
    <div v-if="showAbout" class="modal">
      <About @close="closeAbout" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AIConfigModal from './components/AIConfigModal.vue'
import About from './views/About.vue'

const showAIConfigModal = ref(false)
const showAbout = ref(false)

onMounted(() => {
  window.electronAPI.onOpenAISettings(() => {
    showAIConfigModal.value = true
  })
  if (window.electronAPI && window.electronAPI.onOpenAboutPage) {
    window.electronAPI.onOpenAboutPage(() => {
      showAbout.value = true
    })
  }
})

function closeAbout() {
  showAbout.value = false
}
</script>

<style scoped>
.app-container {
  @apply h-screen overflow-hidden flex justify-center;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}
.modal {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 1001;
}
</style>