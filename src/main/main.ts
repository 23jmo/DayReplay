/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */

import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, Menu, ipcMain, Tray, dialog, systemPreferences } from 'electron';

import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import { menubar } from 'menubar';

import MenuBuilder from './menu';
import { getRecordingStats, resolveHtmlPath } from './util';
import store from './store';
import type { Settings } from './store';
import { TrayIcons } from './assets';

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

// const mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.handle('settings:save', async (_, settings: Settings) => {
  //@ts-ignore
  store.set('interval', settings.interval);
  //@ts-ignore
  store.set('resolution', settings.resolution);
  //@ts-ignore
  store.set('framerate', settings.framerate);
  return true;
});

ipcMain.handle('screenshots-taken', () => {
  const stats = getRecordingStats();
  return stats.screenshotCount;
});

ipcMain.handle('settings:get', async () => {
  return {
    //@ts-ignore
    interval: store.get('interval'),
    //@ts-ignore
    resolution: store.get('resolution'),
    //@ts-ignore
    framerate: store.get('framerate'),
  } as Settings;
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload,
    )
    .catch(console.log);
};

// const createMainWindow = () => {
//   mainWindow = new BrowserWindow({
//     backgroundColor: '#FFF',
//     width: 250,
//     height: 150,
//     webPreferences: {
//       devTools: is.development,
//       nodeIntegration: true,
//     }
//   });
//   if (is.development) {
//     mainWindow.webContents.openDevTools({ mode: 'detach' });
//     mainWindow.loadURL('http://localhost:3000');
//   } else {
//     mainWindow.loadURL(`file://${path.join(__dirname, '../../build/index.html')}`);
//   }
// };

// const createSettingsWindow = async () => {
//   if (isDebug) {
//     await installExtensions();
//   }

//   const RESOURCES_PATH = app.isPackaged
//     ? path.join(process.resourcesPath, 'assets')
//     : path.join(__dirname, '../../assets');

//   const getAssetPath = (...paths: string[]): string => {
//     return path.join(RESOURCES_PATH, ...paths);
//   };

//   mainWindow = new BrowserWindow({
//     show: false,
//     width: 1024,
//     height: 728,
//     icon: getAssetPath('icon.png'),
//     webPreferences: {
//       preload: app.isPackaged
//         ? path.join(__dirname, 'preload.js')
//         : path.join(__dirname, '../../.erb/dll/preload.js'),
//     },
//   });

//   mainWindow.loadURL(resolveHtmlPath('index.html'));

//   mainWindow.on('ready-to-show', () => {
//     if (!mainWindow) {
//       throw new Error('"mainWindow" is not defined');
//     }
//     if (process.env.START_MINIMIZED) {
//       mainWindow.minimize();
//     } else {
//       mainWindow.show();
//     }
//   });

//   mainWindow.on('closed', () => {
//     mainWindow = null;
//   });

//   // Open urls in the user's browser
//   mainWindow.webContents.setWindowOpenHandler((edata) => {
//     shell.openExternal(edata.url);
//     return { action: 'deny' };
//   });

//   // Remove this if your app does not use auto updates
//   // eslint-disable-next-line
//   new AppUpdater();
// };
/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    console.log('app ready');
    log.info('Creating tray with icon:', TrayIcons.default);

    try {
      log.info('App is packaged:', app.isPackaged);
      log.info('Resources path:', process.resourcesPath);
      log.info('App path:', app.getAppPath());
      log.info('Looking for tray icon at:', TrayIcons.default);

      if (!fs.existsSync(TrayIcons.default)) {
        log.error('Tray icon not found!');
        // List the contents of the assets directory
        const assetsDir = path.dirname(path.dirname(TrayIcons.default));
        log.info('Contents of assets directory:', fs.readdirSync(assetsDir));
        throw new Error(`Tray icon not found at ${TrayIcons.default}`);
      }

      log.info('Tray icon found, creating tray...');
      const tray = new Tray(TrayIcons.default);
      const menuBuilder = new MenuBuilder(tray);
      const contextMenu = menuBuilder.buildMenu();
      tray.setContextMenu(contextMenu);

      log.info('Tray created successfully');

      const mb = menubar({
        tray,
        index: resolveHtmlPath('index.html'),
        preloadWindow: true,
        showDockIcon: false,
      });

      mb.on('ready', () => {
        log.info('Menubar is ready');
        mb.tray.removeAllListeners();

        mb.tray.setToolTip('DayReplay');
        mb.tray.setIgnoreDoubleClickEvents(true);

        mb.hideWindow();

        mb.tray.on('right-click', (_event, bounds) => {
          mb.tray.popUpContextMenu(contextMenu, { x: bounds.x, y: bounds.y });
        });
        mb.tray.on('click', (_event, bounds) => {
          mb.tray.popUpContextMenu(contextMenu, { x: bounds.x, y: bounds.y });
        });

        log.info('Menubar setup complete');
        Menu.setApplicationMenu(contextMenu);
      });

      mb.on('after-create-window', () => {
        log.info('Menubar window created');
      });

      mb.on('after-show', () => {
        log.info('Menubar window shown');
      });

      mb.on('after-hide', () => {
        log.info('Menubar window hidden');
      });

    } catch (error) {
      log.error('Failed to create tray:', error);
      dialog.showErrorBox(
        'Failed to create tray',
        'The application failed to start properly. Please try reinstalling the app.'
      );
      app.quit();
    }

    // Remove the initial permission check since it's not reliable
    // We'll check permissions when we actually try to take screenshots
  })
  .catch((error) => {
    log.error('Error in app.whenReady:', error);
  });

ipcMain.on('window-controls', (_, command) => {
  const window = BrowserWindow.getFocusedWindow();
  if (!window) return;

  switch (command) {
    case 'minimize':
      window.minimize();
      break;
    case 'maximize':
      if (window.isMaximized()) {
        window.unmaximize();
      } else {
        window.maximize();
      }
      break;
    case 'close':
      window.close();
      break;
  }
});
