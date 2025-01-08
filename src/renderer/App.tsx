import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import './App.css';
import FrameratePicker from './FrameratePicker';

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
  return <button className="profile-button">Profile</button>;
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
  const frameRateOptions = ['24', '30', '60'];
  const intervalOptions = ['1', '3', '5', '10', '15', '30'];

  const handleSave = async () => {
    await window.electronAPI.saveSettings({
      interval,
      resolution,
      framerate,
    });
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h2 className="text-2xl font-semibold text-gray-800 mb-8">Settings</h2>

      <div className="space-y-6">
        <div className="mb-6">
          <label htmlFor="interval" className="block text-sm font-medium text-gray-700 mb-2">
            Time between shots (seconds):
            <select
              id="interval"
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              className="ml-4 w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {intervalOptions.map((intvl) => (
                <option key={intvl} value={intvl}>
                  {intvl}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-6">
          <label htmlFor="resolution" className="block text-sm font-medium text-gray-700 mb-2">
            Resolution:
            <select
              id="resolution"
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              className="ml-4 w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {resolutionOptions.map((res) => (
                <option key={res} value={res}>
                  {res}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mb-6">
          <label htmlFor="framerate" className="block text-sm font-medium text-gray-700 mb-2">
            Output Framerate:
            <select
              id="framerate"
              value={framerate}
              onChange={(e) => setFramerate(Number(e.target.value))}
              className="ml-4 w-48 p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            >
              {frameRateOptions.map((fps) => (
                <option key={fps} value={fps}>
                  {fps}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full bg-blue-500 text-white px-6 py-3 rounded-md hover:bg-blue-600 transition-colors duration-200 text-base font-medium"
        >
          Save Settings
        </button>
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
