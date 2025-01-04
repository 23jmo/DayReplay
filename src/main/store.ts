import Store from 'electron-store';

export interface Settings {
  interval: number;
  resolution: string;
}

const schema = {
  interval: {
    type: 'number',
    default: 5,
  },
  resolution: {
    type: 'string',
    default: '1920x1080',
  },
} as const;

const store = new Store<Settings>({
  schema,
});

export default store as Store<Settings>;
