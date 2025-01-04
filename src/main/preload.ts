import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

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
  getScreenshotCount: () => Promise<number>;
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
  getScreenshotCount: () => ipcRenderer.invoke('screenshots-taken'),
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    send(channel: string, ...args: any[]) {
      if (channel === 'select-framerate') {
        ipcRenderer.send(channel, ...args);
      }
    },
    on(channel: string, func: (...args: any[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: any[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: string, func: (...args: any[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
});

export {};
