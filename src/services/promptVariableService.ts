import { type Book, type Chapter } from './bookConfigService'

/**
 * 查找指定章节编号的前一章内容
 * @param chapters 章节数组
 * @param targetChapterNumber 目标章节编号
 * @returns 前一章内容
 */
export const findPreviousChapterContent = (chapters: Chapter[], targetChapterNumber: number): string => {
  let previousContent = ''
  const searchChapters = (chapters: Chapter[]) => {
    for (const chapter of chapters) {
      if (chapter.detailOutline && parseInt(chapter.detailOutline.chapterNumber) === targetChapterNumber - 1) {
        previousContent = chapter.content || ''
        return
      }
      if (chapter.children) {
        searchChapters(chapter.children)
      }
    }
  }
  searchChapters(chapters)
  return previousContent
}