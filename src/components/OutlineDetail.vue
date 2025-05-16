<template>
  <div v-if="show" class="outline-detail-panel">
    <div class="outline-header">
      <h2 class="text-xl font-bold">细纲</h2>
      <button @click="$emit('close')" class="close-btn">
        <span class="close-icon">×</span>
      </button>
    </div>
    <div class="chapter-input">
      <span class="chapter-label">第</span>
      <input v-model="chapterNumber" type="number" class="chapter-number" required placeholder="章节编号" min="1"
        @input="validateChapterNumber" />
      <span class="chapter-label">章</span>
    </div>
    <div class="outline-content">
      <textarea v-model="detailContent" class="content-input" placeholder="请输入本章细纲..." @input="saveContent"
        :disabled="isGenerating"></textarea>
      <div class="button-group">
        <button @click="generateAIContent" class="ai-btn"
          :disabled="isGenerating || !detailContent.trim() || !chapterNumber">
          {{ isGenerating ? '生成中...' : 'AI润色' }}
        </button>
        <button @click="saveContent" class="save-btn" :disabled="!detailContent.trim() || !chapterNumber">
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import AIService from '../services/aiService'
import { replacePromptVariables } from '../services/promptVariableService'
import { AIConfigService } from '../services/aiConfigService'
import { BookConfigService, type Chapter, type Book } from '../services/bookConfigService'

const props = defineProps<{
  show: boolean
  currentChapter: Chapter | null
  currentBook: Book | null
}>()

defineEmits(['close'])

const chapterNumber = ref('')
const detailContent = ref('')
const isGenerating = ref(false)

const validateChapterNumber = () => {
  const num = parseInt(chapterNumber.value)
  if (num < 1) {
    chapterNumber.value = '1'
  }
}

let aiService: AIService

const generateAIContent = async () => {
  if (!detailContent.value.trim() || isGenerating.value || !chapterNumber.value) return

  isGenerating.value = true
  try {
    // 从AIConfigService获取AI服务配置
    const aiConfig = await AIConfigService.getCurrentProviderConfig()
    aiService = new AIService(aiConfig)

    // 使用props传入的currentChapter对象
    if (!props.currentChapter) {
      ElMessage.error('无法获取当前章节信息')
      return
    }

    // 使用props传入的currentBook对象
    if (!props.currentBook) {
      ElMessage.error('无法获取当前书籍信息')
      return
    }

    const prompt = await replacePromptVariables(props.currentBook, parseInt(chapterNumber.value), detailContent.value)
    const response = await aiService.generateText(prompt)
    if (response.error) {
      console.error('AI生成失败:', response.error)
      ElMessage.error(`AI生成失败：${response.error}`)
      return
    }

    detailContent.value = response.text
    saveContent()
  } catch (error) {
    console.error('AI生成失败:', error)
    if (error instanceof Error) {
      ElMessage.error(`AI生成失败：${error.message}`)
    } else {
      ElMessage.error('AI生成失败，请检查网络连接和API配置')
    }
  } finally {
    isGenerating.value = false
  }
}

const saveContent = async () => {
  if (!props.currentChapter || !chapterNumber.value) return

  try {
    if (!props.currentBook) return

    // 初始化detailOutline对象如果不存在
    if (!props.currentChapter.detailOutline) {
      props.currentChapter.detailOutline = {
        chapterNumber: '',
        detailContent: ''
      }
    }

    props.currentChapter.detailOutline.chapterNumber = chapterNumber.value
    props.currentChapter.detailOutline.detailContent = detailContent.value

    const updateChapters = (chapters: any[]): any[] => {
      return chapters.map(ch => {
        if (ch.id === props.currentChapter?.id) {
          return {
            ...ch,
            detailOutline: {
              chapterNumber: chapterNumber.value,
              detailContent: detailContent.value
            },
            lastEdited: new Date()
          }
        }
        if (ch.children) {
          return { ...ch, children: updateChapters(ch.children) }
        }
        return ch
      })
    }

    props.currentBook.content = updateChapters(props.currentBook.content || [])
    await BookConfigService.saveBook(props.currentBook)
    ElMessage.success('细纲保存成功')
  } catch (e) {
    console.error('保存细纲失败', e)
    ElMessage.error('保存细纲失败')
  }
}

watch(() => props.currentChapter, (newChapter) => {
  if (newChapter?.detailOutline) {
    chapterNumber.value = newChapter.detailOutline.chapterNumber
    detailContent.value = newChapter.detailOutline.detailContent
  } else {
    chapterNumber.value = ''
    detailContent.value = ''
  }
}, { immediate: true })
</script>

<style scoped>
.outline-detail-panel {
  @apply fixed right-0 top-0 h-screen w-64 bg-white shadow-lg z-50 flex flex-col;
  animation: slideIn 0.3s ease-out;
}

.outline-header {
  @apply flex justify-between items-center px-4 py-3 border-b border-gray-200;
}

.close-btn {
  @apply p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100;
}

.close-icon {
  @apply text-2xl font-light;
}

.chapter-input {
  @apply flex items-center justify-center gap-2 p-4 border-b border-gray-200;
}

.chapter-label {
  @apply text-lg font-medium;
}

.chapter-number {
  @apply w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center;
}

.outline-content {
  @apply flex-1 flex flex-col p-4;
}

.content-input {
  @apply flex-1 p-3 border border-gray-300 rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent;
  min-height: 200px;
}

.button-group {
  @apply flex gap-2 mt-4;
}

.ai-btn,
.save-btn {
  @apply flex-1 px-4 py-2 rounded text-white font-medium transition-colors;
}

.ai-btn {
  @apply bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300;
}

.save-btn {
  @apply bg-green-500 hover:bg-green-600 disabled:bg-green-300;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }

  to {
    transform: translateX(0);
    opacity: 1;
  }
}
</style>