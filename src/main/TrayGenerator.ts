import { Tray, Menu, BrowserWindow } from 'electron';
import path from 'path';

class TrayGenerator {
  private tray: Tray | null;

  private mainWindow: BrowserWindow | null;

  constructor(mainWindow: BrowserWindow) {
    this.tray = null;
    this.mainWindow = mainWindow;
  }

  getWindowPosition = () => {
    if (!this.mainWindow || !this.tray) return { x: 0, y: 0 };
    const windowsBounds = this.mainWindow.getBounds();
    const trayBounds = this.tray.getBounds();
    const x = Math.round(
      trayBounds.x + trayBounds.width / 2 - windowsBounds.width / 2,
    );
    const y = Math.round(trayBounds.y + trayBounds.height);
    return { x, y };
  };

  showWindow = () => {
    if (!this.mainWindow) return;
    const position = this.getWindowPosition();
    this.mainWindow.setPosition(position.x, position.y, false);
    this.mainWindow.show();
    this.mainWindow.setVisibleOnAllWorkspaces(true);
    this.mainWindow.focus();
    this.mainWindow.setVisibleOnAllWorkspaces(false);
  };

  toggleWindow = () => {
    if (!this.mainWindow) return;
    if (this.mainWindow.isVisible()) {
      this.mainWindow.hide();
    } else {
      this.showWindow();
    }
  };

  rightClickMenu = () => {
    if (!this.tray) return;
    const menu = [
      {
        role: 'quit' as const,
        accelerator: 'Command+Q',
      },
    ];
    this.tray.popUpContextMenu(Menu.buildFromTemplate(menu));
  };

  createTray() {
    console.log('Creating tray');
    this.tray = new Tray(path.join(__dirname, './assets/icon.png'));
    this.tray.setIgnoreDoubleClickEvents(true);
    this.tray.on('click', this.toggleWindow);
    this.tray.on('right-click', this.rightClickMenu);
  }
}

export default TrayGenerator;
