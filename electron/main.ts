import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';
import { initIntegrations } from './integrations/registry';
import { registerIpcHandlers } from './ipc/handlers';

const isDev = process.env.NODE_ENV === 'development';

// 앱 이름 설정
app.name = 'Lyra';

// macOS 메뉴바 앱 이름 설정
if (process.platform === 'darwin') {
  const appMenu: Electron.MenuItemConstructorOptions = {
    label: 'Lyra',
    submenu: [
      { role: 'about', label: 'Lyra에 관하여' },
      { type: 'separator' },
      { role: 'hide', label: 'Lyra 숨기기' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: 'Lyra 종료' },
    ],
  };
  const editMenu: Electron.MenuItemConstructorOptions = {
    label: '편집',
    submenu: [
      { role: 'undo' },
      { role: 'redo' },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'selectAll' },
    ],
  };
  const viewMenu: Electron.MenuItemConstructorOptions = {
    label: '보기',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      { role: 'resetZoom' },
      { role: 'zoomIn' },
      { role: 'zoomOut' },
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
  const windowMenu: Electron.MenuItemConstructorOptions = {
    label: '윈도우',
    submenu: [
      { role: 'minimize' },
      { role: 'zoom' },
      { type: 'separator' },
      { role: 'front' },
    ],
  };
  Menu.setApplicationMenu(Menu.buildFromTemplate([appMenu, editMenu, viewMenu, windowMenu]));
}

// Phase 1: 통합 워크스페이스 인프라 초기화
initIntegrations();
registerIpcHandlers();

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, '../build-resources/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    show: false,
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../build/index.html'));
  }
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
