import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'FaboGinger',
    show: false, // 先不显示，等加载完成后再显示
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    mainWindow.show();
  } else {
    // 生产环境：打包后文件在 app.asar 中
    // app.getAppPath() 返回 app.asar 的路径
    // 文件结构: app.asar/dist-react/index.html
    const appPath = app.getAppPath();
    const htmlPath = path.join(appPath, 'dist-react', 'index.html');
    
    // 打开开发者工具以便调试（生产环境临时启用，查看控制台错误）
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    
    console.log('=== 生产环境路径信息 ===');
    console.log('app.getAppPath():', appPath);
    console.log('__dirname:', __dirname);
    console.log('HTML path:', htmlPath);
    console.log('app.isPackaged:', app.isPackaged);
    
    // loadFile 可以处理 asar 中的文件
    mainWindow.loadFile(htmlPath)
      .then(() => {
        console.log('Successfully loaded HTML file');
        mainWindow?.show();
      })
      .catch((error) => {
        console.error('Failed to load HTML file:', error);
        console.error('Error details:', error.message);
        
        // 尝试备用路径（相对于 __dirname）
        const alternativePath = path.join(__dirname, '../dist-react/index.html');
        console.log('Trying alternative path:', alternativePath);
        
        if (mainWindow) {
          mainWindow.loadFile(alternativePath)
            .then(() => {
              console.log('Successfully loaded from alternative path');
              mainWindow?.show();
            })
            .catch((err) => {
              console.error('Failed to load from alternative path:', err);
              // 显示窗口以便查看错误信息
              mainWindow?.show();
            });
        }
      });
  }

  // 添加错误处理，帮助调试空白界面问题
  if (mainWindow) {
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error('Failed to load page:');
      console.error('  Error code:', errorCode);
      console.error('  Description:', errorDescription);
      console.error('  URL:', validatedURL);
    });
    
    mainWindow.webContents.on('dom-ready', () => {
      console.log('DOM is ready');
    });
    
    mainWindow.webContents.on('did-finish-load', () => {
      console.log('Page finished loading');
      if (!isDev) {
        // 生产环境延迟关闭开发者工具（可选，先保留以便调试）
        // mainWindow.webContents.closeDevTools();
      }
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('save-svg', async (_event, svgContent: string, defaultName: string) => {
  if (!mainWindow) return { success: false, error: '窗口未就绪' };
  try {
    const { filePath } = await dialog.showSaveDialog(mainWindow, {
      title: '保存SVG文件',
      defaultPath: defaultName || 'output.svg',
      filters: [
        { name: 'SVG 文件', extensions: ['svg'] },
        { name: '所有文件', extensions: ['*'] },
      ],
    });

    if (!filePath) {
      return { success: false, error: '用户取消保存' };
    }

    fs.writeFileSync(filePath, svgContent, 'utf-8');
    return { success: true, path: filePath };
  } catch (error) {
    console.error('保存SVG失败:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('load-svg', async () => {
  if (!mainWindow) return { success: false, error: '窗口未就绪' };
  try {
    const { filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: '打开SVG文件',
      filters: [
        { name: 'SVG 文件', extensions: ['svg'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      properties: ['openFile'],
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, error: '用户取消打开' };
    }

    const svg = fs.readFileSync(filePaths[0], 'utf-8');
    return { success: true, content: svg, path: filePaths[0] };
  } catch (error) {
    console.error('加载SVG失败:', error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle('run-deepnest', async (_event, config: { 
  materialSvg: string; 
  partsSvg: string[]; 
  outputPath: string;
  rotationMode?: 'none' | '90' | 'all';
  spacing?: number;
  quality?: 'fast' | 'balanced' | 'best';
}) => {
  console.log('收到 Deepnest 调用请求:', {
    partsCount: config.partsSvg.length,
    rotationMode: config.rotationMode || '90',
    spacing: config.spacing || 2,
    quality: config.quality || 'balanced',
  });

  try {
    const { runNesting } = await import('./deepnest');
    
    const result = await runNesting({
      materialSvg: config.materialSvg,
      partsSvg: config.partsSvg,
      rotationMode: config.rotationMode || '90',
      spacing: config.spacing || 2,
      quality: config.quality || 'balanced',
    });

    return {
      success: true,
      outputPath: config.outputPath,
      resultSvg: result.resultSvg,
      efficiency: result.efficiency,
      partsPlaced: result.partsPlaced,
      message: `排版完成，已放置 ${result.partsPlaced} 个零件，利用率 ${(result.efficiency * 100).toFixed(1)}%`,
    };
  } catch (error) {
    console.error('Deepnest 调用失败:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
});
