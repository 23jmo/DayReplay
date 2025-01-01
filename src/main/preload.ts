const { contextBridge, ipcRenderer } = require('electron');

console.log('preload.ts is running');

interface Settings {
  interval: number;
  resolution: string;
  framerate: number;
}

interface ElectronAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => {
    console.log('saveSettings', settings);
    ipcRenderer.invoke('settings:save', settings);
  },
});

export {};
