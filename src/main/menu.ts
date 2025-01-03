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
import { resolveHtmlPath, startRecording, pauseRecording, exportRecording, resumeRecording, getRecordingStats } from './util';

import store from './store';
import { TrayIcons, MenuIcons } from './assets';


interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

let isRecording = false;
let isPaused = false;

export default class MenuBuilder {

  private screenshotCount = 0;

  private checkForUpdatesMenuItem: MenuItem;

  private updateAvailableMenuItem: MenuItem;

  private updateReadyForInstallMenuItem: MenuItem;

  private settingsWindow: BrowserWindow | null = null;

  private tray: Tray;

  private updateStatsLabel: string = 'Not Recording';

  private statsUpdateInterval: NodeJS.Timer | null = null;

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
      interval: store.get('interval'),
      resolution: store.get('resolution'),
      framerate: store.get('framerate'),
    };

    const progress = isRecording ? {
      label: this.updateStatsLabel,
      enabled: false,
    } : {
    };

    const menu = Menu.buildFromTemplate([
      progress,
      {
        label: `Taking Screenshots Every ${settings.interval}s at ${settings.resolution}`,
        enabled: false,
      },
      { type: 'separator' },
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
            if (isRecording) {
              this.startStatsUpdate(settings.interval);
            }
          } else if (isPaused) {
            resumeRecording(settings.interval, this.tray);
            isPaused = false;
            this.startStatsUpdate(settings.interval);
          } else {
            pauseRecording(this.tray);
            isPaused = true;
            this.pauseStatsUpdate();
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
          this.stopStatsUpdate();
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
