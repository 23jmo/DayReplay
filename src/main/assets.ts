import path from 'node:path';

export const TrayIcons = {
  default: path.join(__dirname, '../../assets/tray/icon.png'),
  active: path.join(__dirname, '../../assets/tray/icon-active.png'),
};

export const MenuIcons = {
  play: path.join(__dirname, '../../assets/menu/play.png'),
  pause: path.join(__dirname, '../../assets/menu/pause.png'),
  export: path.join(__dirname, '../../assets/menu/export.png'),
};

export function getAssetPath(relativePath: string) {
  return path.join(__dirname, '../../assets', relativePath);
}
