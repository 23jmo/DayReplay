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

  // Load settings when component mounts
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
    <div className="settings-container">
      <h2>Settings</h2>

      <div className="setting-group">
        <label htmlFor="interval">
          Time between shots (seconds):
          <select
            id="interval"
            value={interval}
            onChange={(e) => {
              setInterval(Number(e.target.value));
              handleSave();
            }}
          >
            {intervalOptions.map((intvl) => (
              <option key={intvl} value={intvl}>
                {intvl}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="setting-group">
        <label htmlFor="resolution">
          Resolution:
          <select
            id="resolution"
            value={resolution}
            onChange={(e) => {
              setResolution(e.target.value);
              handleSave();
            }}
          >
            {resolutionOptions.map((res) => (
              <option key={res} value={res}>
                {res}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="setting-group">
        <label htmlFor="framerate">
          Output Framerate:
          <select
            id="framerate"
            value={framerate}
            onChange={(e) => {
              setFramerate(Number(e.target.value));
              handleSave();
            }}
          >
            {frameRateOptions.map((fps) => (
              <option key={fps} value={fps}>
                {fps}
              </option>
            ))}
          </select>
        </label>
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
