<template>
  <div class="proofreader-container" v-if="show">
    <div class="proofreader-header">
      <h2 class="text-2xl font-bold">章节校对</h2>
      <button @click="confirmClose" class="close-btn">
        <span class="icon">×</span>
      </button>
    </div>
    <div class="proofreader-content">
      <div class="content-panel w-3/4">
        <div class="content-text" ref="contentRef"></div>
      </div>
      <div class="errors-panel w-1/4 border-l border-gray-200">
        <div class="errors-list">
          <div v-if="errors.length === 0" class="no-errors">
            暂无错误
          </div>
          <div v-else v-for="(error, index) in errors" 
               :key="index" 
               class="error-item"
               @click="() => selectError(index)">
            <div class="error-type">{{ error.type }}</div>
            <div class="error-position">位置：第 {{ error.position.start }} 到 {{ error.position.end }} 个字符</div>
            <div class="error-content">
              <div class="original">原文：{{ error.original }}</div>
              <div class="corrected">修改：{{ error.corrected }}</div>
            </div>
            <button @click.stop="applyCorrection(index)" class="apply-correction-btn">
              应用修正
            </button>
          </div>
        </div>
      </div>
    </div>
    <div class="proofreader-footer">
      <div class="button-container">
        <button @click="requestProofread" class="proofread-btn" :disabled="isProofreading">
          {{ isProofreading ? '校对中...' : '开始校对' }}
        </button>
        <button @click="saveChanges" class="save-btn">
          保存修改
        </button>
        <button @click="confirmClose" class="cancel-btn">
          取消
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AIService from '../services/aiService'
import { AIConfigService } from '../services/aiConfigService'
import { replaceProofreadPromptVariables } from '../services/promptVariableService'
import { diff_match_patch } from 'diff-match-patch'

const props = defineProps<{
  show: boolean
  content: string
  currentChapter: {
    id: string
    title: string
    type: 'volume' | 'chapter'
  } | null
  currentBook: {
    id: string
    title: string
    description: string
    setting: string
    plot: string
    content: any[]
    lastEdited: Date
  } | null
  quill?: any
}>()

const emit = defineEmits<{
  'close': []
}>()

const errors = ref<Array<{
  type: string
  position: {
    start: number
    end: number
  }
  original: string
  corrected: string
}>>([])

const isProofreading = ref(false)
const contentRef = ref<HTMLElement | null>(null)

// 监听页面显示状态，自动清理HTML标记
watch(() => props.show, async (newShow) => {
  if (newShow && props.quill) {
    await nextTick()
    if (contentRef.value) {
      const cleanContent = props.quill.getText().trim()
      contentRef.value.innerText = cleanContent
    }
  }
}, { immediate: true })

// 首先添加一个引用来保存当前的高亮元素
const currentHighlightSpan = ref<HTMLElement | null>(null)

const selectError = (index: number) => {
  const error = errors.value[index]
  if (contentRef.value) {
    // 先清除之前的高亮元素
    if (currentHighlightSpan.value && currentHighlightSpan.value.parentNode) {
      const parent = currentHighlightSpan.value.parentNode
      while (currentHighlightSpan.value.firstChild) {
        parent.insertBefore(currentHighlightSpan.value.firstChild, currentHighlightSpan.value)
      }
      parent.removeChild(currentHighlightSpan.value)
      currentHighlightSpan.value = null
    }
    
    const range = document.createRange()
    const walker = document.createTreeWalker(contentRef.value, NodeFilter.SHOW_TEXT, null)
    let currentPosition = 0, startNode = null, startOffset = 0, endNode = null, endOffset = 0, node
    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0
      if (!startNode && currentPosition + nodeLength > error.position.start) {
        startNode = node
        startOffset = error.position.start - currentPosition
      }
      
      // 特殊处理：如果开始和结束位置相同（插入错误）
      if (error.position.start === error.position.end) {
        if (startNode && !endNode) {
          // 对于插入情况，选中起始位置处的字符
          endNode = startNode
          // 确保选中至少一个字符
          endOffset = startOffset + 1
          // 确保不超过节点长度
          if (endOffset > nodeLength) endOffset = nodeLength
          break
        }
      } else if (!endNode && currentPosition + nodeLength >= error.position.end) {
        endNode = node
        endOffset = error.position.end - currentPosition
        break
      }
      
      currentPosition += nodeLength
    }
    if (startNode && endNode) {
      range.setStart(startNode, startOffset)
      range.setEnd(endNode, endOffset)
      
      const span = document.createElement('span')
      span.className = 'error-highlight'
      span.style.backgroundColor = 'yellow'
      
      try {
        const highlightRange = range.cloneRange()
        highlightRange.surroundContents(span)
        
        currentHighlightSpan.value = span
        
        nextTick(() => {
          span.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center'
          })
        })
      } catch (e) {
        console.error('滚动到文本位置失败:', e)
      }
    }
  }
}

// 使用 diff-match-patch 找出文本差异
const findDifferences = (original: string, corrected: string) => {
  const dmp = new diff_match_patch()
  const diffs = dmp.diff_main(original, corrected)
  dmp.diff_cleanupSemantic(diffs)  // 使差异更具语义
  
  const differences: Array<{
    type: string
    position: {
      start: number
      end: number
    }
    original: string
    corrected: string
  }> = []
  
  let originalPosition = 0
  let i = 0
  
  // 计算不包含换行符的文本长度
  const getTextLength = (text: string) => {
    return text.replace(/\n/g, '').length
  }
  
  // 检查文本是否只包含空格（半角或全角）
  const isOnlySpaces = (text: string) => {
    return /^[\s\u3000]*$/.test(text)
  }
  
  while (i < diffs.length) {
    const [type, text] = diffs[i]
    
    if (type === 0) {
      originalPosition += getTextLength(text)
      i++
    } else if (type === -1) {
      const deletedText = text
      const deleteStart = originalPosition
      const deleteEnd = originalPosition + getTextLength(deletedText)
      
      let insertedText = ''
      if (i + 1 < diffs.length && diffs[i + 1][0] === 1) {
        insertedText = diffs[i + 1][1]
        i += 2
      } else {
        i++
      }
      
      if (isOnlySpaces(deletedText) && isOnlySpaces(insertedText)) {
        originalPosition = deleteEnd
        continue
      }
      
      differences.push({
        type: insertedText ? '替换' : '删除',
        position: {
          start: deleteStart,
          end: deleteEnd
        },
        original: deletedText,
        corrected: insertedText
      })
      
      originalPosition = deleteEnd
    } else if (type === 1) {
      const insertedText = text
      
      if (isOnlySpaces(insertedText)) {
        i++
        continue
      }
      
      differences.push({
        type: '插入',
        position: {
          start: originalPosition,
          end: originalPosition
        },
        original: '',
        corrected: insertedText
      })
      
      i++
    }
  }
  
  return differences
}

const requestProofread = async () => {
  if (!props.currentChapter || !props.currentBook) {
    ElMessage.error('无法获取当前章节或书籍信息')
    return
  }

  isProofreading.value = true
  errors.value = []

  try {
    const aiConfig = await AIConfigService.getCurrentProviderConfig()
    const aiService = new AIService(aiConfig)

    const prompt = await replaceProofreadPromptVariables(contentRef.value.innerText)

    const response = await aiService.generateText(prompt)
    if (response.error) {
      throw new Error(response.error)
    }

    try {
      // 对比原文和校对后的内容
      const originalText = contentRef.value.innerText
      const correctedText = response.text
      
      // 找出差异
      const differences = findDifferences(originalText, correctedText)
      
      if (differences.length === 0) {
        ElMessage.success('校对完成，未发现错误')
      } else {
        errors.value = differences
        ElMessage.success(`校对完成，发现 ${differences.length} 处问题`)
      }
    } catch (e) {
      console.error('处理AI返回结果失败:', e)
      ElMessage.error('处理返回结果失败，请重试')
    }
  } catch (error) {
    console.error('校对失败:', error)
    ElMessage.error('校对失败，请检查网络连接和API配置')
  } finally {
    isProofreading.value = false
  }
}

const applyCorrection = (index: number) => {
  selectError(index)
  
  const error = errors.value[index]
  if (contentRef.value) {
    const walker = document.createTreeWalker(contentRef.value, NodeFilter.SHOW_TEXT, null)
    let currentPosition = 0
    let startNode = null, startOffset = 0, endNode = null, endOffset = 0
    let node

    while (node = walker.nextNode()) {
      const nodeLength = node.textContent?.length || 0
      if (!startNode && currentPosition + nodeLength > error.position.start) {
        startNode = node
        startOffset = error.position.start - currentPosition
      }
      
      // 特殊处理：如果开始和结束位置相同（插入错误）
      if (error.position.start === error.position.end) {
        if (startNode && !endNode) {
          endNode = startNode
          // 插入操作，只需定位到起始位置即可
          endOffset = startOffset
          break
        }
      } else if (!endNode && currentPosition + nodeLength >= error.position.end) {
        endNode = node
        endOffset = error.position.end - currentPosition
        break
      }
      
      currentPosition += nodeLength
    }

    if (startNode && endNode) {
      // 计算位置偏移量（用于调整其他错误的位置）
      const originalLength = error.position.end - error.position.start
      const correctedLength = error.corrected.length
      const offset = correctedLength - originalLength

      // 应用修正：替换文本节点内容
      if (startNode === endNode) {
        // 特殊处理插入操作
        if (error.position.start === error.position.end) {
          startNode.textContent = 
            startNode.textContent.substring(0, startOffset) + 
            error.corrected + 
            startNode.textContent.substring(startOffset)
        } else {
          startNode.textContent = 
            startNode.textContent.substring(0, startOffset) + 
            error.corrected + 
            startNode.textContent.substring(endOffset)
        }
      } else {
        startNode.textContent = startNode.textContent.substring(0, startOffset) + error.corrected
        endNode.textContent = endNode.textContent.substring(endOffset)
      }

      // 调整其他错误的位置
      errors.value = errors.value.map((err, i) => {
        if (i !== index && err.position.start >= error.position.end) {
          return { ...err, position: { start: err.position.start + offset, end: err.position.end + offset } }
        }
        return err
      }).filter((_, i) => i !== index) // 移除已应用的错误

      ElMessage.success('修正已应用')
    } else {
      ElMessage.error("无法准确定位文本，请重试")
    }
  }
}

// 添加函数：确认关闭
const confirmClose = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要放弃当前修改吗？',
      '提示',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      }
    )
    emit('close')
  } catch (e) {
    // 用户取消
  }
}

// 添加函数：保存更改
const saveChanges = () => {
  if (!props.quill || !contentRef.value) {
    ElMessage.error('无法保存修改')
    return
  }

  try {
    // 获取当前编辑后的内容
    const content = contentRef.value.innerText
    
    // 将内容设置到quill编辑器中
    props.quill.setText(content)
    
    ElMessage.success('修改已保存')
    emit('close')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}
</script>

<style scoped>
.proofreader-container {
  @apply fixed inset-0 bg-white z-50 flex flex-col;
}

.proofreader-header {
  @apply flex justify-between items-center p-4 border-b border-gray-200 bg-gray-50;
}

.proofreader-header h2 {
  @apply text-2xl font-bold flex-1 text-center text-gray-800 tracking-wide;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.1);
}

.close-btn {
  @apply p-2 bg-gray-200 hover:bg-red-100 rounded-full text-gray-600 hover:text-red-600 transition-colors duration-200 shadow-sm;
}

.close-btn .icon {
  @apply text-xl font-medium;
}

.proofreader-content {
  @apply flex overflow-hidden;
}

.content-panel,
.errors-panel {
  @apply flex flex-col overflow-hidden;
}

.content-panel {
  @apply w-3/4;
}

.errors-panel {
  @apply w-1/4 border-l border-gray-200;
}

.panel-header {
  @apply p-2 bg-gray-50 border-b border-gray-200 font-medium;
}

.content-text {
  @apply flex-1 p-4 overflow-y-auto;
}

.errors-list {
  @apply flex-1 p-4 overflow-y-auto;
}

.error-item {
  @apply mb-4 p-3 bg-red-50 border border-red-200 rounded cursor-pointer transition-all duration-200;
}

.error-item:hover {
  @apply bg-red-100;
}

.error-item.selected {
  @apply bg-red-200 border-red-400 shadow-md;
  transform: translateY(-1px);
}

.error-item.selected::before {
  content: '';
  @apply absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l;
}

.highlight-error {
  @apply bg-red-200 text-red-800 px-1 rounded font-medium;
}

.corrected-text {
  @apply bg-green-200 text-green-800 px-1 rounded font-medium;
}

.apply-correction-btn {
  @apply mt-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors duration-200;
}

.apply-correction-btn:hover {
  @apply shadow-md;
}

.error-type {
  @apply text-red-600 font-medium mb-1;
}

.error-position {
  @apply text-gray-600 text-sm mb-1;
}

.error-content {
  @apply space-y-2;
}

.error-content .original {
  @apply text-red-600;
}

.error-content .corrected {
  @apply text-green-600;
}

.no-errors {
  @apply text-gray-500 text-center py-8;
}

.proofreader-footer {
  @apply p-4 border-t border-gray-200 flex justify-center;
}

.button-container {
  @apply flex items-center;
}

.button-container button {
  @apply mx-2;
}

.proofread-btn {
  @apply px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed;
}

.save-btn {
  @apply px-6 py-2 bg-green-500 text-white rounded hover:bg-green-600;
}

.cancel-btn {
  @apply px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600;
}
</style>