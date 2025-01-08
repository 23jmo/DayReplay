import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect } from 'react';
import './App.css';
import FrameratePicker from './FrameratePicker';
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

declare global {
  interface Window {
    electron: {
      store: {
        get: (key: string) => any;
        set: (key: string, val: any) => void;
      };
      ipcRenderer: {
        close: () => void;
        minimize: () => void;
        maximize: () => void;
        send: (channel: string, ...args: any[]) => void;
        on: (channel: string, callback: (data: any) => void) => void;
      };
    };
  }
}

function ProfileButton() {
  return <Button variant="ghost">Profile</Button>;
}

function TitleBar() {
  return (
    <div className="titlebar">
      <ProfileButton />
    </div>
  );
}

function Settings() {
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
    <div className="p-8 max-w-2xl mx-auto">
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
  );
}

export default function App() {
  return (
    <>
      <TitleBar />
      <Router>
        <div>
          <div className="content">
            <Routes>
              <Route path="/" element={<Settings />} />
              <Route path="/frameratePicker" element={<FrameratePicker />} />
            </Routes>
          </div>
        </div>
      </Router>
    </>
  );
}
