import { Buffer } from 'buffer';

// 将Buffer添加到全局对象
window.Buffer = Buffer;

// 声明全局类型
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
} 