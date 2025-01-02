const { contextBridge, ipcRenderer } = require('electron');

console.log('🚀 Preload script is running');

interface Settings {
  interval: number;
  resolution: string;
  framerate: number;
}

interface ElectronAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<boolean>;
  sendMessage: (message: string) => void;
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
  startRecording: () => ipcRenderer.invoke('recording:start'),
  pauseRecording: () => ipcRenderer.invoke('recording:pause'),
  exportRecording: () => ipcRenderer.invoke('recording:export'),
  sendMessage: (message: string) => ipcRenderer.send('message', message),
});

export {};
