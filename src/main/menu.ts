/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable prettier/prettier */
import {
  app,
  Menu,
  shell,
  BrowserWindow,
  MenuItemConstructorOptions,
  MenuItem,
} from 'electron';

import type { Menubar } from 'menubar';

import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { resolveHtmlPath, startRecording, pauseRecording, exportRecording } from './util';

import store from './store';


interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {

  private checkForUpdatesMenuItem: MenuItem;

  private updateAvailableMenuItem: MenuItem;

  private updateReadyForInstallMenuItem: MenuItem;

  private settingsWindow: BrowserWindow | null = null;

  constructor() {

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
    const contextMenu = Menu.buildFromTemplate([
      {type: 'separator'},
      {
        label: 'Start Recording',
        accelerator: 'CommandOrControl+Shift+R',
        click: () => {
          const settings = {
            interval: store.get('interval'),
            resolution: store.get('resolution'),
            framerate: store.get('framerate'),
          }
          console.log('Settings:', settings);

          startRecording(
            settings.interval,
            settings.resolution,
            settings.framerate
          );
        },
      },
      { // TODO: make it only show when recording is active
        label: 'Stop Recording',
        accelerator: 'CommandOrControl+Shift+S',
        click: async () => {
          await exportRecording();
        },
      },
      {type: 'separator'},
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+Shift+.',
        click: () => {
          if (this.settingsWindow) {
            this.settingsWindow.focus();
            return;
          }

          this.settingsWindow = new BrowserWindow({
            width: 1024,
            height: 728,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: path.join(__dirname, '../../.erb/dll/preload.js'),
            },
          });

          console.log('Preload path:', path.join(__dirname, '../../.erb/dll/preload.js'));
          this.settingsWindow.webContents.openDevTools();

          // Add error handler
          this.settingsWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('Failed to load:', errorDescription);
          });

          this.settingsWindow.loadURL(resolveHtmlPath('index.html'));

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
    return contextMenu;
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
