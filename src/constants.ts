// AI服务商配置
export interface AIProvider {
  id: string
  name: string
  models: AIModel[]
  defaultTemperature: number
  defaultMaxTokens: number
  defaultTopP: number
}

export interface AIModel {
  id: string
  name: string
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    models: [
      { id: 'gpt-4.1', name: 'GPT-4.1' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
      { id: 'o3', name: 'O3' },
      { id: 'o4-mini', name: 'O4-Mini' }
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 25000,
    defaultTopP: 0.95
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    models: [
      { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku' },
      { id: 'claude-3-5-sonnet-latest', name: 'Claude 3.5 Sonnet' },
      { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet' }
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 8192,
    defaultTopP: 0.95
  },
  {
    id: 'gemini',
    name: 'Gemini',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini Flash' },
      { id: 'gemini-2.0-flash-thinking-exp-01-21', name: 'Gemini Flash Thinking' },
      { id: 'gemini-2.5-pro-exp-03-25', name: 'Gemini 2.5 pro' }
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 8192,
    defaultTopP: 0.95
  },
  {
    id: 'deepseek',
    name: 'Deepseek',
    models: [
      { id: 'deepseek-chat', name: 'Deepseek V3' },
      { id: 'deepseek-reasoner', name: 'Deepseek R1' }
    ],
    defaultTemperature: 0.7,
    defaultMaxTokens: 25000,
    defaultTopP: 0.95
  }
]

// 提示词配置
export const defaultBookNameAndDescPrompt = '根据以下内容，生成一个引人入胜的小说书名和针对这个书名的简介，确保只生成书名和简介不生成任何其他信息，输出格式是：\n书名:\n简介:\n\n${content}'

export const defaultSettingsPrompt = `请根据以下内容，生成一个详细的小说设定。设定必须包含以下部分：

1. 人物设定：
   - 主要人物：包括性格、外貌、背景、能力等
   - 重要配角：简要描述其特点和作用
   - 反派角色：描述其动机和威胁

2. 世界观设定：
   - 时代背景
   - 地理环境
   - 社会制度
   - 文化特色

3. 特殊设定（根据小说类型选择性添加）：
   - 修炼体系/能力体系
   - 金手指设定
   - 法宝/装备设定
   - 功法/技能设定
   - 特殊规则/限制

请确保设定合理、自洽，并符合小说类型特点。生成的内容不要使用markdown格式，不要使用除中文外的其他语言。只生成设定内容，不要生成其他信息。

小说名：\${title}
简介：\${description}
设定要求：\${content}`

export const defaultOutlinePrompt = '根据以下内容，生成一个引人入胜的小说剧情大纲，确保只生成大纲不生成任何其他信息:\n小说名:${title}\n,简介:${description}\n,大纲要求:${content}'

export const defaultChapterOutlinePrompt = '根据以下内容，生成本章节细纲，确保只生成本章节细纲不生成任何其他信息，小说名:${title}\n,简介:${description}\n,设定:${settings}\n,大纲:${outline}\n,前文:${previous}\n,本章大致剧情:${content}'

export const defaultChapterPrompt = '请根据以下信息生成一个完整的小说章节，要求字数在2500字以上，确保只生成小说章节不生成任何其他信息。\n小说名:${title}\n,简介:${description}\n,设定:${settings}\n,大纲:${outline}\n,前文:${previous}\n本章细纲:${chapterOutline}'

export const defaultContinuePrompt = '请根据以下信息续写小说内容，要求字数在400字左右，确保只生成小说内容不生成任何其他信息。\n小说名:${title}\n简介:${description}\n设定:${settings}\n大纲:${outline}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n续写指导:${content}'

export const defaultExpandPrompt = '请根据以下内容扩写小说段落，只对需要扩写的内容进行扩写，保持原有风格和情节连贯性，确保只生成段落不生成任何其他信息。\n小说名:${title}\n设定:${settings}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n需要扩写的段落:${content}'

export const defaultAbbreviatePrompt = '请根据以下内容缩写小说段落，只对需要缩写的内容进行缩写，保留核心情节和关键描写，确保只生成段落不生成任何其他信息。\n小说名:${title}\n设定:${settings}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n需要缩写的段落:${content}'

export const defaultRewriteAbbreviatePrompt = '请根据以下内容改写小说段落，只对需要改写的内容进行改写，确保只改写后段落不生成任何其他信息。\n小说名:${title}\n设定:${settings}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n需要改写的段落:${content}'

export const defaultUpdateSettingsPrompt = '请总结本章内容中的新增设定和改变的设定，包括人物设定、能力设定、物品设定等等，并更新小说的当前设定，确保只生成更新后的设定不生成任何其他信息。\n小说名:${title}\n简介:${description}\n当前设定:${settings}\n本章内容:${chapter}'