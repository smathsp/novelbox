import { FileStorageService } from './fileStorageService';
import { WorkspaceService } from './workspaceservice';
import { WorkspaceError } from '../errors/workspaceError';

export type ModelConfig = {
  maxTokens?: number;
  temperature?: number;
  topP?: number;
};

export type CustomProvider = {
  name: string;
  apiDomain: string;
  apiPath: string;
  model: string;
};

export type GlobalConfig = {
  provider: string;
  customProviders: CustomProvider[];
};

export type ProviderConfig = {
  provider?: string;
  model: string;
  apiKey: string;
  proxyUrl: string;
  modelConfigs?: {
    [modelId: string]: ModelConfig;
  };
  // 为了类型兼容，保留customProviders字段，但实际存储时会被移除
  customProviders?: CustomProvider[];
};

type AIConfig = {
  [provider: string]: ProviderConfig | GlobalConfig;
};

export class AIConfigService {
  private static getConfigPath(): string {
    const workspacePath = WorkspaceService.getWorkspacePath();
    return `${workspacePath}\\config\\aiconfig.json`;
  }

  static async saveConfig(provider: string, config: ProviderConfig | GlobalConfig): Promise<void> {
    try {
      const configPath = this.getConfigPath();
      let currentConfig = await this.loadConfig();
      
      // 如果是global配置，确保customProviders只保存在global中
      if (provider === 'global' && 'customProviders' in config) {
        currentConfig[provider] = config;
      } else if (provider !== 'global') {
        // 对于非global配置，确保不包含customProviders
        const providerConfig = {...config} as ProviderConfig;
        delete providerConfig.customProviders;
        currentConfig[provider] = providerConfig;
      }
      
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

    // 如果请求的是global配置，直接返回带有默认值的对象
    if (provider === 'global') {
      const globalConfig = config.global as GlobalConfig || { provider: 'openai', customProviders: [] };
      return {
        model: '',
        apiKey: '',
        proxyUrl: '',
        // 使用全局配置中存储的provider，而不是硬编码为'global'
        provider: globalConfig.provider || 'openai',
        customProviders: globalConfig.customProviders || []
      };
    }
    
    // 对于其他配置，加载对应的provider配置
    const providerConfig = config[provider] as ProviderConfig || { model: '', apiKey: '', proxyUrl: '' };
    
    // 从global配置中获取customProviders，确保只有一份
    const globalConfig = config.global as GlobalConfig || { provider: 'openai', customProviders: [] };
    
    return {
      ...providerConfig,
      provider: providerConfig.provider || provider,
      // 只从global中获取customProviders
      customProviders: globalConfig.customProviders || []
    };
  }

  static async getCurrentProviderConfig(): Promise<ProviderConfig> {
    const globalConfig = await this.loadProviderConfig('global');
    const provider = globalConfig.provider || 'openai';
    const providerConfig = await this.loadProviderConfig(provider);
    
    // 确保返回的配置中包含customProviders
    return {
      ...providerConfig,
      customProviders: globalConfig.customProviders
    };
  }
  
  static async saveGlobalConfig(globalConfig: GlobalConfig): Promise<void> {
    await this.saveConfig('global', globalConfig);
  }
  
  static async getCustomProviders(): Promise<CustomProvider[]> {
    const globalConfig = await this.loadProviderConfig('global');
    return globalConfig.customProviders || [];
  }
}