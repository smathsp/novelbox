export const defaultBookNameAndDescPrompt = '根据以下内容，生成一个引人入胜的小说书名和针对这个书名的简介，确保只生成书名和简介不生成任何其他信息，输出格式是：\n书名:\n简介:\n\n${content}'

export const defaultSettingsPrompt = '根据以下内容，生成一个引人入胜的小说设定，确保只生成设定不生成任何其他信息:\n小说名:${title}\n,简介:${description}\n,设定要求:${content}'

export const defaultOutlinePrompt = '根据以下内容，生成一个引人入胜的小说剧情大纲，确保只生成大纲不生成任何其他信息:\n小说名:${title}\n,简介:${description}\n,大纲要求:${content}'

export const defaultChapterOutlinePrompt = '根据以下内容，生成本章节细纲，确保只生成本章节细纲不生成任何其他信息，小说名:${title}\n,简介:${description}\n,设定:${settings}\n,大纲:${outline}\n,本章大致剧情:${content}'

export const defaultChapterPrompt = '请根据以下信息生成一个完整的小说章节，要求字数在2500字以上，确保只生成小说章节不生成任何其他信息。\n小说名:${title}\n,简介:${description}\n,设定:${settings}\n,大纲:${outline}\n本章细纲:${chapterOutline}'

export const defaultContinuePrompt = '请根据以下信息续写小说内容，要求字数在400字左右，确保只生成小说内容不生成任何其他信息。\n小说名:${title}\n简介:${description}\n设定:${settings}\n大纲:${outline}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n续写指导:${content}'

export const defaultExpandPrompt = '请根据以下内容扩写小说段落，只对需要扩写的内容进行扩写，保持原有风格和情节连贯性，确保只生成段落不生成任何其他信息。\n小说名:${title}\n设定:${settings}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n需要扩写的段落:${content}'

export const defaultAbbreviatePrompt = '请根据以下内容缩写小说段落，只对需要缩写的内容进行缩写，保留核心情节和关键描写，确保只生成段落不生成任何其他信息。\n小说名:${title}\n设定:${settings}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n需要缩写的段落:${content}'

export const defaultRewriteAbbreviatePrompt = '请根据以下内容改写小说段落，只对需要改写的内容进行改写，确保只改写后段落不生成任何其他信息。\n小说名:${title}\n设定:${settings}\n本章细纲:${chapterOutline}\n已有内容:${chapter}\n需要改写的段落:${content}'

export const defaultUpdateSettingsPrompt = '请根据以下内容更新小说设定，确保只更新设定不生成任何其他信息。\n小说名:${title}\n简介:${description}\n当前设定:${settings}\n更新要求:${content}'