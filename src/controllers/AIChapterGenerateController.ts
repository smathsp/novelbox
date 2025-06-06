import { ref } from 'vue';
import Delta from 'quill-delta';
import { ElMessage } from 'element-plus';
import AIService from '../services/aiService';
import { replaceChapterPromptVariables } from '../services/promptVariableService';
import type { Book, Chapter } from '../services/bookConfigService';
import { AIConfigService } from '../services/aiConfigService';

interface AIChapterGenerateOptions {
  onContentSave: (chapterId: string, content: string) => void;
}

export class AIChapterGenerateController {
  private isGenerating = ref(false);
  private generationTask = ref<{ cancel?: () => void; error?: string; text?: string } | null>(null);
  private options: AIChapterGenerateOptions;

  constructor(options: AIChapterGenerateOptions) {
    this.options = options;
  }

  get isGeneratingValue() {
    return this.isGenerating.value;
  }

  /**
   * 初始化AI生成按钮文本
   */
  initGenerateButton() {
    const button = document.querySelector('.ql-ai-generate');
    if (button) {
      button.setAttribute('data-content', 'AI生成');
    } else {
      // 如果按钮未找到，延迟100ms后重试
      setTimeout(() => this.initGenerateButton(), 100);
    }
  }

  /**
   * 处理AI生成章节内容
   */
  async handleAIGenerate(editor: any, currentChapter: Chapter | null, currentBook: Book | null) {
    const button = document.querySelector('.ql-ai-generate');
    
    // 如果正在生成，则取消生成
    if (this.isGenerating.value) {
      this.generationTask.value?.cancel?.();
      this.isGenerating.value = false;
      button?.setAttribute('data-content', 'AI生成');
      return;
    }
    
    // 更新按钮文本
    button?.setAttribute('data-content', '停止生成');

    // 检查章节和书籍信息
    if (!currentChapter?.id) return;

    if (!currentBook) {
      ElMessage.error('无法获取当前书籍信息');
      return;
    }

    this.isGenerating.value = true;

    try {
      // 获取AI配置
      const aiConfig = await AIConfigService.getCurrentProviderConfig();
      const aiService = new AIService(aiConfig);

      // 生成提示词
      const prompt = await replaceChapterPromptVariables(currentBook, currentChapter);

      let generatedText = '';

      // 执行AI生成
      this.generationTask.value = await aiService.generateText(prompt, (text: string, error?: string, complete?: boolean) => {
        if (error) {
          ElMessage.error(`AI生成失败：${error}`);
          this.isGenerating.value = false;
          this.generationTask.value = null;
          this.initGenerateButton();
          return;
        }
        
        if (complete) {
          this.isGenerating.value = false;
          this.generationTask.value = null;
          ElMessage.success('AI生成完成');
          if (currentChapter?.id) {
            this.options.onContentSave(currentChapter.id, editor.root.innerHTML);
          }
          this.initGenerateButton();
        }
        
        generatedText += text;
        if (!complete) {
          editor.updateContents(new Delta().retain(editor.getLength() - 1).insert(text), 'user');
        }
      });

    } catch (error: any) {
      ElMessage.error(error.message);
      this.isGenerating.value = false;
      button?.setAttribute('data-content', 'AI生成');
      return;
    }
  }
}

export default AIChapterGenerateController; 