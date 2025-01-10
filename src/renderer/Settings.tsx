import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { getCustomPrompt, setCustomPrompt } from '../shared/custom-prompt';
import { Button } from '@/components/ui/button';
import { toast, Toaster } from 'sonner';
import { ipcRenderer } from 'electron';

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



  const getPrompt = async () => {
    return await window.electronAPI.getCustomPrompt()
  }

  const setPrompt = async (prompt: string) => {
    await window.electronAPI.setCustomPrompt(prompt)
    return true
  }

  const [customPrompt, setCustomPrompt] = useState('')

  useEffect(() => {
    const loadPrompt = async () => {
      const prompt = await getPrompt()
      setCustomPrompt(prompt)
    }
    loadPrompt()
  }, [])

  return (
    <>
      <div className="flex-1 flex-col max-w-4xl">
      <h2 className="text-2xl font-semibold text-foreground mb-8">Settings</h2>

      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">
            Time between shots (seconds)
          </label>
          <Select
            value={interval.toString()}
            onValueChange={async (value: string) => {
              const newInterval = Number(value);
              setInterval(newInterval);
              await window.electronAPI.saveSettings({
                interval: newInterval,
                resolution,
                framerate,
              });
              toast.success('Screenshot interval updated');
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
            onValueChange={async (value: string) => {
              setResolution(value);
              await window.electronAPI.saveSettings({
                interval,
                resolution: value,
                framerate,
              });
              toast.success('Resolution updated');
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
            onValueChange={async (value: string) => {
              const newFramerate = Number(value);
              setFramerate(newFramerate);
              await window.electronAPI.saveSettings({
                interval,
                resolution,
                framerate: newFramerate,
              });
              toast.success('Framerate updated');
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

        <div className="space-y-2">
          <label className="text-sm font-medium leading-none text-foreground">
            What's your definition of productivity?
          </label>
          <Textarea
            placeholder="My definition of productivity is..."
            value={customPrompt}
            onChange={(e) => {
              setCustomPrompt(e.target.value)
            }}
          />
          <div className="flex justify-end">
            <Button variant="default" className="w-32 rounded-xl"
            onClick={async () => {
              await setPrompt(customPrompt);
              toast.success('Productivity definition updated');
            }}>Save</Button>
          </div>
        </div>
      </div>
      </div>
      <Toaster position="bottom-right" />
    </>
  );
}
