import { ref } from 'vue';
import Delta from 'quill-delta';
import { ElMessage, ElMessageBox } from 'element-plus';
import AIService from '../services/aiService';
import { replaceContinuePromptVariables } from '../services/promptVariableService';
import type { Book, Chapter } from '../services/bookConfigService';
import { AIConfigService } from '../services/aiConfigService';

interface AITextContinueOptions {
  onContentSave: (chapterId: string, content: string) => void;
}

export class AITextContinueController {
  private continuePrompt = ref('');
  private isGenerating = ref(false);
  private generationTask = ref<{ cancel?: () => void; error?: string; text?: string } | null>(null);
  private showContinueCursor = ref(false);
  private continueCursorStyle = ref({ top: '0px', left: '0px' });
  private savedSelection = ref<{ index: number; length: number } | null>(null);
  private options: AITextContinueOptions;

  constructor(options: AITextContinueOptions) {
    this.options = options;
  }

  get continuePromptValue() {
    return this.continuePrompt.value;
  }

  set continuePromptValue(value: string) {
    this.continuePrompt.value = value;
  }

  get isGeneratingValue() {
    return this.isGenerating.value;
  }

  get showContinueCursorValue() {
    return this.showContinueCursor.value;
  }

  get continueCursorStyleValue() {
    return this.continueCursorStyle.value;
  }

  handleContinueInputFocus(editor: any) {
    const selection = editor.getSelection();
    
    // 保存选区状态
    if (selection) {
      this.savedSelection.value = { index: selection.index, length: selection.length };
      const bounds = editor.getBounds(selection.index, 0);
      const editorRect = editor.container.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      this.continueCursorStyle.value = {
        top: `${editorRect.top + bounds.top + scrollTop}px`,
        left: `${editorRect.left + bounds.left + scrollLeft}px`
      };
      this.showContinueCursor.value = true;
    }

    // 保持滚动条可见但禁用滚动功能
    const editorElement = document.querySelector('.ql-editor') as HTMLElement;
    if (editorElement) {
      editorElement.style.overflowY = 'scroll';
      editorElement.style.pointerEvents = 'none';
    }
  }

  handleContinueInputBlur() {
    this.showContinueCursor.value = false;
    
    // 恢复编辑器滚动
    const editorElement = document.querySelector('.ql-editor') as HTMLElement;
    if (editorElement) {
      editorElement.style.overflowY = 'auto';
      editorElement.style.pointerEvents = 'auto';
    }
  }

  async handleAIContinue(editor: any, currentChapter: Chapter | null, currentBook: Book | null) {
    if (this.isGenerating.value) {
      this.stopGeneration();
      return;
    }

    if (!currentChapter?.id) return;

    this.restoreEditorState();
    await this.waitForStateUpdate();
    
    const currentPosition = this.setupCursorAndIcon(editor);
    
    try {
      const result = await this.showPositionDialog();
      
      if (result === 'close' || !['confirm', 'cancel'].includes(result)) {
        this.cleanupState();
        return;
      }
      
      const { currentContent, insertPosition } = this.handlePositionSelection(editor, result, currentPosition);
      
      await this.generateAndInsertText(editor, currentChapter, currentBook, currentContent, insertPosition);
      
    } catch (error) {
      // 用户关闭对话框
      return;
    }
  }
  
  private stopGeneration() {
    this.generationTask.value?.cancel?.();
    this.isGenerating.value = false;
    this.showContinueCursor.value = false;
  }
  
  private restoreEditorState() {
    const editorElement = document.querySelector('.ql-editor') as HTMLElement;
    if (editorElement) {
      editorElement.style.overflowY = 'auto';
      editorElement.style.pointerEvents = 'auto';
    }

    // 如果输入框有焦点，先让它失去焦点
    const continueInput = document.querySelector('.continue-input') as HTMLInputElement;
    if (document.activeElement === continueInput) {
      continueInput.blur();
    }
  }
  
  private async waitForStateUpdate() {
    // 等待一小段时间确保状态更新
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  private setupCursorAndIcon(editor: any): number {
    let currentPosition = 0;
    
    // 使用保存的选区状态
    if (this.savedSelection.value) {
      // 不立即设置选区，只获取位置信息
      currentPosition = this.savedSelection.value.index;
      
      // 更新光标图标位置，但不移动实际编辑器光标
      const bounds = editor.getBounds(this.savedSelection.value.index, 0);
      const editorRect = editor.container.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

      this.continueCursorStyle.value = {
        top: `${editorRect.top + bounds.top + scrollTop}px`,
        left: `${editorRect.left + bounds.left + scrollLeft}px`
      };
      this.showContinueCursor.value = true;
    } else {
      // 如果没有保存的选区，使用当前选区
      const selection = editor.getSelection();
      
      if (selection) {
        currentPosition = selection.index;
        // 更新光标图标位置
        const bounds = editor.getBounds(selection.index, 0);
        const editorRect = editor.container.getBoundingClientRect();
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

        this.continueCursorStyle.value = {
          top: `${editorRect.top + bounds.top + scrollTop}px`,
          left: `${editorRect.left + bounds.left + scrollLeft}px`
        };
        this.showContinueCursor.value = true;
      } else {
        // 如果没有选区，使用当前光标位置或文档末尾
        currentPosition = editor.getLength();
      }
    }

    // 返回当前位置，但不改变编辑器的实际光标位置
    return currentPosition;
  }
  
  private async showPositionDialog(): Promise<string> {
    return await ElMessageBox({
      title: '续写位置',
      message: '请选择续写位置',
      showCancelButton: true,
      confirmButtonText: '当前位置',
      cancelButtonText: '章节末尾',
      type: 'info',
      center: true,
      customClass: 'continue-position-dialog',
      showClose: true,
      closeOnClickModal: false,
      closeOnPressEscape: true,
      distinguishCancelAndClose: true
    }).catch((action) => {
      return action;
    });
  }
  
  private handlePositionSelection(editor: any, result: string, currentPosition: number): { currentContent: string; insertPosition: number } {
    let currentContent = '';
    let insertPosition = 0;

    // 根据返回值判断用户的选择
    if (result === 'confirm') {
      // 从当前位置续写
      currentContent = editor.getText(0, currentPosition);
      insertPosition = currentPosition;
      // 现在才设置光标位置
      editor.setSelection(currentPosition, 0);
      // 隐藏光标图标
      this.showContinueCursor.value = false;
    } else if (result === 'cancel') {
      // 从章节末尾续写
      currentContent = editor.getText();
      insertPosition = editor.getLength();
      // 滚动到章节末尾
      editor.setSelection(insertPosition, 0);
      editor.scrollIntoView();
      // 隐藏光标图标
      this.showContinueCursor.value = false;
    }
    
    return { currentContent, insertPosition };
  }
  
  private cleanupState() {
    this.showContinueCursor.value = false;
    this.savedSelection.value = null;
  }
  
  private async generateAndInsertText(
    editor: any, 
    currentChapter: Chapter, 
    currentBook: Book | null, 
    currentContent: string, 
    insertPosition: number
  ) {
    // 清除保存的选区状态
    this.savedSelection.value = null;

    const aiConfig = await AIConfigService.getCurrentProviderConfig();
    const aiService = new AIService(aiConfig);

    try {
      const prompt = await replaceContinuePromptVariables(
        currentBook,
        currentChapter,
        currentContent,
        this.continuePrompt.value
      );

      let generatedText = '';
      this.isGenerating.value = true;

      // 直接保存生成任务的引用
      this.generationTask.value = await aiService.generateText(prompt, (text: string, error?: string, complete?: boolean) => {
        if (error) {
          ElMessage.error(`AI续写失败：${error}`);
          this.isGenerating.value = false;
          this.generationTask.value = null;
          return;
        }
        if (complete) {
          this.isGenerating.value = false;
          this.generationTask.value = null;
          if (currentChapter?.id) {
            this.options.onContentSave(currentChapter.id, editor.root.innerHTML);
          }
        }
        generatedText += text;
        if (!complete) {
          // 在指定位置插入内容
          const delta = new Delta()
            .retain(insertPosition)
            .insert(text);
          editor.updateContents(delta, 'user');
          
          // 更新插入位置，以便下一次插入
          insertPosition += text.length;
        }
      });

    } catch (error) {
      console.error('AI续写失败:', error);
      if (error instanceof Error) {
        ElMessage.error(`AI续写失败：${error.message}`);
      } else {
        ElMessage.error('AI续写失败，请检查网络连接和API配置');
      }
      this.isGenerating.value = false;
      this.generationTask.value = null;
    }
  }
}

export default AITextContinueController; 