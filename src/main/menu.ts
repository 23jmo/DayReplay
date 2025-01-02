/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  MenuItem,
  Tray,
} from 'electron';

import type { Menubar } from 'menubar';

import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { resolveHtmlPath, startRecording, pauseRecording, exportRecording, resumeRecording } from './util';

import store from './store';
import { TrayIcons, MenuIcons } from './assets';


interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

let isRecording = false;
let isPaused = false;

export default class MenuBuilder {

  private checkForUpdatesMenuItem: MenuItem;

  private updateAvailableMenuItem: MenuItem;

  private updateReadyForInstallMenuItem: MenuItem;

  private settingsWindow: BrowserWindow | null = null;

  private tray: Tray;

  constructor(tray: Tray) {

    this.tray = tray;

    this.checkForUpdatesMenuItem = new MenuItem({
      label: 'Check for updates',
      enabled: true,
      click: () => {
        autoUpdater.checkForUpdatesAndNotify();
      },
    });

    this.updateAvailableMenuItem = new MenuItem({
      label: 'An update is available',
      enabled: false,
      visible: false,
    });

    this.updateReadyForInstallMenuItem = new MenuItem({
      label: 'Restart to update',
      visible: false,
      click: () => {
        autoUpdater.quitAndInstall();
      },
    });
  }


  buildMenu(): Menu {
    const settings = {
      interval: store.get('interval'),
      resolution: store.get('resolution'),
      framerate: store.get('framerate'),
    };

    const menu = Menu.buildFromTemplate([
      {
        label: isRecording
          ? (isPaused ? 'Resume Recording' : 'Stop Recording')
          : 'Start Recording',
        // icon: isRecording
        //   ? (isPaused ? MenuIcons.play : MenuIcons.stop)
        //   : MenuIcons.play,
        click: () => {
          if (!isRecording) {
            isRecording = startRecording(
              settings.interval,
              settings.resolution,
              settings.framerate,
              this.tray
            );
            isPaused = false;
          } else if (isPaused) {
            resumeRecording(settings.interval, this.tray);
            isPaused = false;
          } else {
            pauseRecording(this.tray);
            isPaused = true;
          }
          this.tray.setContextMenu(this.buildMenu());
        },
        accelerator: 'CommandOrControl+R',
      },
      {
        label: 'Export Recording',
        // icon: MenuIcons.export,
        click: async () => {
          await exportRecording(this.tray);
          isRecording = false;
          isPaused = false;
          this.tray.setContextMenu(this.buildMenu());
        },
        accelerator: 'CommandOrControl+E',
        enabled: isRecording && isPaused,
      },
      {type: 'separator'},
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+Shift+.',
        click: () => {
          if (this.settingsWindow) {
            this.settingsWindow.focus();
            this.settingsWindow.webContents.closeDevTools();
            return;
          }

          this.settingsWindow = new BrowserWindow({
            width: 1024,
            height: 728,
            frame: false,
            titleBarStyle: 'hidden',
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: path.join(__dirname, '../../.erb/dll/preload.js'),
            },
          });

          // Add error handler
          this.settingsWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('Failed to load:', errorDescription);
          });

          this.settingsWindow.loadURL(resolveHtmlPath('index.html'));

          this.settingsWindow.webContents.on('did-finish-load', () => {
            if (this.settingsWindow?.webContents.isDevToolsOpened()) {
              this.settingsWindow.webContents.closeDevTools();
            }
          });

          this.settingsWindow.on('closed', () => {
            this.settingsWindow = null;
          });
        },
      },
      { type: 'separator' },
        {
          label: 'Developer',
          submenu: [
            {
              role: 'reload',
              accelerator: 'CommandOrControl+R',
            },
            {
              role: 'toggleDevTools',
              accelerator:
                process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
            },
            {
              label: 'View Application Logs',
            },
          ],
        },
        { type: 'separator' },
        this.checkForUpdatesMenuItem,
        this.updateAvailableMenuItem,
        this.updateReadyForInstallMenuItem,
        {
          label: 'Quit DayReplay',
          accelerator: 'CommandOrControl+Q',
          click: () => {
            app.quit();
          },
        },
      ]);
    return menu;
  }

  setCheckForUpdatesMenuItem(enabled: boolean) {
    this.checkForUpdatesMenuItem.enabled = enabled;
  }

  setUpdateAvailableMenuItem(visible: boolean) {
    this.updateAvailableMenuItem.visible = visible;
  }

  setUpdateReadyForInstallMenuItem(visible: boolean) {
    this.updateReadyForInstallMenuItem.visible = visible;
  }

  isUpdateAvailableMenuVisible() {
    return this.updateAvailableMenuItem.visible;
  }

}
