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

  // Create output directory if it doesn't exist

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
    })

    if (result.response !== 0) {
      return;
    }

    log.info('Export cancelled');
    clearTempDir();
    return;
  }

  try {
    log.info('Using temp directory:', tempDir);

    ffmpeg()
      .input(path.join(tempDir, '%01d.jpg'))
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
      })
      .run();
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
