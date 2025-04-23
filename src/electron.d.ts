interface ElectronAPI {
  // 文件操作
  saveFileAs: (defaultPath: string) => Promise<{ success: boolean; filePath?: string; message?: string }>;
  onWorkspaceChanged: (callback: (workspacePath: string) => void) => void;

  // 窗口操作
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  
  // 代理设置
  setProxy: (config: { http_proxy: string }) => void;
  removeProxy: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};