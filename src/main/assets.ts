import path from 'node:path';

export const TrayIcons = {
  default: path.join(__dirname, '../../assets/icon.png'),
  active: path.join(__dirname, '../../assets/icon-active.png'),
};

export function getAssetPath(relativePath: string) {
  return path.join(__dirname, '../../assets', relativePath);
}
