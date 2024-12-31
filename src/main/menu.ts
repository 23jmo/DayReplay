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

interface DarwinMenuItemConstructorOptions extends MenuItemConstructorOptions {
  selector?: string;
  submenu?: DarwinMenuItemConstructorOptions[] | Menu;
}

export default class MenuBuilder {

  private checkForUpdatesMenuItem: MenuItem;

  private updateAvailableMenuItem: MenuItem;

  private updateReadyForInstallMenuItem: MenuItem;

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
      this.checkForUpdatesMenuItem,
      this.updateAvailableMenuItem,
      this.updateReadyForInstallMenuItem,
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
