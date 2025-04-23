// electron-dev.cjs
// 使用esbuild-register处理TypeScript文件
process.env.VITE_DEV_SERVER_URL = 'http://localhost:5173/';
process.env.NODE_ENV = 'development';
require('esbuild-register');
require('./electron/main.ts');