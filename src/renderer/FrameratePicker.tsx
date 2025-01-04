import { ipcRenderer } from 'electron';
import React, { useState, useEffect } from 'react';

const FrameratePicker: React.FC = () => {
  const [showCustom, setShowCustom] = useState(false);
  const [framerate, setFramerate] = useState(30);
  const [screenshotCount, setScreenshotCount] = useState(0);

  useEffect(() => {
    const fetchCount = async () => {
      const count = await window.electronAPI.getScreenshotCount();
      setScreenshotCount(count);
    };
    fetchCount();

    // Update count every second
    const interval = setInterval(fetchCount, 1000);
    return () => clearInterval(interval);
  }, []);

  const selectFramerate = (fps: number) => {
    window.electron.ipcRenderer.send('select-framerate', fps);
  };

  const handleCustomSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const fps = parseInt(e.currentTarget.value, 10);
      if (!isNaN(fps) && fps >= 1 && fps <= 120) {
        setFramerate(fps);
      }
    }
  };

  return (
    <div className="container">
      <h2>Choose Framerate</h2>
      <p className="description">Higher framerates will make the timelapse play faster</p>
      <div className="buttons">
        <button
          onClick={() => {
            setFramerate(30);
            setShowCustom(false);
          }}
          className={framerate === 30 && !showCustom ? 'selected' : ''}
        >30 FPS</button>
        <button
          onClick={() => {
            setFramerate(60);
            setShowCustom(false);
          }}
          className={framerate === 60 && !showCustom ? 'selected' : ''}
        >60 FPS</button>
        <button
          className={`custom ${showCustom ? 'selected' : ''}`}
          onClick={() => {
            setShowCustom(true);
            if (framerate === 30 || framerate === 60) {
              setFramerate(0); // Reset framerate when switching to custom
            }
          }}
        >Custom</button>
      </div>
      {showCustom && (
        <div className="customInput">
          <input
            type="number"
            min="1"
            max="120"
            placeholder="Enter framerate (1-120)"
            onKeyDown={handleCustomSubmit}
            autoFocus
          />
        </div>
      )}
      <div className="info-container">
        <div className="screenshots-info">
          <p className="value">{screenshotCount}</p>
          <p className="description">Screenshots taken</p>
        </div>
        <div className="timelapse-info">
          <p className="value">{(screenshotCount / framerate).toFixed(2)} <span className="unit">s</span></p>
          <p className="description">Length of final timelapse</p>
        </div>
      </div>
      <button className="export-button" onClick={() => selectFramerate(framerate)}>Export Timelapse</button>
      <style>{`
        .container {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          padding: 20px;
          background: #f5f5f5;
          color: #333;
          user-select: none;
          display: flex;
          flex-direction: column;
          gap: 15px;
          max-width: 300px;
          margin: 0 auto;
        }
        h2 {
          margin: 0;
          text-align: center;
        }
        .description {
          text-align: center;
          color: #666;
          font-size: 0.9em;
          margin: 0;
        }
        .buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          background: #007AFF;
          color: white;
          cursor: pointer;
          font-size: 14px;
        }
        button:hover {
          background: #0055b3;
        }
        button.custom {
          background: #34C759;
        }
        button.custom:hover {
          background: #248a3d;
        }
        input {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
          text-align: center;
          font-size: 14px;
          width: 100%;
          box-sizing: border-box;
        }
        .customInput {
          margin-top: 10px;
        }
        .info-container {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }
        .screenshots-info {
          text-align: center;
        }
        .timelapse-info {
          text-align: center;
        }
        .value {
          font-weight: bold;
          font-size: 1.5em;
        }
        .export-button {
          margin-top: 20px;
        }
        .unit {
          font-size: 0.8em;
          font-weight: normal;
        }
        button.selected {
          background: #004999;
          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
        }
        button.custom.selected {
          background: #248a3d;
        }
      `}</style>
    </div>
  );
};

export default FrameratePicker;
