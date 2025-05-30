import { DirectoryNotFoundError } from '../errors/fileStorageError';

type FileItem = {
  name: string;
  type: 'file' | 'directory';
};

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        invoke(channel: string, ...args: any[]): Promise<any>;
      };
    };
  }
}

export class FileStorageService {
  static async readFile(filePath: string): Promise<string> {
    const result = await window.electron.ipcRenderer.invoke('read-file', filePath);
    if (!result.success) {
      throw new Error(`Failed to read file: ${result.error}`);
    }
    return result.content;
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    const result = await window.electron.ipcRenderer.invoke('write-file', { filePath, content });
    if (!result.success) {
      if (result.error?.code === 'ENOENT') {
        throw new DirectoryNotFoundError();
      }
      throw new Error(`Failed to write file: ${result.error}`);
    }
  }

  static async listFiles(dirPath: string = '.'): Promise<FileItem[]> {
    const result = await window.electron.ipcRenderer.invoke('list-files', dirPath);
    if (!result.success) {
      throw new Error(`Failed to list files: ${result.error}`);
    }
    return result.items;
  }

  static async deleteFile(filePath: string): Promise<void> {
    const result = await window.electron.ipcRenderer.invoke('delete-file', filePath);
    if (!result.success) {
      if (result.error?.code === 'ENOENT') {
        throw new DirectoryNotFoundError();
      }
      throw new Error(`Failed to delete file: ${result.error}`);
    }
  }

  static async writeBlobFile(filePath: string, blob: Blob): Promise<void> {
    const buffer = await blob.arrayBuffer();
    const result = await window.electron.ipcRenderer.invoke('write-blob-file', {
      filePath,
      buffer: Buffer.from(buffer)
    });
    if (!result.success) {
      if (result.error?.code === 'ENOENT') {
        throw new DirectoryNotFoundError();
      }
      throw new Error(`Failed to write blob file: ${result.error}`);
    }
  }
}