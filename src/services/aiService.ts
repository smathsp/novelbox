import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AxiosError } from 'axios';
import axios from 'axios';
import { ProviderConfig } from './aiConfigService';


interface AIResponse {
  text: string;
  error?: string;
}

type StreamCallback = (text: string, error?: string, complete?: boolean) => void;

interface StreamAIResponse {
  cancel: () => void;
  error?: string;
  text?: string;
}

class AIService {
  private config: ProviderConfig;
  private openaiClient?: OpenAI;
  private anthropicClient?: Anthropic;
  private geminiClient?: GoogleGenerativeAI;
  private deepseekClient?: OpenAI;

  constructor(config: ProviderConfig) {
    this.config = config;

    // 设置代理
    if (config.proxyUrl) {
      window.electronAPI.setProxy({ http_proxy: config.proxyUrl });
    } else {
      window.electronAPI.removeProxy();
    }

    switch (config.provider) {
      case 'openai':
        this.openaiClient = new OpenAI({
          apiKey: config.apiKey,
          baseURL: 'https://api.openai.com/v1',
          dangerouslyAllowBrowser: true,
        });
        break;
      case 'anthropic':
        this.anthropicClient = new Anthropic({
          apiKey: config.apiKey,
          baseURL: 'https://api.anthropic.com'
        });
        break;
      case 'gemini':
        this.geminiClient = new GoogleGenerativeAI(config.apiKey);
        break;
      case 'deepseek':
        this.deepseekClient = new OpenAI({
          apiKey: config.apiKey,
          baseURL: 'https://api.deepseek.com',
          dangerouslyAllowBrowser: true,
        });
        break;
      default:
        // 自定义服务商不需要初始化SDK客户端
        break;
    }
  }

  private async generateWithOpenAI(prompt: string, stream?: StreamCallback, signal?: AbortSignal): Promise<string> {
    if (!this.openaiClient) throw new Error('AI client not initialized');

    if (stream) {
      const response = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 25000,
        stream: true
      }, { signal: signal });

      let fullText = '';
      try {
        for await (const chunk of response) {
          if (signal?.aborted) break;
          const content = chunk.choices[0]?.delta?.content || '';
          fullText += content;
          stream(content);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          stream('', '已中止生成');
          return fullText;
        } else if (error instanceof Error) {
          stream('', error.message);
        }
      } finally {
        if (!signal?.aborted) {
          stream('', undefined, true);
        }
      }
      return fullText;
    } else {
      const response = await this.openaiClient.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 25000
      });
      return response.choices[0]?.message?.content || '';
    }
  }

  private async generateWithAnthropic(prompt: string, stream?: StreamCallback, signal?: AbortSignal): Promise<string> {
    if (!this.anthropicClient) throw new Error('Anthropic client not initialized');

    if (stream) {
      const response = this.anthropicClient.messages.stream({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 25000
      }, { signal: signal });

      let fullText = '';
      try {
        response.on('text', (text) => {
          if (signal?.aborted) {
            response.controller.abort();
            return;
          }
          fullText += text;
          stream(text);
        });

        await response.finalMessage();
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          stream('', '已中止生成');
          return fullText;
        } else if (error instanceof Error) {
          stream('', error.message);
        }
      } finally {
        if (!signal?.aborted) {
          stream('', undefined, true);
        }
      }
      return fullText;
    } else {
      const response = await this.anthropicClient.messages.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 25000
      });
      return response.content[0]?.type === 'text' ? response.content[0].text : '';
    }
  }

  private async generateWithGemini(prompt: string, stream?: StreamCallback, signal?: AbortSignal): Promise<string> {
    if (!this.geminiClient) throw new Error('Gemini client not initialized');

    const model = this.geminiClient.getGenerativeModel({ model: this.config.model });

    if (stream) {
      const response = await model.generateContentStream(prompt, { signal });
      let fullText = '';
      try {
        for await (const chunk of response.stream) {
          if (signal?.aborted) {
            break;
          }
          const content = chunk.text();
          fullText += content;
          stream(content);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          stream('', '已中止生成');
          return fullText;
        } else {
          stream('', error instanceof Error ? error.message : 'Stream error');
        }
      } finally {
        if (!signal?.aborted) {
          stream('', undefined, true);
        }
      }
      return fullText;
    } else {
      const response = await model.generateContent(prompt);
      const result = await response.response;
      return result.text();
    }
  }

  private async generateWithDeepseek(prompt: string, stream?: StreamCallback, signal?: AbortSignal): Promise<string> {
    if (!this.deepseekClient) throw new Error('AI client not initialized');

    if (stream) {
      const response = await this.deepseekClient.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        stream: true
      }, { signal: signal });

      let fullText = '';
      try {
        for await (const chunk of response) {
          if (signal?.aborted) break;
          const content = chunk.choices[0]?.delta?.content || '';
          fullText += content;
          stream(content);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          stream('', '已中止生成');
          return fullText;
        } else if (error instanceof Error) {
          stream('', error.message);
        }
      } finally {
        if (!signal?.aborted) {
          stream('', undefined, true);
        }
      }
      return fullText;
    } else {
      const response = await this.deepseekClient.chat.completions.create({
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      });
      return response.choices[0]?.message?.content || '';
    }
  }

  private async generateWithCustomProvider(prompt: string, stream?: StreamCallback, signal?: AbortSignal): Promise<string> {
    const customProvider = this.config.customProviders?.find(p => p.name === this.config.provider);
    if (!customProvider) {
      throw new Error('自定义服务商配置未找到');
    }

    // 处理域名前缀
    const domain = customProvider.apiDomain.startsWith('http://') || customProvider.apiDomain.startsWith('https://')
      ? customProvider.apiDomain
      : `https://${customProvider.apiDomain}`;
    
    // 处理API路径
    const path = customProvider.apiPath.startsWith('/') 
      ? customProvider.apiPath 
      : `/${customProvider.apiPath}`;
    
    const baseURL = `${domain}${path}`;

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`
    };

    if (stream) {
      try {
        const response = await fetch(baseURL, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: this.config.model,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            stream: true
          }),
          signal
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('Response body is null');
        }

        let fullText = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done || signal?.aborted) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n').filter(line => line.trim() !== '');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices[0]?.delta?.content || '';
                fullText += content;
                stream(content);
              } catch (e) {
                console.error('解析响应数据失败:', e);
              }
            }
          }
        }

        return fullText;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          stream('', '已中止生成');
          return '';
        }
        throw error;
      }
    } else {
      const response = await axios.post(baseURL, {
        model: this.config.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }, {
        headers,
        signal
      });

      return response.data.choices[0]?.message?.content || '';
    }
  }

  async generateText(prompt: string, stream?: StreamCallback): Promise<AIResponse | StreamAIResponse> {
    const abortController = new AbortController();
    let aborted = false;

    try {
      if (stream) {
        const streamProcess = (async () => {
          try {
            switch (this.config.provider) {
              case 'openai':
                await this.generateWithOpenAI(prompt, (text, error) => {
                  if (aborted) return;
                  stream(text, error);
                }, abortController.signal);
                break;
              case 'anthropic':
                await this.generateWithAnthropic(prompt, (text, error) => {
                  if (aborted) return;
                  stream(text, error);
                }, abortController.signal);
                break;
              case 'gemini':
                await this.generateWithGemini(prompt, (text, error) => {
                  if (aborted) return;
                  stream(text, error);
                }, abortController.signal);
                break;
              case 'deepseek':
                await this.generateWithDeepseek(prompt, (text, error) => {
                  if (aborted) return;
                  stream(text, error);
                }, abortController.signal);
                break;
              default:
                // 使用自定义服务商
                await this.generateWithCustomProvider(prompt, (text, error) => {
                  if (aborted) return;
                  stream(text, error);
                }, abortController.signal);
            }
            stream('', undefined, true);
          } catch (error) {
            console.error('AI生成失败:', error);
            if (!aborted) stream('', error instanceof Error ? error.message : 'Request failed');
          }
        })();

        return {
          cancel: () => {
            aborted = true;
            abortController.abort();
            stream('', '已中止生成', true);
          }
        };
      }

      let text: string;
      switch (this.config.provider) {
        case 'openai':
          text = await this.generateWithOpenAI(prompt);
          break;
        case 'anthropic':
          text = await this.generateWithAnthropic(prompt);
          break;
        case 'gemini':
          text = await this.generateWithGemini(prompt);
          break;
        case 'deepseek':
          text = await this.generateWithDeepseek(prompt);
          break;
        default:
          text = await this.generateWithCustomProvider(prompt);
      }

      console.log('生成的文本:', text);

      if (!text) {
        throw new Error('AI返回数据格式错误');
      }

      return { text };
    } catch (error) {
      console.error('AI生成失败:', error);
      
      let errorMessage = '生成失败';
      if (error instanceof AxiosError && error.response?.data?.error?.message) {
        errorMessage = `API错误: ${error.response.data.error.message}`;
      } else if (error instanceof Error) {
        errorMessage = `请求错误: ${error.message}`;
      }

      return {
        text: '',
        error: errorMessage
      };
    }
  }
}

export default AIService;