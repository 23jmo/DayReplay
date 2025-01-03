import path from 'node:path';
import { app } from 'electron';

export function getAssetPath(name: string) {
  if (process.env.NODE_ENV === 'development') {
    return path.join(__dirname, '../../assets/images', name);
  }
  // In production, assets are in the resources directory
  return path.join(process.resourcesPath, 'assets/images', name);
}

export const TrayIcons = {
  default: getAssetPath('tray.png'),
  active: getAssetPath('tray-active.png'),
};

export const MenuIcons = {
  play: getAssetPath('play.png'),
  pause: getAssetPath('pause.png'),
  export: getAssetPath('export.png'),
};
