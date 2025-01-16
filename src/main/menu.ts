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
  dialog,
  ipcMain,
} from 'electron';

import type { Menubar } from 'menubar';

import { autoUpdater } from 'electron-updater';
import path from 'node:path';
import { resolveHtmlPath, startRecording, pauseRecording, exportRecordingWithUserPath, resumeRecording, getRecordingStats, setAutoRecording, getAutoRecording, getRecordingState, setMenuUpdateCallback } from './util';

import { settingsStore } from './store';
import { TrayIcons, MenuIcons } from './assets';


interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {

  private screenshotCount = 0;

  private checkForUpdatesMenuItem: MenuItem;

  private updateAvailableMenuItem: MenuItem;

  private updateReadyForInstallMenuItem: MenuItem;

  private aboutMenuItem: MenuItem;

  private browserWindow: BrowserWindow | null = null;

  private tray: Tray;

  private updateStatsLabel: string = 'Not Recording';

  private statsUpdateInterval: NodeJS.Timer | null = null;

  constructor(tray: Tray) {

    this.tray = tray;

    // Register for menu updates when recording state changes
    setMenuUpdateCallback(() => {
      this.tray.setContextMenu(this.buildMenu());
    });

    this.aboutMenuItem = new MenuItem({
      label: 'About',
      enabled: true,
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About DayReplay',
          message: 'DayReplay',
          detail: `Version: ${app.getVersion()}\n\nDayReplay is a tool for recording and exporting a timelapse of your day.`,
        });
      },
    });

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
      click: (_menuItem, _window, _event) => {
        autoUpdater.quitAndInstall();
      },
    });
  }

  private resetStatsUpdate() {
    console.log('Resetting stats update');
    this.updateStatsLabel = 'Not Recording';
    this.tray.setContextMenu(this.buildMenu());
  }

  private pauseStatsUpdate() {
    console.log('Pausing stats update');
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval as NodeJS.Timeout);
    }
  }
  private stopStatsUpdate() {
    console.log('Stopping stats update');
    this.pauseStatsUpdate();
    this.resetStatsUpdate();
  }

  private startStatsUpdate(interval: number) {
    console.log('Starting stats update');
    if (this.statsUpdateInterval) {
      clearInterval(this.statsUpdateInterval as NodeJS.Timeout);
    }
    // Update at the same rate as screenshots are taken
    this.statsUpdateInterval = setInterval(() => {
      const stats = getRecordingStats();
      if (stats.isRecording) {
        const minutes = Math.floor(stats.elapsedTime / 60);
        const seconds = stats.elapsedTime % 60;
        this.updateStatsLabel = `Recording: ${stats.screenshotCount} frames (${minutes}m ${seconds}s)`;
        this.tray.setContextMenu(this.buildMenu());
      }
    }, interval * 1000); // Use the recording interval
  }

  buildMenu(): Menu {
    const settings = {
      //@ts-ignore
      interval: settingsStore.get('interval'),
      //@ts-ignore
      resolution: settingsStore.get('resolution'),
    };


    const menuItems: MenuItemConstructorOptions[] = [];

    if (getRecordingState().isRecording) {
      menuItems.push({
        label: this.updateStatsLabel,
        enabled: false,
      });
    }

    menuItems.push(
      {
        label: `Taking Screenshots Every ${settings.interval}s at ${settings.resolution}`,
        enabled: false,
      },
      { type: 'separator' as const },
      {
        label: 'Auto-Record',
        type: 'checkbox',
        checked: getAutoRecording(),
        click: () => {
          setAutoRecording(!getAutoRecording());
          this.tray.setContextMenu(this.buildMenu());
        }
      },
      {
        label: getRecordingState().isRecording
          ? (getRecordingState().isPaused ? 'Resume Recording' : 'Stop Recording')
          : 'Start Recording',
        click: () => {
          if (!getRecordingState().isRecording) {
            if (startRecording(settings.interval, settings.resolution, this.tray)) {
              this.startStatsUpdate(settings.interval);
            }
          } else if (getRecordingState().isPaused) {
            resumeRecording(settings.interval, this.tray);
            this.startStatsUpdate(settings.interval);
          } else {
            pauseRecording(this.tray);
            this.pauseStatsUpdate();
          }
          this.tray.setContextMenu(this.buildMenu());
        },
        accelerator: 'CommandOrControl+R',
      },
      {
        label: 'Export Recording',
        click: async () => {
          const pickerWindow = new BrowserWindow({
            width: 350,
            height: 450,
            fullscreenable: false,
            show: false,
            frame: false,
            titleBarStyle: 'hidden',
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
            },
          });

          ipcMain.once('select-framerate', async (_event, fps: number) => {
            pickerWindow.close();
            await exportRecordingWithUserPath(this.tray, fps);
            this.stopStatsUpdate();
            this.tray.setContextMenu(this.buildMenu());
          });

          pickerWindow.loadURL(resolveHtmlPath('index.html') + '#/frameratePicker');
          pickerWindow.once('ready-to-show', () => {
            pickerWindow.show();
          });
        },
        accelerator: 'CommandOrControl+E',
        enabled: getRecordingState().isRecording && getRecordingState().isPaused,
      },
      { type: 'separator' as const },
      {
        label: 'Open Library',
        click: () => {
          if (this.browserWindow) {

            this.browserWindow.focus();
             this.browserWindow.loadURL(resolveHtmlPath('index.html') + '#/library');
            return;
          }

          this.browserWindow = new BrowserWindow({
            width: 1024,
            height: 728,
            minHeight: 480,
            minWidth: 640,
            frame: false,
            titleBarStyle: 'hidden',
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
            },
          });

          this.browserWindow.loadURL(resolveHtmlPath('index.html') + '#/library');

          this.browserWindow.on('closed', () => {
            this.browserWindow = null;
          });
        }
      },
      {
        label: 'Settings',
        accelerator: 'CommandOrControl+Shift+.',
        click: () => {
          if (this.browserWindow) {
            this.browserWindow.focus();
            this.browserWindow.loadURL(resolveHtmlPath('index.html') + '#/')
            return;
          }

          this.browserWindow = new BrowserWindow({
            width: 1024,
            height: 728,
            minHeight: 480,
            minWidth: 640,
            frame: false,
            titleBarStyle: 'hidden',
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
              preload: app.isPackaged
                ? path.join(__dirname, 'preload.js')
                : path.join(__dirname, '../../.erb/dll/preload.js'),
            },
          });

          // Add error handler
          this.browserWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
            console.error('Failed to load:', errorDescription);
          });

          this.browserWindow.loadURL(resolveHtmlPath('index.html') + '#/');

          this.browserWindow.webContents.on('did-finish-load', () => {
            if (this.browserWindow?.webContents.isDevToolsOpened()) {
              this.browserWindow.webContents.closeDevTools();
            }
          });

          this.browserWindow.on('closed', () => {
            this.browserWindow = null;
          });
        },
      },
      { type: 'separator' as const },
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
      { type: 'separator' as const },
      {
        ...this.checkForUpdatesMenuItem,
        click: (menuItem, window, event) => {
          this.checkForUpdatesMenuItem.click();
        }
      },
      {
        ...this.updateAvailableMenuItem,
        click: (menuItem, window, event) => {
          this.updateAvailableMenuItem.click();
        }
      },
      {
        ...this.updateReadyForInstallMenuItem,
        click: (menuItem, window, event) => {
          this.updateReadyForInstallMenuItem.click();
        }
      },
      {
        ...this.aboutMenuItem,
        click: (menuItem, window, event) => {
          this.aboutMenuItem.click();
        }
      },
      {
        label: 'Quit DayReplay',
        accelerator: 'CommandOrControl+Q',
        click: () => {
          app.quit();
        },
      }
    );

    return Menu.buildFromTemplate(menuItems);
  }

  incrementScreenshotCount() {
    this.screenshotCount++;
    this.tray.setContextMenu(this.buildMenu()); // Update the context menu
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
