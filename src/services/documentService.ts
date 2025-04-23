import { type Book, type Chapter } from './bookConfigService';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { FileStorageService } from './fileStorageService';
import { htmlToText } from 'html-to-text';

export class DocumentService {
    private static instance: DocumentService;

    public static getInstance(): DocumentService {
        if (!DocumentService.instance) {
            DocumentService.instance = new DocumentService();
        }
        return DocumentService.instance;
    }

    private processChapter(chapter: Chapter, level: number = 1): Paragraph[] {
        const paragraphs: Paragraph[] = [];

        // 添加章节标题
        paragraphs.push(
            new Paragraph({
                text: chapter.title,
                heading: level <= 3 ? (level as unknown as typeof HeadingLevel[keyof typeof HeadingLevel]) : HeadingLevel.HEADING_3,
                spacing: { before: 400, after: 200 }
            })
        );

        // 添加章节内容
        if (chapter.content) {
            // 将HTML内容转换为纯文本
            const plainText = htmlToText(chapter.content, {
                wordwrap: false,
                preserveNewlines: true
            });
            const contentParagraphs = plainText.split('\n').filter(p => p.trim());
            contentParagraphs.forEach(p => {
                paragraphs.push(
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: p.trim(),
                                size: 24
                            })
                        ],
                        spacing: { before: 200, after: 200 }
                    })
                );
            });
        }

        // 处理子章节
        if (chapter.children) {
            chapter.children.forEach(child => {
                paragraphs.push(...this.processChapter(child, level + 1));
            });
        }

        return paragraphs;
    }

    public async exportToWord(book: Book, filePath: string): Promise<string> {
        try {
            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: [
                            // 添加书名
                            new Paragraph({
                                text: book.title,
                                heading: HeadingLevel.TITLE,
                                spacing: { before: 400, after: 400 }
                            }),
                            // 添加简介
                            new Paragraph({
                                children: [
                                    new TextRun({
                                        text: book.description || '',
                                        size: 24,
                                        italics: true
                                    })
                                ],
                                spacing: { before: 200, after: 400 }
                            }),
                            // 处理所有章节
                            ...(book.content || []).flatMap(chapter => 
                                this.processChapter(chapter)
                            )
                        ]
                    }
                ]
            });

            // 生成文档
            const buffer = await Packer.toBlob(doc);

            // 保存文件
            await FileStorageService.writeBlobFile(filePath, buffer);

            return filePath;
        } catch (error) {
            console.error('导出Word文档失败:', error);
            throw new Error('导出Word文档失败:' + error);
        }
    }
}