/// <reference types="node" />
/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import { Menubar } from 'menubar';
import fs from 'fs';
import log from 'electron-log';
import { dialog, app, Tray, desktopCapturer, screen, BrowserWindow } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import { systemPreferences } from 'electron';
import { writeFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { activeWindow } from 'get-windows';

const execAsync = promisify(exec);

import {TrayIcons} from './assets'
import { DayEntry, AppUsageData } from '../shared/types';
import { daysStore } from './store';

// Configure logging
log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('App starting...');
log.info('Is packaged:', app.isPackaged);
log.info('resourcesPath:', process.resourcesPath);
log.info('__dirname:', __dirname);

try {
  // In production, the ffmpeg binary will be in the app.asar.unpacked directory
  let ffmpegPath: string;
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  if (app.isPackaged) {
    ffmpegPath = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'ffmpeg',
      binaryName
    );
    // Fallback path if the first one doesn't exist
    if (!fs.existsSync(ffmpegPath)) {
      ffmpegPath = path.join(process.resourcesPath, 'ffmpeg', binaryName);
    }
  } else {
    ffmpegPath = path.join(__dirname, '../../ffmpeg', binaryName);
  }

  log.info('Looking for FFmpeg at:', ffmpegPath);
  log.info('FFmpeg exists:', fs.existsSync(ffmpegPath));

  if (!fs.existsSync(ffmpegPath)) {
    throw new Error(`FFmpeg not found at ${ffmpegPath}`);
  }

  // Make sure the binary is executable
  if (process.platform !== 'win32') {
    fs.chmodSync(ffmpegPath, '755');
    log.info('Made FFmpeg executable');
  }

  ffmpeg.setFfmpegPath(ffmpegPath);
  log.info('FFmpeg path set successfully');

  // Test ffmpeg synchronously first
  const testResult = require('child_process').spawnSync(ffmpegPath, ['-version']);
  if (testResult.error) {
    throw new Error(`FFmpeg test failed: ${testResult.error}`);
  }
  log.info('FFmpeg test successful:', testResult.stdout.toString());

} catch (error) {
  log.error('Failed to set ffmpeg path:', error);
  log.error('Error details:', JSON.stringify(error, null, 2));
  dialog.showErrorBox(
    'Failed to set ffmpeg path',
    'Timelapse will not work without ffmpeg. Please try reinstalling the app or contact support if the issue persists.'
  );
  throw error;
}

/* Defining Variables */

let screenshotCount = 0;
let recordingInterval: ReturnType<typeof setInterval> | null = null;
let appTrackingInterval: ReturnType<typeof setInterval> | null = null;
let framerate: number;
let resolution: string;
let intervalInSeconds: number;
let startDate = Date.now(); //timestamp of when the recording started

// App tracking variables
let currentApp: AppUsageData | null = null;
let appUsageData: AppUsageData[] = [];

// Function to get the current active window info
async function getActiveWindowInfo(): Promise<AppUsageData | null> {
  try {
    const activeWinInfo = await activeWindow({
      screenRecordingPermission: true,
      accessibilityPermission: true
    });

    if (!activeWinInfo) return null;

    return {
      appName: activeWinInfo.owner.name,
      title: activeWinInfo.title,
      url: 'url' in activeWinInfo ? activeWinInfo.url : undefined,
      owner: {
        name: activeWinInfo.owner.name,
        path: activeWinInfo.owner.path,
      },
      startTime: Date.now(),
      endTime: Date.now(), // Will be updated when app changes
      duration: 0, // Will be calculated when app changes
    };
  } catch (error) {
    log.error('Error getting active window:', error);
    return null;
  }
}

// Function to track app changes
async function trackAppChange() {
  try {
    const newAppInfo = await getActiveWindowInfo();
    const now = Date.now();

    if (!newAppInfo) return;

    if (currentApp && (currentApp.appName !== newAppInfo.appName || currentApp.title !== newAppInfo.title)) {
      // App or window has changed, log the previous app's duration
      const duration = now - currentApp.startTime;
      currentApp.endTime = now;
      currentApp.duration = duration;
      appUsageData.push(currentApp);
      log.debug(`App change: ${currentApp.appName} (${currentApp.title}) -> ${newAppInfo.appName} (${newAppInfo.title}), duration: ${duration}ms`);
    }

    if (!currentApp || currentApp.appName !== newAppInfo.appName || currentApp.title !== newAppInfo.title) {
      currentApp = newAppInfo;
    }
  } catch (error) {
    log.error('Error tracking app change:', error);
  }
}

// Reset app tracking data
function resetAppTracking() {
  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = null;
  }
  currentApp = null;
  appUsageData = [];
}

// Get current app tracking data
export function getAppTrackingData() {
  return appUsageData;
}

const tempDir = path.join(app.getPath('temp'), 'DayReplay');

log.transports.file.level = 'debug';

function clearTempDir() {
  fs.readdirSync(tempDir).forEach((file) => {
    fs.unlinkSync(path.join(tempDir, file));
  });
}


export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

// Add new screenshot function using desktopCapturer
async function takeScreenshot(outputPath: string): Promise<string> {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: {
      width: 1920,
      height: 1080
    }
  });

  if (sources.length === 0) {
    throw new Error('No screen sources found');
  }

  // Get the primary display
  const primarySource = sources[0];
  const image = primarySource.thumbnail;

  if (!image) {
    throw new Error('Failed to capture screenshot');
  }

  try {
    // Convert the NativeImage to a buffer and save it
    // Use a higher compression (lower quality) to save space
    const buffer = image.toJPEG(75);
    await writeFile(outputPath, buffer);

    // Verify the file was written successfully
    const stats = await fs.promises.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('Screenshot file is empty');
    }

    return outputPath;
  } catch (error: any) {
    log.error('Error saving screenshot:', error);
    // Clean up partial file if it exists
    try {
      if (fs.existsSync(outputPath)) {
        await fs.promises.unlink(outputPath);
      }
    } catch (cleanupError) {
      log.error('Error cleaning up failed screenshot:', cleanupError);
    }
    throw error;
  }
}

export function formatTimestampToArray(timestamp: string | number) {
  const ts = Number(timestamp);
  const date = new Date(ts);

  const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
  const day = String(date.getDate()).padStart(2, '0');

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format
  const time = `${hours}:${minutes} ${ampm}`;

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayOfWeek = daysOfWeek[date.getDay()];

  return [month, day, time, dayOfWeek];
}

async function checkScreenRecordingPermission(): Promise<boolean> {
  if (process.platform !== 'darwin') return true;

  try {
    // Try to take a test screenshot first
    const testFile = path.join(tempDir, 'test.jpg');
    await takeScreenshot(testFile);
    // Clean up test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    return true;
  } catch (error: any) {
    log.error('Error in permission check:', error);
    // Only check system preferences if the screenshot failed
    // @ts-ignore - screen is a valid media type in recent Electron versions
    const status = systemPreferences.getMediaAccessStatus('screen');
    log.info('Screen recording permission status:', status);
    return status === 'granted';
  }
}

// Add function to manage temp directory
async function ensureTempDir(): Promise<void> {
  try {
    await fs.promises.mkdir(tempDir, { recursive: true });

    // Clean directory but keep it
    const files = await fs.promises.readdir(tempDir);
    await Promise.all(
      files.map((file) => fs.promises.unlink(path.join(tempDir, file)))
    );
  } catch (error) {
    log.error('Error managing temp directory:', error);
    throw error;
  }
}

// Add getter functions for recording status
export function getRecordingStats() {
  return {
    screenshotCount,
    isRecording: recordingInterval !== null,
    interval: intervalInSeconds,
    elapsedTime: screenshotCount * intervalInSeconds,
  };
}

export function resetRecordingStats() {
  screenshotCount = 0;
}

// Extend the existing startRecording function
export function startRecording(interval: number, res: string, tray: Tray): boolean {
  if (recordingInterval) {
    log.info('Recording already in progress');
    return false;
  }

  startDate = Date.now();
  resolution = res;
  intervalInSeconds = interval;
  resetRecordingStats();
  resetAppTracking(); // Reset app tracking when starting new recording

  // set active icon
  tray.setImage(TrayIcons.active);

  // Initialize temp directory
  ensureTempDir().catch((error) => {
    log.error('Failed to initialize temp directory:', error);
    dialog.showErrorBox(
      'Error',
      'Failed to create temporary directory for screenshots. Please try again.'
    );
    return false;
  });

  log.info(
    'Recording started with interval:',
    interval,
    'resolution:',
    resolution,
  );

  let consecutiveErrors = 0;
  const MAX_CONSECUTIVE_ERRORS = 3;

  // Start app tracking interval (check every second)
  appTrackingInterval = setInterval(trackAppChange, 1000);

  recordingInterval = setInterval(async () => {
    try {
      const hasPermission = await checkScreenRecordingPermission();
      if (!hasPermission) {
        log.error('Screen recording permission denied');
        dialog.showErrorBox(
          'Permission Required',
          'Screen recording permission was denied. Please enable screen recording for Day Replay in System Preferences > Security & Privacy > Privacy > Screen Recording, then try again.'
        );
        pauseRecording(tray);
        return;
      }

      const fileName = path.join(tempDir, `${screenshotCount + 1}.jpg`);
      const imgPath = await takeScreenshot(fileName);
      screenshotCount++; // Increment counter after successful screenshot
      log.debug('Screenshot saved to:', imgPath, 'Total screenshots:', screenshotCount);
      consecutiveErrors = 0; // Reset error counter on success
    } catch (error: any) {
      log.error('Error taking screenshot:', error);
      consecutiveErrors++;

      if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
        log.error('Too many consecutive errors, stopping recording');
        dialog.showErrorBox(
          'Recording Error',
          'Failed to take screenshots multiple times. Recording has been stopped.'
        );
        pauseRecording(tray);
        return;
      }

      // Check if error is permission related
      if (error.message?.includes('permission') || error.message?.includes('denied')) {
        dialog.showErrorBox(
          'Permission Required',
          'Screen recording permission was denied. Please enable screen recording for Day Replay in System Preferences > Security & Privacy > Privacy > Screen Recording, then try again.'
        );
        pauseRecording(tray);
      } else {
        // Log error but continue trying
        log.error('Screenshot error:', error);
      }
    }
  }, interval * 1000);

  return true;
}

export function pauseRecording(tray: Tray) {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    log.info('Recording paused. Total screenshots taken:', screenshotCount);
    recordingInterval = null;

    // Final app tracking update before pausing
    if (currentApp) {
      const now = Date.now();
      currentApp.endTime = now;
      currentApp.duration = now - currentApp.startTime;
      appUsageData.push(currentApp);
      currentApp = null;
    }

    // Clear app tracking interval
    if (appTrackingInterval) {
      clearInterval(appTrackingInterval);
      appTrackingInterval = null;
    }

    // set default icon
    tray.setImage(TrayIcons.default);
  }
}

export async function exportRecording(tray: Tray, fps: number) {
  pauseRecording(tray);
  const files = fs.readdirSync(tempDir);

  log.info('Exporting recording with files:', files);

  if (files.length === 0) {
    await dialog.showErrorBox('No files found to export', 'You must record a replay before you can export it.');
    log.warn('No files found to export');
    return;
  }

  const { filePath, canceled } = await dialog.showSaveDialog({
    title: 'Export Replay',
    buttonLabel: 'Save Replay',
    defaultPath: `DayReplay-${startDate}.mp4`,
    filters: [
      {
        name: 'MP4 Videos',
        extensions: ['mp4'],
      },
    ],
  });

  if (canceled || !filePath) {
    const result = await dialog.showMessageBox({
      type: 'warning',
      message: 'Are you sure you want to cancel?',
      detail: 'You will lose all progress and all screenshots will be deleted.',
      buttons: [
        'Seriously Cancel',
        'Nevermind',
      ],
      defaultId: 0,
    });

    if (result.response !== 0) {
      return;
    }

    log.info('Export cancelled');
    clearTempDir();
    return;
  }

  try {
    log.info('Using temp directory:', tempDir);

    // Get the ffmpeg path that was set up earlier
    const ffmpegPath = app.isPackaged
      ? path.join(process.resourcesPath, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
      : path.join(__dirname, '../../ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

    log.info('Using FFmpeg path for export:', ffmpegPath);

    if (!fs.existsSync(ffmpegPath)) {
      throw new Error(`FFmpeg not found at ${ffmpegPath}`);
    }

    // Create a new ffmpeg command with the correct path
    const command = ffmpeg()
      .setFfmpegPath(ffmpegPath)
      .input(path.join(tempDir, '%d.jpg'))
      .inputOptions(['-framerate', fps.toString(), '-start_number', '1'])
      .videoCodec('libx264')
      .outputOptions(['-pix_fmt yuv420p', '-preset medium', '-y'])
      .on('start', (cmd: string) => {
        log.info('FFmpeg command:', cmd);
      })
      .output(filePath)
      .on('end', () => {
        log.info('Timelapse export completed:', filePath);

        const localDayDir = path.join(app.getPath('appData'), "DayReplays");
        // Create the directory if it doesn't exist
        if (!fs.existsSync(localDayDir)) {
          fs.mkdirSync(localDayDir, { recursive: true });
        }

        const localFilePath = path.join(localDayDir, `DayReplay-${startDate}.mp4`);
        //save a local copy to the days folder
        fs.copyFileSync(filePath, localFilePath);
        log.info('Local copy saved to:', localFilePath);

        //edit the json
        const dayEntry = {
          startDate: startDate.toString(),
          fps: fps,
          resolution: resolution,
          interval: intervalInSeconds,
          duration: screenshotCount * intervalInSeconds,
          numShots: screenshotCount,
          videoPath: localFilePath,
          timelinePath: '',
          productivity: 0,
          thumbnailPath: '',
          tags: [],
          appUsage: appUsageData, // Add app usage data to the entry
        };

        // Get current days and append new entry
        // @ts-ignore - electron-store types are not properly exposed
        const currentDays = daysStore.get('days') ?? [];
        // @ts-ignore - electron-store types are not properly exposed
        daysStore.set('days', [...currentDays, dayEntry]);
        // @ts-ignore - electron-store types are not properly exposed
        log.info('Days updated in store to be:', daysStore.get('days'));

        dialog.showMessageBox({
          type: 'info',
          message: 'Timelapse export completed',
          detail: 'Your replay has been saved to ' + filePath,
        });
      })
      .on('error', (err: Error) => {
        log.error('Error exporting timelapse:', err);
        throw err;
      });

    // Run the command and wait for it to complete
    await new Promise((resolve, reject) => {
      command.run();
      command.on('end', resolve);
      command.on('error', reject);
    });

  } catch (error) {
    log.error('Failed to start ffmpeg process:', error);
    throw error;
  }

  clearTempDir();
}

export function resumeRecording(interval: number, tray: Tray) {
  if (recordingInterval) {
    log.info('Recording already in progress');
    return false;
  }

  tray.setImage(TrayIcons.active);

  recordingInterval = setInterval(async () => {
    try {
      const fileName = path.join(tempDir, `${screenshotCount + 1}.jpg`);
      const imgPath = await takeScreenshot(fileName);
      screenshotCount++; // Increment counter after successful screenshot
      log.debug('Screenshot saved to:', imgPath, 'Total screenshots:', screenshotCount);
    } catch (error) {
      log.error('Error taking screenshot:', error);
      throw error;
    }
  }, interval * 1000);

  return true;
}

log.info('Log location:', log.transports.file.getFile().path);
