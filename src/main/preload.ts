import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { DayEntry } from '../shared/types';

console.log('🚀 Preload script is running');

interface Settings {
  interval: number;
  resolution: string;
  framerate: number;
  loginWindowTimeout: number;
}

interface ElectronAPI {
  getSettings: () => Promise<Settings>;
  saveSettings: (settings: Settings) => Promise<boolean>;
  sendMessage: (message: string) => void;
  getScreenshotCount: () => Promise<number>;
  getDays: () => Promise<DayEntry[]>;
  getVideoUrl: (filePath: string) => Promise<string>;
  getCustomPrompt: () => Promise<string>;
  setCustomPrompt: (prompt: string) => Promise<boolean>;
  showInFinder: (filePath: string) => Promise<void>;
  shareFile: (filePath: string) => Promise<void>;
  getOpenAIAPIKey: () => Promise<string>;
  setOpenAIAPIKey: (key: string) => Promise<boolean>;
  getSecureConfig: (configName: string) => Promise<any>;
  openExternalAuth: (provider: string) => Promise<any>;
  exportRecordingDirect: (
    fps?: number,
  ) => Promise<{ success: boolean; error?: string }>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings: any) => {
    console.info('saveSettings', settings);
    ipcRenderer.invoke('settings:save', settings);
  },
  startRecording: () => ipcRenderer.invoke('recording:start'),
  pauseRecording: () => ipcRenderer.invoke('recording:pause'),
  exportRecording: () => ipcRenderer.invoke('recording:export'),
  exportRecordingDirect: (fps = 30) =>
    ipcRenderer.invoke('recording:export-direct', fps),
  sendMessage: (message: string) => ipcRenderer.send('message', message),
  getScreenshotCount: () => ipcRenderer.invoke('screenshots-taken'),
  getDays: () => ipcRenderer.invoke('days:get'),
  getVideoUrl: (filePath: string) =>
    ipcRenderer.invoke('get-video-url', filePath),
  getCustomPrompt: () => ipcRenderer.invoke('custom-prompt:get'),
  setCustomPrompt: (prompt: string) =>
    ipcRenderer.invoke('custom-prompt:set', prompt),
  showInFinder: (filePath: string) =>
    ipcRenderer.invoke('show-in-finder', filePath),
  shareFile: (filePath: string) => ipcRenderer.invoke('share-file', filePath),
  getOpenAIAPIKey: () => ipcRenderer.invoke('openai-api-key:get'),
  setOpenAIAPIKey: (key: string) =>
    ipcRenderer.invoke('openai-api-key:set', key),
  getSecureConfig: (configName: string) =>
    ipcRenderer.invoke('get-secure-config', configName),
  openExternalAuth: (provider: string) =>
    ipcRenderer.invoke('open-external-auth', provider),
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
