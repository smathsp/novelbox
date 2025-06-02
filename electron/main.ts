import { app, BrowserWindow, ipcMain, dialog, Menu, shell, globalShortcut } from 'electron'
import { enable } from '@electron/remote/main'
import * as path from 'path'
import * as fs from 'fs/promises';

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, process.env.VITE_DEV_SERVER_URL ? '../dist/electron/preload.js' : './preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    frame: true,
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../public/icon.ico')
  })

  // 注册F12快捷键
  win.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // 检查localStorage中是否有工作区数据
  win.webContents.on('did-finish-load', async () => {
    const workspacePath = await win.webContents.executeJavaScript('localStorage.getItem("workspacePath")');
    const hasWorkspace = workspacePath !== null;
    const dirExists = hasWorkspace ? await fs.access(workspacePath).then(() => true).catch(() => false) : false;

    if (!hasWorkspace || !dirExists) {
      const { canceled, filePaths } = await dialog.showOpenDialog({
        title: '选择工作区目录',
        properties: ['openDirectory']
      });

      if (!canceled && filePaths.length > 0) {
        const workspacePath = filePaths[0].replace(/\\/g, '\\\\');
        win.webContents.send('workspace-changed', workspacePath);
        win.webContents.executeJavaScript(`
          localStorage.setItem('workspacePath', '${workspacePath.replace(/\\/g, '\\\\')}');
          window.location.reload();
        `);
      }
    }
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    // 设置CSP头
    win.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': ["default-src 'self' 'unsafe-inline' 'unsafe-eval' data: file: http: https: app:"]
        }
      });
    });

    // 使用file://协议加载本地文件
    win.loadFile(path.join(__dirname, '../../dist/index.html'))
  }

  enable(win.webContents)
}

// 创建应用菜单
function createMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    // { role: 'appMenu' }
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about', label: '关于' },
        { type: 'separator' },
        { role: 'services', label: '服务' },
        { type: 'separator' },
        { role: 'hide', label: '隐藏' },
        { role: 'hideOthers', label: '隐藏其他' },
        { role: 'unhide', label: '显示全部' },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    }] : []),
    // { role: 'fileMenu' }
    {
      label: '文件',
      submenu: [
        {
          label: '更换工作区',
          click: async () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              const { canceled, filePaths } = await dialog.showOpenDialog({
                title: '选择工作区目录',
                properties: ['openDirectory']
              });

              if (!canceled && filePaths.length > 0) {
                const workspacePath = filePaths[0].replace(/\\/g, '\\\\');
                win.webContents.send('workspace-changed', workspacePath);
                // 将工作区路径保存到localStorage
                win.webContents.executeJavaScript(`
                  localStorage.setItem('workspacePath', '${workspacePath.replace(/\\/g, '\\\\')}');
                  window.location.reload();
                `);
              }
            }
          }
        },
        {
          label: 'AI配置',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('open-ai-settings');
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close', label: '关闭' } : { role: 'quit', label: '退出' }
      ]
    },
    {
      role: 'help',
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: async () => {
            const win = BrowserWindow.getFocusedWindow();
            if (win) {
              win.webContents.send('open-about-page');
            }
          }
        },
        {
          label: '访问官网',
          click: async () => {
            await shell.openExternal('https://github.com/Rain-31/novelbox');
          }
        },
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template as any);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  createMenu();

  // 注册F12快捷键
  globalShortcut.register('F12', () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.webContents.toggleDevTools();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
})

// 在应用退出时注销所有快捷键
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

// 设置代理
ipcMain.on('set_proxy', (event, arg) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    const { http_proxy } = arg;
    win.webContents.session.setProxy({
      proxyRules: http_proxy
    }).then(() => {
      event.sender.send('proxy_status', { success: true });
    });
  }
});

// 移除代理
ipcMain.on('remove_proxy', (event) => {
  const win = BrowserWindow.getFocusedWindow();
  if (win) {
    win.webContents.session.setProxy({});
    event.sender.send('proxy_status', { success: true });
  }
});

// 导出文件
ipcMain.handle('save-file-as', async (_event, defaultPath: string) => {
  try {
    const { canceled, filePath: savePath } = await dialog.showSaveDialog({
      title: '导出文件',
      defaultPath: defaultPath || path.join(app.getPath('documents'), '未命名.docx'),
      filters: [
        { name: 'Word文档', extensions: ['docx'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });

    if (canceled || !savePath) {
      return { success: false, message: '导出文件已取消' };
    }

    return { success: true, filePath: savePath };
  } catch (error) {
    console.error('导出文件失败:', error);
    return { success: false, message: `导出文件失败: ${error}` };
  }
});

// 窗口控制
ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

ipcMain.on('maximize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  }
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    // 确保窗口关闭前清理相关资源
    win.webContents.session.clearCache();
    win.close();
  }
});

// 文件操作相关的 IPC 处理程序

// 读取文件
ipcMain.handle('read-file', async (_event, filePath: string) => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return { success: true, content };
  } catch (error: any) {
    console.error('读取文件失败:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
});

// 写入文件
ipcMain.handle('write-file', async (_event, { filePath, content }: { filePath: string; content: string }) => {
  try {
    await fs.writeFile(filePath, content, 'utf-8');
    return { success: true };
  } catch (error: any) {
    console.error('写入文件失败:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
});

// 写入二进制文件
ipcMain.handle('write-blob-file', async (_event, { filePath, buffer }: { filePath: string; buffer: Buffer }) => {
  try {
    await fs.writeFile(filePath, buffer);
    return { success: true };
  } catch (error: any) {
    console.error('写入二进制文件失败:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
});

// 列出目录内容
ipcMain.handle('list-files', async (_event, dirPath: string) => {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    return {
      success: true,
      items: items.map(item => ({
        name: item.name,
        type: item.isDirectory() ? 'directory' : 'file'
      }))
    };
  } catch (error: any) {
    console.error('列出目录内容失败:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
});

// 删除文件
ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    await fs.unlink(filePath);
    return { success: true };
  } catch (error: any) {
    console.error('删除文件失败:', error);
    return { 
      success: false, 
      error: {
        message: error.message,
        code: error.code
      }
    };
  }
});

// 获取版本号
ipcMain.handle('get-version', () => {
  return app.getVersion();
});

// 打开外部链接
ipcMain.on('open-external', (_event, url: string) => {
  shell.openExternal(url);
});
