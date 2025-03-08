export type DayEntry = {
  startDate: string;
  fps: number;
  resolution: string;
  interval: number;
  duration: number;
  numShots: number;
  videoPath: string;
  timelinePath: string;
  productivity: number;
  thumbnailPath: string;
  tags: string[];
  appUsage?: AppUsageData[];
  description: string;
};

export interface Entry {
  day: DayEntry;
  id: number;
}

export interface AppUsageData {
  appName: string;
  title?: string; // Window title
  url?: string; // URL if it's a browser window
  owner: {
    name: string; // Process name
    path?: string; // Path to the executable
  };
  startTime: number;
  endTime: number;
  duration: number;
  category?: string;
}
