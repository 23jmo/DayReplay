import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Settings() {
  const [interval, setInterval] = useState(5);
  const [resolution, setResolution] = useState('1920x1080');
  const [framerate, setFramerate] = useState(30);

  useEffect(() => {
    const loadSettings = async () => {
      if (!window.electronAPI) {
        console.error('Electron API not available');
        return;
      }
      const settings = await window.electronAPI.getSettings();
      setInterval(settings.interval);
      setResolution(settings.resolution);
      setFramerate(settings.framerate);
    };
    loadSettings();
  }, []);

  const resolutionOptions = ['1920x1080', '1280x720', '3840x2160'];
  const frameRateOptions = [24, 30, 60];
  const intervalOptions = [1, 3, 5, 10, 15, 30];

  const handleSave = async () => {
    await window.electronAPI.saveSettings({
      interval,
      resolution,
      framerate,
    });
  };

  return (
    <>
      <div className="flex-1 flex-col p-10 max-w-4xl">
      <h2 className="text-2xl font-semibold text-foreground mb-8">Settings</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">
            Time between shots (seconds)
          </label>
          <Select
            value={interval.toString()}
            onValueChange={(value: string) => {
              setInterval(Number(value));
              handleSave();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select interval" />
            </SelectTrigger>
            <SelectContent>
              {intervalOptions.map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value}s
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">
            Resolution
          </label>
          <Select
            value={resolution}
            onValueChange={(value: string) => {
              setResolution(value);
              handleSave();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              {resolutionOptions.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">
            Output Framerate
          </label>
          <Select
            value={framerate.toString()}
            onValueChange={(value: string) => {
              setFramerate(Number(value));
              handleSave();
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select framerate" />
            </SelectTrigger>
            <SelectContent>
              {frameRateOptions.map((value) => (
                <SelectItem key={value} value={value.toString()}>
                  {value} FPS
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      </div>
    </>
  );
}
