<template>
  <div class="book-library-page">
    <div class="library-header">
      <div class="header-left">
        <button @click="showAIConfigModal = true" class="config-btn">
          <span class="icon">⚙️</span> AI配置
        </button>
      </div>
      <h1 class="page-title">我的书库</h1>
      <div class="header-right">
        <button @click="showCreateModal = true" class="create-btn">
          <span class="icon">+</span> 创建新书
        </button>
      </div>
    </div>

    <div class="books-container" v-if="books.length > 0">
      <div v-for="book in books" :key="book.id" class="book-card">
        <div class="book-info">
          <h2 class="book-title">{{ book.title }}</h2>
          <p class="book-desc">{{ book.description || '暂无简介' }}</p>
          <p class="book-meta">最后编辑: {{ formatDate(book.lastEdited) }}</p>
        </div>
        <div class="book-actions">
          <button @click="openBook(book)" class="open-btn">打开</button>
          <button @click="editBook(book)" class="edit-btn">编辑</button>
          <button @click="confirmDelete(book)" class="delete-btn">删除</button>
        </div>
      </div>
    </div>

    <div class="empty-state" v-else>
      <div class="empty-icon">📚</div>
      <p class="empty-text">您的书库还没有书籍</p>
      <p class="empty-subtext">点击"创建新书"按钮开始您的创作之旅</p>
    </div>

    <!-- 创建书籍对话框 -->
    <div class="modal-overlay" v-if="showCreateModal" @click="closeModal"></div>
    <div class="modal" v-if="showCreateModal">
      <div class="modal-header">
        <h2 class="modal-title">{{ editingBook ? '编辑书籍' : '创建新书' }}</h2>
        <button @click="closeModal" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="bookTitle">书名</label>
          <input type="text" id="bookTitle" v-model="newBook.title" placeholder="请输入书名" class="form-input" />
        </div>
        <div class="form-group">
          <label for="bookDesc">简介</label>
          <div class="desc-input-group">
            <textarea id="bookDesc" v-model="newBook.description" placeholder="请输入书籍简介"
              class="form-textarea"></textarea>
            <button @click="showAIGenModal = true" class="ai-gen-btn">
              <span class="icon">🤖</span> AI生成
            </button>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeModal" class="cancel-btn">取消</button>
        <button @click="saveBook" class="save-btn">保存</button>
      </div>
    </div>

    <!-- 删除确认对话框 -->
    <div class="modal-overlay" v-if="showDeleteModal" @click="cancelDelete"></div>
    <div class="modal" v-if="showDeleteModal">
      <div class="modal-header">
        <h2 class="modal-title">确认删除</h2>
        <button @click="cancelDelete" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <p class="confirm-text">确定要删除《{{ bookToDelete?.title }}》吗？此操作不可恢复。</p>
      </div>
      <div class="modal-footer">
        <button @click="cancelDelete" class="cancel-btn">取消</button>
        <button @click="deleteBook" class="delete-confirm-btn">确认删除</button>
      </div>
    </div>
    <!-- AI配置对话框 -->
    <div class="modal-overlay" v-if="showAIConfigModal" @click="closeAIConfigModal"></div>
    <div class="modal" v-if="showAIConfigModal">
      <div class="modal-header">
        <h2 class="modal-title">AI服务配置</h2>
        <button @click="closeAIConfigModal" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label for="aiProvider">AI服务商</label>
          <select id="aiProvider" v-model="aiConfig.provider" class="form-select" @change="updateModelOptions">
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="gemini">Gemini</option>
            <option value="deepseek">Deepseek</option>
          </select>
        </div>
        <div class="form-group">
          <label for="aiModel">AI模型</label>
          <select id="aiModel" v-model="aiConfig.model" class="form-select">
            <option v-for="model in modelOptions" :key="model.id" :value="model.id">
              {{ model.name }}
            </option>
          </select>
        </div>
        <div class="form-group">
          <label for="apiKey">API密钥</label>
          <input type="password" id="apiKey" v-model="aiConfig.apiKey" placeholder="请输入API密钥" class="form-input" />
        </div>
        <div class="form-group">
          <label for="proxyUrl">代理服务器</label>
          <input type="text" id="proxyUrl" v-model="aiConfig.proxyUrl"
            placeholder="请输入代理服务器地址（例如：http://127.0.0.1:7890）" class="form-input" />
        </div>
      </div>
      <div class="modal-footer">
        <button @click="closeAIConfigModal" class="cancel-btn">取消</button>
        <button @click="() => showPromptConfigModal = true" class="config-btn mr-2">提示词配置</button>
        <button @click="saveAIConfig" class="save-btn">保存</button>
      </div>
    </div>

    <!-- 提示词配置对话框 -->
    <div class="modal-overlay" v-if="showPromptConfigModal" @click="closePromptConfigModal"></div>
    <div class="modal prompt-config-modal" v-if="showPromptConfigModal">
      <div class="modal-header">
        <h2 class="modal-title">提示词配置</h2>
        <button @click="closePromptConfigModal" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>生成书名简介提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.bookNameAndDesc" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement"
              class="form-textarea prompt-textarea" ref="bookNameDescTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>生成设定提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.settings" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="settingsTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>生成剧情大纲提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.outline" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="outlineTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>生成章节细纲提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.chapterOutline" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="chapterOutlineTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>生成小说章节提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.chapter" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="chapterTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>续写提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.continue" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="continueTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>扩写提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.expand" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="expandTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>缩写提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.abbreviate" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="abbreviateTextarea"></textarea>
          </div>
        </div>
        <div class="form-group">
          <label>改写提示词</label>
          <div class="prompt-input-group">
            <textarea v-model="tempPromptConfig.rewrite" @focus="(e: FocusEvent) => lastFocusedTextarea = e.target as HTMLTextAreaElement" class="form-textarea prompt-textarea" ref="rewriteTextarea"></textarea>
          </div>
        </div>
      </div>
      <div class="variable-toolbar">
        <button @click="insertVariable('title', $event)">书名</button>
        <button @click="insertVariable('desc', $event)">简介</button>
        <button @click="insertVariable('settings', $event)">设定</button>
        <button @click="insertVariable('outline', $event)">大纲</button>
        <button @click="insertVariable('chapterOutline', $event)">章节细纲</button>
        <button @click="insertVariable('chapter', $event)">章节内容</button>
        <button @click="insertVariable('content', $event)">当前内容</button>
      </div>
      <div class="modal-footer">
        <button @click="closePromptConfigModal" class="cancel-btn">取消</button>
        <button @click="resetToDefault" class="reset-btn">恢复默认值</button>
        <button @click="savePromptConfig" class="save-btn">保存</button>
      </div>
    </div>

    <!-- AI生成对话框 -->
    <div class="modal-overlay" v-if="showAIGenModal" @click="showAIGenModal = false"></div>
    <div class="modal" v-if="showAIGenModal">
      <div class="modal-header">
        <h2 class="modal-title">AI生成书名简介</h2>
        <button @click="showAIGenModal = false" class="modal-close">×</button>
      </div>
      <div class="modal-body">
        <div class="form-group">
          <label>输入内容</label>
          <textarea v-model="aiInputContent" placeholder="输入任何有关小说的内容，越详细越好……" class="form-textarea h-40"
            :disabled="isGenerating"></textarea>
        </div>
        <div class="form-group">
          <label>AI输出</label>
          <textarea v-model="aiOutputContent" placeholder="AI生成的内容将显示在这里" class="form-textarea h-40"></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button @click="showAIGenModal = false" class="cancel-btn">取消</button>
        <button @click="applyAIContent" class="apply-btn" :disabled="!aiOutputContent.trim()">
          应用
        </button>
        <button @click="generateDescription" class="save-btn" :disabled="isGenerating || !aiInputContent.trim()">
          {{ isGenerating ? '生成中...' : '生成' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessageBox } from 'element-plus'
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { BookConfigService } from '../services/bookConfigService'

import { Book } from '../services/bookConfigService'

const router = useRouter()
const books = ref<Book[]>([])
const showCreateModal = ref(false)
const showDeleteModal = ref(false)
const editingBook = ref<Book | null>(null)
const bookToDelete = ref<Book | null>(null)

const newBook = reactive({
  title: '',
  description: ''
})

const loadBooks = async () => {
  try {
    books.value = await BookConfigService.listBooks()
  } catch (error) {
    console.error('加载书籍数据失败', error)
    books.value = []
  }
}

const saveBooks = async () => {
  for (const book of books.value) {
    try {
      await BookConfigService.saveBook(book)
    } catch (error) {
      console.error('保存书籍失败', error)
    }
  }
}

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const openBook = (book: Book) => {
  // 保存当前选中的书籍ID到本地存储
  localStorage.setItem('currentBookId', book.id)
  // 导航到编辑器页面
  router.push('/editor')
}

const editBook = (book: Book) => {
  editingBook.value = book
  newBook.title = book.title
  newBook.description = book.description || ''
  showCreateModal.value = true
}

const confirmDelete = (book: Book) => {
  bookToDelete.value = book
  showDeleteModal.value = true
}

const deleteBook = async () => {
  if (bookToDelete.value) {
    try {
      await BookConfigService.deleteBook(bookToDelete.value.id)
      books.value = books.value.filter(b => b.id !== bookToDelete.value?.id)
      showDeleteModal.value = false
      bookToDelete.value = null
    } catch (error) {
      console.error('删除书籍失败', error)
    }
  }
}

const cancelDelete = () => {
  showDeleteModal.value = false
  bookToDelete.value = null
}

const saveBook = () => {
  if (!newBook.title.trim()) {
    alert('请输入书名')
    return
  }

  if (editingBook.value) {
    // 编辑现有书籍
    const index = books.value.findIndex(b => b.id === editingBook.value?.id)
    if (index !== -1) {
      books.value[index] = {
        ...books.value[index],
        title: newBook.title,
        description: newBook.description,
        lastEdited: new Date()
      }
    }
  } else {
    // 创建新书籍
    const newBookObj: Book = {
      id: Date.now().toString(),
      title: newBook.title,
      description: newBook.description,
      content: [],
      lastEdited: new Date(),
      setting: '',
      plot: ''
    }
    books.value.push(newBookObj)
  }

  saveBooks()
  closeModal()
}

const closeModal = () => {
  showCreateModal.value = false
  editingBook.value = null
  newBook.title = ''
  newBook.description = ''
}

interface AIConfig {
  provider: string
  model: string
  apiKey: string
  proxyUrl: string
}

interface ModelOption {
  id: string
  name: string
}

const showAIConfigModal = ref(false)
const showAIGenModal = ref(false)
const modelOptions = ref<ModelOption[]>([])
const aiInputContent = ref('')
const aiOutputContent = ref('')
const isGenerating = ref(false)

const aiConfig = reactive<AIConfig>({
  provider: 'openai',
  model: '',
  apiKey: '',
  proxyUrl: ''
})

import { AIConfigService } from '../services/aiConfigService'

const updateModelOptions = () => {
  if (aiConfig.provider === 'openai') {
    modelOptions.value = [
      { id: 'gpt-4', name: 'GPT-4' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
    ]
  } else if (aiConfig.provider === 'deepseek') {
    modelOptions.value = [
      { id: 'deepseek-chat', name: 'Deepseek V3' },
      { id: 'deepseek-reasoner', name: 'Deepseek R1' }
    ]
  } else if (aiConfig.provider === 'anthropic') {
    modelOptions.value = [
      { id: 'claude-2', name: 'Claude 2' },
      { id: 'claude-instant', name: 'Claude Instant' }
    ]
  } else if (aiConfig.provider === 'gemini') {
    modelOptions.value = [
      { id: 'gemini-2.0-flash', name: 'Gemini Flash' },
      { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini Flash Thinking' },
      { id: 'gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 pro' },
    ]
  } 

  // 如果当前选中的模型不在新的选项列表中，选择第一个模型
  if (!modelOptions.value.find(option => option.id === aiConfig.model)) {
    aiConfig.model = modelOptions.value[0]?.id || ''
  }
}

const closeAIConfigModal = () => {
  showAIConfigModal.value = false
}

const closePromptConfigModal = () => {
  if (hasUnsavedChanges.value) {
    ElMessageBox.confirm('有未保存的修改，是否放弃修改？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    }).then(() => {
      // 放弃修改，重置临时配置
      Object.keys(promptConfig).forEach(key => {
        tempPromptConfig[key] = promptConfig[key]
      })
      showPromptConfigModal.value = false
    }).catch(() => {
      // 用户点击取消按钮，不做任何操作
    })
  } else {
    showPromptConfigModal.value = false
  }
}

const saveAIConfig = async () => {
  if (!aiConfig.apiKey.trim()) {
    ElMessage.error('请输入API密钥')
    return
  }

  try {
    await AIConfigService.saveConfig(aiConfig)
    showAIConfigModal.value = false
  } catch (error) {
    console.error('保存AI配置失败:', error)
    ElMessage.error(error.message || '保存AI配置失败')
  }
}

const showPromptConfigModal = ref(false)
const bookNameDescTextarea = ref<HTMLTextAreaElement>()
const settingsTextarea = ref<HTMLTextAreaElement>()
const outlineTextarea = ref<HTMLTextAreaElement>()
const chapterOutlineTextarea = ref<HTMLTextAreaElement>()
const chapterTextarea = ref<HTMLTextAreaElement>()
const continueTextarea = ref<HTMLTextAreaElement>()
const expandTextarea = ref<HTMLTextAreaElement>()
const abbreviateTextarea = ref<HTMLTextAreaElement>()

import { defaultBookNameAndDescPrompt, defaultSettingsPrompt, defaultOutlinePrompt, defaultChapterOutlinePrompt, defaultChapterPrompt, defaultContinuePrompt, defaultExpandPrompt, defaultAbbreviatePrompt, defaultRewriteAbbreviatePrompt } from '../constants'
import { PromptConfigService } from '../services/promptConfigService'

const promptConfig = reactive({
  bookNameAndDesc: defaultBookNameAndDescPrompt,
  settings: defaultSettingsPrompt,
  outline: defaultOutlinePrompt,
  chapterOutline: defaultChapterOutlinePrompt,
  chapter: defaultChapterPrompt,
  continue: defaultContinuePrompt,
  expand: defaultExpandPrompt,
  abbreviate: defaultAbbreviatePrompt,
  rewrite: defaultRewriteAbbreviatePrompt,
})

// 加载提示词配置
const loadPromptConfig = async () => {
  try {
    const config = await PromptConfigService.loadConfig()
    Object.assign(promptConfig, config)
  } catch (error) {
    console.error('加载提示词配置失败:', error)
    ElMessage.error(error.message || '加载提示词配置失败')

  }
}

// 临时存储提示词配置的修改
const tempPromptConfig = reactive({
  bookNameAndDesc: promptConfig.bookNameAndDesc,
  settings: promptConfig.settings,
  outline: promptConfig.outline,
  chapterOutline: promptConfig.chapterOutline,
  chapter: promptConfig.chapter,
  continue: promptConfig.continue,
  expand: promptConfig.expand,
  abbreviate: promptConfig.abbreviate,
  rewrite: promptConfig.rewrite
})

// 检查是否有未保存的修改
const hasUnsavedChanges = computed(() => {
  return Object.keys(promptConfig).some(key => promptConfig[key] !== tempPromptConfig[key])
})

const savePromptConfig = async () => {
  try {
    // 将临时配置同步到正式配置
    Object.keys(promptConfig).forEach(key => {
      promptConfig[key] = tempPromptConfig[key]
    })
    // 保存到文件
    await PromptConfigService.saveConfig(promptConfig)
    showPromptConfigModal.value = false
    ElMessage.success('提示词配置已保存')
  } catch (error) {
    console.error('保存提示词配置失败:', error)
    ElMessage.error(error.message || '保存提示词配置失败')
  }
}

const resetToDefault = () => {
  ElMessageBox.confirm('确定要恢复所有提示词为默认值吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    // 重置所有提示词为默认值
    tempPromptConfig.bookNameAndDesc = defaultBookNameAndDescPrompt
    tempPromptConfig.settings = defaultSettingsPrompt
    tempPromptConfig.outline = defaultOutlinePrompt
    tempPromptConfig.chapterOutline = defaultChapterOutlinePrompt
    tempPromptConfig.chapter = defaultChapterPrompt
    tempPromptConfig.continue = defaultContinuePrompt
    tempPromptConfig.expand = defaultExpandPrompt
    tempPromptConfig.abbreviate = defaultAbbreviatePrompt
    tempPromptConfig.rewrite = defaultRewriteAbbreviatePrompt
  }).catch(() => {
    // 用户点击取消按钮，不做任何操作
  })
}

const lastFocusedTextarea = ref<HTMLTextAreaElement>()

const getCurrentTextarea = (): HTMLTextAreaElement | undefined => {
  // 优先使用最后记录的焦点元素
  if (lastFocusedTextarea.value) {
    return lastFocusedTextarea.value
  }

  const activeElement = document.activeElement

  // 优先检查当前焦点元素是否是有效的文本区域
  if (activeElement instanceof HTMLTextAreaElement) {
    return activeElement
  }
  const textareas = document.getElementsByClassName('prompt-textarea')
  for (let i = 0; i < textareas.length; i++) {
    if (textareas[i] === activeElement) {
      return textareas[i] as HTMLTextAreaElement
    }
  }

  // 如果都不可用，返回第一个文本区域（如果存在）
  return bookNameDescTextarea.value || undefined
}

const insertVariable = (type: string, event: MouseEvent) => {
  const textarea = lastFocusedTextarea.value || getCurrentTextarea()
  const cursorPos = textarea.selectionStart
  const textBefore = textarea.value.substring(0, cursorPos)
  const textAfter = textarea.value.substring(textarea.selectionEnd)
  let variable = '${content}'
  switch (type) {
    case 'title':
      variable = '${title}'
      break
    case 'desc':
      variable = '${description}'
      break
    case 'settings':
      variable = '${settings}'
      break
    case 'outline':
      variable = '${outline}'
      break
    case 'chapterOutline':
      variable = '${chapterOutline}'
      break
    case 'chapter':
      variable = '${chapter}'
      break
    case 'content':
      variable = '${content}'
      break
  }
  // 根据当前文本区域更新对应的tempPromptConfig属性
  const newValue = textBefore + variable + textAfter
  if (textarea === bookNameDescTextarea.value) {
    tempPromptConfig.bookNameAndDesc = newValue
  } else if (textarea === settingsTextarea.value) {
    tempPromptConfig.settings = newValue
  } else if (textarea === outlineTextarea.value) {
    tempPromptConfig.outline = newValue
  } else if (textarea === chapterOutlineTextarea.value) {
    tempPromptConfig.chapterOutline = newValue
  } else if (textarea === chapterTextarea.value) {
    tempPromptConfig.chapter = newValue
  } else if (textarea === continueTextarea.value) {
    tempPromptConfig.continue = newValue
  } else if (textarea === expandTextarea.value) {
    tempPromptConfig.expand = newValue 
  } else if (textarea === abbreviateTextarea.value) {
    tempPromptConfig.abbreviate = newValue
  }

  // 更新文本区域的值和光标位置
  textarea.value = newValue
  textarea.focus()
  textarea.selectionStart = cursorPos + variable.length
  textarea.selectionEnd = cursorPos + variable.length
}

// 初始化数据和配置
onMounted(async () => {
  try {
    // 加载AI配置
    const config = await AIConfigService.loadConfig()
    Object.assign(aiConfig, config)
    
    // 加载书籍数据
    loadBooks()
    updateModelOptions()
    
    // 加载提示词配置
    await loadPromptConfig()
    Object.assign(tempPromptConfig, promptConfig)
  } catch (error) {
    console.error('初始化失败:', error)
  }
})

import { ElMessage } from 'element-plus'

import AIService from '../services/aiService'

const generateDescription = async () => {
  if (!aiConfig.apiKey) {
    ElMessage.warning('请先配置AI服务')
    showAIGenModal.value = false
    showAIConfigModal.value = true
    return
  }

  isGenerating.value = true
  try {
    const aiService = new AIService(aiConfig)
    // 获取提示词配置，如果不存在则使用默认提示词
    const promptConfig = await PromptConfigService.getPromptByName('bookNameAndDesc') || defaultBookNameAndDescPrompt
    // 替换提示词中的变量
    const prompt = promptConfig.replace('${content}', aiInputContent.value || '')
    const result = await aiService.generateText(prompt)

    if (result.error) {
      throw new Error(result.error)
    }

    aiOutputContent.value = result.text
    ElMessage.success('生成成功')
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
const applyAIContent = () => {
  const content = aiOutputContent.value
  const titleMatch = content.match(/书名:([^\n]+)/)
  const descMatch = content.match(/简介:([\s\S]+)$/)

  if (titleMatch && descMatch) {
    newBook.title = titleMatch[1].trim()
    newBook.description = descMatch[1].trim()
    showAIGenModal.value = false
    showCreateModal.value = true
  } else {
    ElMessage.warning('无法解析AI输出内容，请确保格式正确')
  }
}
</script>

<style scoped>
.book-library-page {
  @apply h-screen w-full flex flex-col bg-gray-50 overflow-auto p-4;
}

.library-header {
  @apply flex justify-between items-center mb-8;
}

.create-btn {
  @apply bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition-colors;
}

.icon {
  @apply text-xl font-bold;
}

.books-container {
  @apply grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 justify-items-center;
}

.book-card {
  @apply bg-white rounded-lg shadow-md p-6 flex flex-col w-full min-w-[280px] max-w-[320px];
}

.book-info {
  @apply flex-1;
}

.book-title {
  @apply text-xl font-bold mb-2 text-gray-800;
}

.book-desc {
  @apply text-gray-600 mb-4 line-clamp-2;
}

.book-meta {
  @apply text-sm text-gray-500 mb-4;
}

.book-actions {
  @apply flex gap-2 mt-2 justify-center;
}

.edit-btn {
  @apply px-3 py-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors;
}

.open-btn {
  @apply px-3 py-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors;
}

.delete-btn {
  @apply px-3 py-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors;
}

.empty-state {
  @apply flex flex-col items-center justify-center h-64 bg-white rounded-lg shadow-sm p-8;
}

.empty-icon {
  @apply text-5xl mb-4;
}

.empty-text {
  @apply text-xl font-medium text-gray-700 mb-2;
}

.empty-subtext {
  @apply text-gray-500;
}

/* 模态框样式 */
.modal-overlay {
  @apply fixed inset-0 bg-black bg-opacity-50 z-40;
}

.modal {
  position: fixed !important;
  top: 50% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  background-color: white !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
  z-index: 50 !important;
  width: 90% !important;
  max-width: 36rem !important;
  overflow: hidden !important;
  display: flex !important;
  flex-direction: column !important;
  max-height: 95vh !important;
}

.modal-header {
  @apply flex justify-between items-center p-4 border-b border-gray-200;
}

.modal-title {
  @apply text-xl font-bold text-gray-800;
}

.modal-close {
  @apply text-2xl text-gray-500 hover:text-gray-700;
}

.modal-body {
  @apply p-6 overflow-y-auto flex-1 overflow-x-hidden;
}

.modal-footer {
  @apply flex justify-end gap-3 p-4 border-t border-gray-200;
}

.form-group {
  @apply mb-4;
}

.form-group label {
  @apply block text-sm font-medium text-gray-700 mb-1;
}

.form-input,
.form-textarea {
  @apply w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent box-border;
}

.form-textarea {
  @apply h-24 resize-none;
}

.desc-input-group {
  @apply relative;
}

.ai-gen-btn {
  @apply absolute right-2 top-2 flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors text-sm;
}

.h-40 {
  height: 10rem;
}

.prompt-config-modal {
  @apply w-[800px] max-w-[90vw];
}

.prompt-input-group {
  @apply relative;
}

.variable-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
}

.variable-toolbar button {
  padding: 6px 12px;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  background-color: white;
  color: #495057;
  font-size: 0.9em;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 4px;
}

.variable-toolbar button:hover {
  background-color: #e9ecef;
  border-color: #ced4da;
  color: #212529;
}

.variable-toolbar button:active {
  background-color: #dee2e6;
  transform: translateY(1px);
}

.modal-actions {
  @apply flex gap-2;
}

.config-btn {
  @apply bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-300 transition-colors;
}

.cancel-btn {
  @apply px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors dark:bg-gray-600 dark:text-white dark:hover:bg-gray-700;
}

.save-btn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors dark:bg-blue-700 dark:hover:bg-blue-800;
}

.delete-confirm-btn {
  @apply px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors dark:bg-red-700 dark:hover:bg-red-800;
}

.confirm-text {
  @apply text-center py-4;
}

.header-left {
  @apply flex items-center;
}

.header-right {
  @apply flex items-center gap-4;
}

.library-header {
  @apply flex justify-between items-center p-6 bg-white shadow-sm;
}

.page-title {
  @apply text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 tracking-wider;
  font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.1);
  transform: scale(1);
  transition: transform 0.2s ease;
}

.page-title:hover {
  transform: scale(1.02);
}

.header-right {
  @apply flex items-center gap-6;
}

.config-btn {
  @apply flex items-center gap-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors;
}

.form-select {
  @apply w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500;
}

.apply-btn {
  @apply px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors;
}
</style>