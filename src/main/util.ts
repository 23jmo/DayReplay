/// <reference types="node" />
/* eslint import/prefer-default-export: off */
import { URL } from 'url';
import path from 'path';
import { Menubar } from 'menubar';
import fs from 'fs';
import log from 'electron-log';
import { dialog, app, Tray } from 'electron';
import ffmpeg from 'fluent-ffmpeg';

import {TrayIcons} from './assets'

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

let recordingInterval: ReturnType<typeof setInterval> | null = null;
let framerate: number;
let resolution: string;

const tempDir = path.join(app.getPath('temp'), 'DayReplay');

const screenshot = require('screenshot-desktop');

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

export function startRecording(interval: number, res: string, fps: number, tray: Tray) {
  if (recordingInterval) {
    log.info('Recording already in progress');
    return false;
  }

  framerate = fps;
  resolution = res;

  // set active icon
  tray.setImage(TrayIcons.active);

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  // make sure the directory is empty
  fs.readdirSync(tempDir).forEach((file) => {
    fs.unlinkSync(path.join(tempDir, file));
  });

  log.info(
    'Recording started with interval:',
    interval,
    'resolution:',
    resolution,
    'framerate:',
    framerate,
  );
  let index = 1;
  recordingInterval = setInterval(async () => {
    try {
      const fileName = path.join(tempDir, `${index++}.jpg`);
      const imgPath = await screenshot({ filename: fileName });
      log.debug('Screenshot saved to:', imgPath);
    } catch (error) {
      log.error('Error taking screenshot:', error);
      throw error;
    }
  }, interval * 1000);

  return true;
}

export function pauseRecording(tray: Tray) {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    log.info('Recording paused');
    recordingInterval = null;

    // set default icon
    tray.setImage(TrayIcons.default);
  }
}

export async function exportRecording(tray: Tray) {
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
    defaultPath: `DayReplay-${Date.now()}.mp4`,
    filters: [
      {
        name: 'MP4 Videos',
        extensions: ['mp4'],
      },
    ],
  });

  if (canceled || !filePath) {
    const result = await dialog.showMessageBox({
      type:'warning',
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
    log.info("hello bruh");
    log.info('Using temp directory:', tempDir);

    // Get the ffmpeg path that was set up earlier
    const ffmpegPath = app.isPackaged
      ? path.join(process.resourcesPath, 'app.asar.unpacked', 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
      : path.join(__dirname, '../../ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

    log.info('Using FFmpeg path for export:', ffmpegPath);

    // Create a new ffmpeg command with the correct path
    const command = ffmpeg()
      .setFfmpegPath(ffmpegPath)
      .input(path.join(tempDir, '%d.jpg'))
      .inputOptions(['-framerate', framerate.toString(), '-start_number', '1'])
      .videoCodec('libx264')
      .outputOptions(['-pix_fmt yuv420p', '-preset medium', '-y'])
      .on('start', (cmd: string) => {
        log.info('FFmpeg command:', cmd);
      })
      .output(filePath)
      .on('end', () => {
        log.info('Timelapse export completed:', filePath);
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

  // clearTempDir();
}

export function resumeRecording(interval: number, tray: Tray) {
  if (recordingInterval) {
    log.info('Recording already in progress');
    return false;
  }

  tray.setImage(TrayIcons.active);

  let index = fs.readdirSync(tempDir).length + 1;
  recordingInterval = setInterval(async () => {
    try {
      const fileName = path.join(tempDir, `${index++}.jpg`);
      const imgPath = await screenshot({ filename: fileName });
      log.debug('Screenshot saved to:', imgPath);
    } catch (error) {
      log.error('Error taking screenshot:', error);
      throw error;
    }
  }, interval * 1000);

  return true;
}

log.info('Log location:', log.transports.file.getFile().path);
