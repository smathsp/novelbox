type FileItem = {
  name: string;
  type: 'file' | 'directory';
};

export class FileStorageService {
  private static serverUrl = 'http://localhost:30073';

  static async readFile(filePath: string): Promise<string> {
    const response = await fetch(
      `${this.serverUrl}/read?path=${encodeURIComponent(filePath)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to read file: ${response.statusText}`);
    }
    
    return await response.text();
  }

  static async writeFile(filePath: string, content: string): Promise<void> {
    const response = await fetch(
      `${this.serverUrl}/write?path=${encodeURIComponent(filePath)}`, {
      method: 'POST',
      body: content,
      headers: {
        'Content-Type': 'text/plain'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to write file: ${response.statusText}`);
    }
  }

  static async listFiles(dirPath: string = '.'): Promise<FileItem[]> {
    const response = await fetch(
      `${this.serverUrl}/list?path=${encodeURIComponent(dirPath)}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.statusText}`);
    }
    
    return await response.json();
  }

  static async deleteFile(filePath: string): Promise<void> {
    const response = await fetch(
      `${this.serverUrl}/delete?path=${encodeURIComponent(filePath)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete file: ${response.statusText}`);
    }
  }

  static async writeBlobFile(filePath: string, blob: Blob): Promise<void> {
    const response = await fetch(
      `${this.serverUrl}/write?path=${encodeURIComponent(filePath)}`, {
      method: 'POST',
      body: blob,
      headers: {
        'Content-Type': 'application/octet-stream'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${response.statusText} - ${errorText}`);
    }
  }
}