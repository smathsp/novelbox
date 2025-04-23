import { FileStorageService } from './fileStorageService';
import { WorkspaceService } from './workspaceservice';
import { WorkspaceError } from '../errors/workspaceError';

type AIConfig = {
  provider: string;
  model: string;
  apiKey: string;
  proxyUrl: string;
};

export class AIConfigService {
  private static getConfigPath(): string {
    const workspacePath = WorkspaceService.getWorkspacePath();
    return `${workspacePath}\\config\\aiconfig.json`;
  }

  static async saveConfig(config: AIConfig): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      const configStr = JSON.stringify(config, null, 2);
      await FileStorageService.writeFile(configPath, configStr);
    } catch (error) {
      if (error instanceof WorkspaceError) {
        throw error;
      }
      throw new Error(`保存AI配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async loadConfig(): Promise<AIConfig> {
    try {
      const configPath = this.getConfigPath();
      const configStr = await FileStorageService.readFile(configPath);
      return JSON.parse(configStr) as AIConfig;
    } catch (error) {
      if (error instanceof WorkspaceError) {
        throw error;
      }
      return {
        provider: '',
        model: '',
        apiKey: '',
        proxyUrl: ''
      };
    }
  }
}