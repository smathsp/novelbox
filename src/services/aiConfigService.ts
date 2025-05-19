import { FileStorageService } from './fileStorageService';
import { WorkspaceService } from './workspaceservice';
import { WorkspaceError } from '../errors/workspaceError';

export type ProviderConfig = {
  provider?: string;
  customProviders?: Array<{
    name: string;
    apiDomain: string;
    apiPath: string;
    model: string;
  }>;
  model: string;
  apiKey: string;
  proxyUrl: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
};

type AIConfig = {
  [provider: string]: ProviderConfig;
};

export class AIConfigService {
  private static getConfigPath(): string {
    const workspacePath = WorkspaceService.getWorkspacePath();
    return `${workspacePath}\\config\\aiconfig.json`;
  }

  static async saveConfig(provider: string, config: ProviderConfig): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      let currentConfig = await this.loadConfig();
      currentConfig[provider] = config;
      const configStr = JSON.stringify(currentConfig, null, 2);
      await FileStorageService.writeFile(configPath, configStr);
    } catch (error) {
      if (error instanceof WorkspaceError) {
        throw error;
      }
      throw new Error(`保存AI配置失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async deleteConfig(provider: string): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      let currentConfig = await this.loadConfig();
      if (currentConfig[provider]) {
        delete currentConfig[provider];
        const configStr = JSON.stringify(currentConfig, null, 2);
        await FileStorageService.writeFile(configPath, configStr);
      }
    } catch (error) {
      if (error instanceof WorkspaceError) {
        throw error;
      }
      throw new Error(`删除AI配置失败: ${error instanceof Error ? error.message : String(error)}`);
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
      return {};
    }
  }

  static async loadProviderConfig(provider: string): Promise<ProviderConfig> {
    const config = await this.loadConfig();
    const providerConfig = config[provider] || { model: '', apiKey: '', proxyUrl: '' };
    return {
      ...providerConfig,
      provider: providerConfig.provider || provider,
      customProviders: config.global?.customProviders
    };
  }

  static async getCurrentProviderConfig(): Promise<ProviderConfig> {
    const globalConfig = await this.loadProviderConfig('global');
    const provider = globalConfig.provider || 'openai';
    const providerConfig = await this.loadProviderConfig(provider);
    return {
      ...providerConfig,
      customProviders: globalConfig.customProviders
    };
  }
}