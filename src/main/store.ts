import Store from 'electron-store';
import { DayEntry } from '../shared/types';

export interface Settings {
  interval: number;
  resolution: string;
  framerate: number;
  autoRecord: boolean;
  loginWindowTimeout: number;
  exportQueue: Array<{
    startDate: number;
    timestamp: number;
    backupDir: string;
    screenshotCount: number;
    interval: number;
    resolution: string;
  }>;
}

export interface OpenAIAPIKey {
  openaiApiKey: string;
}

export interface CustomPrompt {
  prompt: string;
}

const settingsSchema = {
  interval: {
    type: 'number',
    default: 5,
  },
  resolution: {
    type: 'string',
    default: '1920x1080',
  },
  framerate: {
    type: 'number',
    default: 30,
  },
  autoRecord: {
    type: 'boolean',
    default: true,
  },
  loginWindowTimeout: { // in seconds
    type: 'number',
    default: 5,
  },
  exportQueue: {
    type: 'array',
    default: [],
    items: {
      type: 'object',
      properties: {
        startDate: { type: 'number' },
        timestamp: { type: 'number' },
        backupDir: { type: 'string' },
        screenshotCount: { type: 'number' },
        interval: { type: 'number' },
        resolution: { type: 'string' }
      }
    }
  },
} as const;

const customPromptSchema = {
  customPrompt: {
    type: 'string',
    default: '',
  },
} as const;

const daysSchema = {
  days: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        startDate: { type: 'string' },
        fps: { type: 'number' },
        resolution: { type: 'string' },
        interval: { type: 'number' },
        duration: { type: 'number' },
        numShots: { type: 'number' },
        videoPath: { type: 'string' },
        timelinePath: { type: 'string' },
        productivity: { type: 'number' },
        thumbnailPath: { type: 'string' },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['startDate', 'fps', 'resolution', 'interval', 'duration', 'numShots', 'videoPath', 'timelinePath', 'productivity', 'thumbnailPath', 'tags']
    },
    default: [],
  },
} as const;

const openAIAPIKeySchema = {
  openaiApiKey: {
    type: 'string',
    default: '',
  },
} as const;

const settingsStore = new Store<Settings>({
  schema: settingsSchema,
  name: 'settings',
});

const daysStore = new Store<{days: DayEntry[]}>({
  schema: daysSchema,
  name: 'days',
});

const customPromptStore = new Store<CustomPrompt>({
  schema: customPromptSchema,
  name: 'customPrompt',
});

const openAIAPIKeyStore = new Store<OpenAIAPIKey>({
  schema: openAIAPIKeySchema,
  name: 'openaiApiKey',
});

export { settingsStore, daysStore, customPromptStore, openAIAPIKeyStore };

