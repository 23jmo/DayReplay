/**
 * @fileoverview Handles the recording logic
 * @module src/main/util
 * @author Johnathan Mo
 * @version 1.0.0
 */

// imports
import log from 'electron-log';
import { app, dialog, Tray, desktopCapturer } from 'electron';
import path from 'node:path';
import { activeWindow } from 'get-windows';
import { AppUsageData } from '../shared/types';
import fs from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import { settingsStore, daysStore } from './store';
import { TrayIcons } from './assets';
import { analyzeProductivity } from './productivityScoreAnalyzer';

// Variables
let screenshotCount = 0;
const tempDir = path.join(app.getPath('temp'), 'DayReplay');

// App Tracking Variables
let isAutoRecordingEnabled = false;
let recordingInterval: NodeJS.Timeout | null = null;
let appTrackingInterval: NodeJS.Timeout | null = null;
let appTray: Tray | null = null;
let currentApp: AppUsageData | null = null;
let appUsageData: AppUsageData[] = [];

let framerate: number;
let resolution: string;
let intervalInSeconds: number;
let startDate = Date.now();
let isRecording = false;
let isPaused = false;

let loginWindowStartTime: number | null = null;
let loginWindowTimer: NodeJS.Timeout | null = null;
let onRecordingStateChange: (() => void) | null = null;

// Add lock for queue processing
let isProcessingQueue = false;

// Add at the top with other variables
let cachedFfmpegPath: string | null = null;
let windowTrackingErrorCount = 0;
const MAX_WINDOW_TRACKING_ERRORS = 3;
let isWindowTrackingBackoff = false;
let windowTrackingBackoffTimeout: NodeJS.Timeout | null = null;
let hasShownPermissionDialog = false;

// Export the menu update callback setter
export function setMenuUpdateCallback(callback: () => void) {
  onRecordingStateChange = callback;
}

// Export the menu update function
export function updateMenu() {
  if (onRecordingStateChange) {
    onRecordingStateChange();
  }
}

// Export the tray setter
export function setTray(tray: Tray | null) {
  appTray = tray;
}

// Helper function to clear temp directory
export async function clearTempDir() {
  try {
    const files = await fs.promises.readdir(tempDir);
    await Promise.all(
      files.map(async (file) => {
        const filePath = path.join(tempDir, file);
        try {
          if (fs.existsSync(filePath)) {
            await fs.promises.unlink(filePath);
          } else {
            log.warn(`File not found during cleanup: ${filePath}`);
          }
        } catch (unlinkError) {
          log.error(`Error deleting file ${filePath}:`, unlinkError);
        }
      })
    );
  } catch (error) {
    log.error('Error clearing temp directory:', error);
  }
}

// Configure Logging

log.transports.file.level = 'debug';
log.transports.console.level = 'debug';
log.info('App starting...');
log.info('Is packaged:', app.isPackaged);
log.info('resourcesPath:', process.resourcesPath);
log.info('__dirname:', __dirname);

//--------------Window Tracking Logic--------------------------------

// Function to get the current active window info
async function getActiveWindowInfo(): Promise<AppUsageData | null> {
  if (isWindowTrackingBackoff) {
    return null;
  }

  try {
    const activeWinInfo = await activeWindow({
      screenRecordingPermission: true,
      accessibilityPermission: true
    });

    // Reset error count on success
    windowTrackingErrorCount = 0;
    hasShownPermissionDialog = false;
    return activeWinInfo ? {
      appName: activeWinInfo.owner.name,
      title: activeWinInfo.title,
      url: 'url' in activeWinInfo ? activeWinInfo.url : undefined,
      owner: {
        name: activeWinInfo.owner.name,
        path: activeWinInfo.owner.path,
      },
      startTime: Date.now(),
      endTime: Date.now(),
      duration: 0,
    } : null;
  } catch (error: any) {
    windowTrackingErrorCount++;
    log.error(`Error getting active window (attempt ${windowTrackingErrorCount}):`, error);

    // Check if this might be a permissions issue
    if (error.message?.includes('Command failed') && !hasShownPermissionDialog) {
      hasShownPermissionDialog = true; // Only show once
      dialog.showMessageBox({
        type: 'warning',
        title: 'Permission Error',
        message: 'Unable to track active windows',
        detail: 'This might be caused by missing permissions. Please check:\n\n' +
                '1. System Settings > Privacy & Security > Accessibility\n' +
                '2. System Settings > Privacy & Security > Screen Recording\n\n' +
                'Make sure DayReplay is allowed in both locations. You may need to remove and re-add the permissions.',
        buttons: ['Open System Settings', 'Cancel'],
        defaultId: 0
      }).then(({ response }) => {
        if (response === 0) {
          // Open System Preferences to Privacy & Security
          require('child_process').exec('open x-apple.systempreferences:com.apple.preference.security?Privacy');
        }
      });

      // Enter backoff immediately for permission issues
      isWindowTrackingBackoff = true;
      if (appTrackingInterval) {
        clearInterval(appTrackingInterval);
        appTrackingInterval = null;
      }

      // Set a longer timeout for permission issues
      if (windowTrackingBackoffTimeout) {
        clearTimeout(windowTrackingBackoffTimeout);
      }
      windowTrackingBackoffTimeout = setTimeout(() => {
        log.info('Attempting to resume window tracking after permission error');
        isWindowTrackingBackoff = false;
        windowTrackingErrorCount = 0;
        if (isAutoRecordingEnabled && !appTrackingInterval) {
          appTrackingInterval = setInterval(trackAppChange, 1000);
        }
      }, 300000); // 5 minute backoff for permission issues

      return null;
    }

    // If we've hit the error threshold, implement backoff
    if (windowTrackingErrorCount >= MAX_WINDOW_TRACKING_ERRORS) {
      log.warn('Too many window tracking errors, implementing backoff');
      isWindowTrackingBackoff = true;

      // Clear existing app tracking interval
      if (appTrackingInterval) {
        clearInterval(appTrackingInterval);
        appTrackingInterval = null;
      }

      // Set a timeout to retry after 1 minute
      if (windowTrackingBackoffTimeout) {
        clearTimeout(windowTrackingBackoffTimeout);
      }
      windowTrackingBackoffTimeout = setTimeout(() => {
        log.info('Attempting to resume window tracking after backoff');
        isWindowTrackingBackoff = false;
        windowTrackingErrorCount = 0;
        if (isAutoRecordingEnabled && !appTrackingInterval) {
          appTrackingInterval = setInterval(trackAppChange, 1000);
        }
      }, 60000); // 1 minute backoff
    }
    return null;
  }
}

// Add null checks for tray operations
function safelyPauseRecording() {
  if (!appTray) {
    log.error('Tray is not initialized');
    return;
  }
  pauseRecording(appTray);
}

function safelyResumeRecording() {
  if (!appTray) {
    log.error('Tray is not initialized');
    return;
  }
  resumeRecording(intervalInSeconds, appTray);
}

function safelyStopRecording() {
  if (!appTray) {
    log.error('Tray is not initialized');
    return;
  }
  isRecording = false;
  isPaused = false;
  recordingInterval = null;
  if (appTray) {
    appTray.setImage(TrayIcons.default);
    updateMenu();
  }
  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = null;
  }
  currentApp = null;
}

// Helper function to reset login window state
function resetLoginWindowState() {
  loginWindowStartTime = null;
  if (loginWindowTimer) {
    clearTimeout(loginWindowTimer);
    loginWindowTimer = null;
  }
}

/**
 * Tracks the app change
 */
async function trackAppChange() {
  try {
    const newAppInfo = await getActiveWindowInfo();
    const now = Date.now();

    if (!newAppInfo) return;

    // auto start recording if enabled and user is active
    if (newAppInfo.appName !== 'loginwindow') {
      // check if exiting a login session (i.e user is now active again)
      //TODO: fix the logic on when to reset the login window state and resume recording and when it should just start a new auto recording
      if (loginWindowStartTime) {
        // User became active before timeout, cancel the timeout and continue recording
        safelyResumeRecording();
        resetLoginWindowState();
        updateMenu();
        log.info('Login window timeout cancelled - user became active');
      } else {
        // If we're active but not coming from login window, try to process any queued exports
        await processExportQueue().catch(error => {
          log.error('Failed to process export queue:', error);
        });
      }

      checkAndAutoStartRecording(appTray);
    }

    if (newAppInfo.appName === 'loginwindow') {
      if (!loginWindowStartTime) {
        log.debug('Setting loginWindowStartTime:', now);
        loginWindowStartTime = now;
        let wasRecordingBeforeLoginWindow = recordingInterval !== null;
        log.debug(`Login Window Entered - User Is No Longer Active`);

        if (wasRecordingBeforeLoginWindow) {
          // Pause recording when entering login window
          if (appTray) {
            safelyPauseRecording();
            updateMenu();
          }

          loginWindowTimer = setTimeout(async () => {
            // Check if we're still in login window state
            const currentAppInfo = await getActiveWindowInfo();
            if (loginWindowStartTime && currentAppInfo?.appName === 'loginwindow') {
              try {
                // First, properly stop all tracking and recording
                if (currentApp) {
                  // Add final app usage entry as long as its not the login window
                  if (currentApp.appName !== 'loginwindow') {
                    const now = Date.now();
                    currentApp.endTime = now;
                    currentApp.duration = now - currentApp.startTime;
                    appUsageData.push(currentApp);
                  }
                  currentApp = null;
                }

                // Stop recording and tracking
                safelyStopRecording();

                // Now add to queue with the frozen app usage data
                await addToExportQueue();
                log.info('Added to export queue due to login window timeout');

                // Only reset state after queue addition is complete
                screenshotCount = 0;
                startDate = Date.now();
                appUsageData = []; // Clear app usage data for next recording

                // Restart app tracking if auto-recording is enabled
                if (isAutoRecordingEnabled && !appTrackingInterval) {
                  appTrackingInterval = setInterval(trackAppChange, 1000);
                  log.info('Restarted app tracking interval after login window timeout');
                }
              } catch (error) {
                log.error('Failed to handle login window timeout:', error);
              } finally {
                wasRecordingBeforeLoginWindow = false;
                resetLoginWindowState();
                updateMenu();
              }
            } else {
              // User became active before timeout completed
              log.info('Login window timeout cancelled - user became active before timeout');
              safelyResumeRecording();
              resetLoginWindowState();
              updateMenu();
            }
          }, (2 * 1000));
        }
      }
    }

    if (currentApp && (currentApp.appName !== newAppInfo.appName || currentApp.title !== newAppInfo.title)) {
      if (currentApp.appName !== 'loginwindow') {
        const duration = now - currentApp.startTime;
        currentApp.endTime = now;
        currentApp.duration = duration;
        appUsageData.push(currentApp);
        log.debug(`App change: ${currentApp.appName} (${currentApp.title}) -> ${newAppInfo.appName} (${newAppInfo.title}), duration: ${duration}ms`);
      }
    }

    if (!currentApp || currentApp.appName !== newAppInfo.appName || currentApp.title !== newAppInfo.title) {
      currentApp = newAppInfo;
    }

  } catch (error) {
    log.error('Error in app change tracking:', error);
  }
}

function resetAppTracking() {
  if (appTrackingInterval) {
    clearInterval(appTrackingInterval);
    appTrackingInterval = null;
  }
  if (windowTrackingBackoffTimeout) {
    clearTimeout(windowTrackingBackoffTimeout);
    windowTrackingBackoffTimeout = null;
  }
  isWindowTrackingBackoff = false;
  windowTrackingErrorCount = 0;
  hasShownPermissionDialog = false;
  currentApp = null;
  appUsageData = [];
  loginWindowStartTime = null;
  if (loginWindowTimer) {
    clearTimeout(loginWindowTimer);
    loginWindowTimer = null;
  }
}

//--------------Auto Recording Logic--------------------------------

// Methods related to checking auto recording

/**
 * Checks if we should auto-start recording.
 * If auto recording is enabled and the user is active (i.e not in the login window), we will start recording.
 * If already recording or autorecording is disabled, we will not start recording.
 *
 * @param tray
 * @returns
 *
 */
async function checkAndAutoStartRecording(tray: Tray | null) {
  if (!tray) {
    log.error('Tray is not active in checkAndAutoStartRecording');
    return;
  }

  try {
    const newAppInfo = await getActiveWindowInfo();

    if (newAppInfo && newAppInfo.appName !== 'loginwindow') {
      const settings = {
        //@ts-ignore
        interval: settingsStore.get('interval') || 30,
        //@ts-ignore
        resolution: settingsStore.get('resolution') || '1920x1080'
      };

      intervalInSeconds = settings.interval;
      resolution = settings.resolution;

      // Get reference to menu builder to update stats
      const menuBuilder = (tray as any).menuBuilder;
      if (startRecording(settings.interval, settings.resolution, tray)) {
        if (menuBuilder && typeof menuBuilder.startStatsUpdate === 'function') {
          menuBuilder.startStatsUpdate(settings.interval);
          log.info('Started stats update for auto-recording');
        } else {
          log.warn('Menu builder not available for stats update');
        }
      }
    }
  } catch (error) {
    log.error('Error in auto-start check:', error);
  }
}

/**
 * Sets the auto-recording state - called when the user toggles the auto-recording option
 * from the menu bar
 *
 * @param enabled
 */
export function setAutoRecording(enabled: boolean) {
  isAutoRecordingEnabled = enabled;
  //@ts-ignore
  settingsStore.set('autoRecord', enabled);

  if (enabled && !appTrackingInterval && !isWindowTrackingBackoff) {
    // Start tracking app changes to detect activity
    appTrackingInterval = setInterval(trackAppChange, 1000);
    log.info('Started app tracking for auto-recording');
    if (appTray) {
      checkAndAutoStartRecording(appTray);
    }
  } else if (!enabled) {
    // Stop tracking app changes and clear all related state
    resetAppTracking();
    log.info('Stopped app tracking');
  }
}

/**
 * Gets the auto-recording state
 * @returns
 */
export function getAutoRecording(): boolean {
  //@ts-ignore
  const enabled = settingsStore.get('autoRecord') ?? false;
  isAutoRecordingEnabled = enabled;
  return enabled;
}

//--------------Recording Logic--------------------------------

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

  const primarySource = sources[0];
  const image = primarySource.thumbnail;

  if (!image) {
    throw new Error('Failed to capture screenshot');
  }

  try {
    const buffer = image.toJPEG(75);
    await fs.promises.writeFile(outputPath, buffer);

    const stats = await fs.promises.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('Screenshot file is empty');
    }

    return outputPath;
  } catch (error: any) {
    log.error('Error saving screenshot:', error);
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

// Export recording state getters
export function getRecordingState() {
  return {
    isRecording,
    isPaused,
  };
}

// Extend the existing startRecording function
export function startRecording(interval: number, res: string, tray: Tray): boolean {
  if (recordingInterval) {
    //log.info('Recording already in progress');
    return false;
  }

  startDate = Date.now();
  resolution = res;
  intervalInSeconds = interval;
  resetRecordingStats();
  resetAppTracking(); // Reset app tracking when starting new recording

  setTray(tray);
  isRecording = true;
  isPaused = false;
  updateMenu();

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
        return false;
      }
    }
  }, interval * 1000);

  // Update the menu to reflect recording state
  updateMenu();

  return true;
}

export function pauseRecording(tray: Tray) {
  if (recordingInterval) {
    clearInterval(recordingInterval);
    log.info('Recording paused. Total screenshots taken:', screenshotCount);
    recordingInterval = null;
    isPaused = true;

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
    updateMenu();
  }
}

export function resumeRecording(interval: number, tray: Tray) {

  if (recordingInterval) {
    log.info('Recording already in progress');
    return false;
  }
  else{
    log.info('Resuming recording');
  }

  isPaused = false;
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

  // reinitalize the app tracking interval
  if (!appTrackingInterval) {
    appTrackingInterval = setInterval(trackAppChange, 1000);
  }

  updateMenu();
  return true;
}

log.info('Log location:', log.transports.file.getFile().path);



//--------------Export Functionality--------------------------------



// Export recording functions
export async function exportRecordingToPath(filePath: string, fps: number, backupDir: string) {

  const exportBackupDir = backupDir;

  try {
    log.info('Starting export process...');

    // Get FFmpeg path first
    const ffmpegPath = await resolveFfmpegPath();
    log.info('Using FFmpeg path:', ffmpegPath);

    // Create a backup directory for this export
    await fs.promises.mkdir(exportBackupDir, { recursive: true });
    log.info('Created export backup directory:', exportBackupDir);

    // Check if we have any screenshots to export
    const files = fs.readdirSync(tempDir).filter(file => file.endsWith('.jpg'));
    if (files.length === 0) {
      const error = new Error('No screenshots found to export');
      log.warn(error.message);
      throw error;
    }

    // Sort files numerically and copy to backup directory
    files.sort((a, b) => {
      const numA = parseInt(a.split('.')[0]);
      const numB = parseInt(b.split('.')[0]);
      return numA - numB;
    });

    log.info(`Found ${files.length} screenshots to export`);

    // Copy all screenshots to backup directory
    for (const file of files) {
      const sourcePath = path.join(tempDir, file);
      const destPath = path.join(exportBackupDir, file);
      try {
        const stats = await fs.promises.stat(sourcePath);
        if (stats.size === 0) {
          log.warn(`Warning: Empty screenshot file found: ${file}`);
          continue;
        }
        await fs.promises.copyFile(sourcePath, destPath);
      } catch (error) {
        log.error(`Error copying file ${file}:`, error);
        throw new Error(`Failed to copy screenshot file: ${file}`);
      }
    }

    // Verify files were copied successfully
    const backupFiles = await fs.promises.readdir(exportBackupDir);
    log.info(`Successfully copied ${backupFiles.length} files to backup directory`);

    // if applicable, read in the app usage data from the backup directory
    const appUsageFile = path.join(exportBackupDir, 'appUsage.json');
    let currentAppUsageData: AppUsageData[] = [];
    if (fs.existsSync(appUsageFile)) {
      const appUsageContent = await fs.promises.readFile(appUsageFile, 'utf-8');
      currentAppUsageData = JSON.parse(appUsageContent);
    }
    else{
      log.error('No app usage file found in backup directory');
      currentAppUsageData = appUsageData;
    }

    const dayEntry = {
      startDate: startDate.toString(),
      fps: fps,
      resolution: resolution,
      interval: intervalInSeconds,
      duration: screenshotCount * intervalInSeconds,
      numShots: screenshotCount,
      videoPath: '',  // Will be set after saving
      timelinePath: '',
      productivity: 0,
      thumbnailPath: '',
      tags: [],
      appUsage: currentAppUsageData,
    };

    try {
      // Analyze productivity before creating video
      const productivityScore = await analyzeProductivity(dayEntry);
      dayEntry.productivity = productivityScore;
      log.info('Productivity score calculated:', productivityScore);
    } catch (error) {
      log.error('Error calculating productivity score:', error);
      // Continue with export even if productivity analysis fails
    }

    ffmpeg.setFfmpegPath(ffmpegPath);
    log.info('FFmpeg path set successfully');

    // Test ffmpeg synchronously first
    const testResult = require('child_process').spawnSync(ffmpegPath, ['-version']);
    if (testResult.error) {
      throw new Error(`FFmpeg test failed: ${testResult.error}`);
    }
    log.info('FFmpeg test successful:', testResult.stdout.toString());

    // Create a temporary file list for ffmpeg using backup directory
    const fileListPath = path.join(exportBackupDir, 'files.txt');
    const fileList = backupFiles.filter(f => f.endsWith('.jpg'))
      .sort((a, b) => parseInt(a) - parseInt(b))
      .map(file => `file '${path.join(exportBackupDir, file).replace(/'/g, "'\\''")}'`)
      .join('\n');
    await fs.promises.writeFile(fileListPath, fileList);

    log.info('Created file list at:', fileListPath);
    log.info('File list contents:', fileList);

    // Verify the output directory exists
    const outputDir = path.dirname(filePath);
    if (!fs.existsSync(outputDir)) {
      await fs.promises.mkdir(outputDir, { recursive: true });
    }

    // Verify write permissions to output directory
    try {
      await fs.promises.access(outputDir, fs.constants.W_OK);
    } catch (error) {
      throw new Error(`No write permission to output directory: ${outputDir}`);
    }

    const command = ffmpeg()
      .setFfmpegPath(ffmpegPath)
      .input(fileListPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt', 'yuv420p',
        '-preset', 'medium',
        '-y',
        '-framerate', fps.toString(),
        '-vf', 'scale=1664:1080'
      ])
      .on('start', (cmd: string) => {
        log.info('FFmpeg command:', cmd);
      })
      .on('progress', (progress: any) => {
        log.info('Processing: ', progress);
      })
      .on('stderr', (stderrLine: string) => {
        log.info('FFmpeg stderr:', stderrLine);
      })
      .output(filePath);

    await new Promise((resolve, reject) => {
      command
        .on('end', () => {
          log.info('FFmpeg processing finished successfully');
          resolve(null);
        })
        .on('error', (err) => {
          log.error('FFmpeg error:', err);
          reject(new Error(`FFmpeg error: ${err.message}`));
        })
        .run();
    });

    log.info('Timelapse export completed:', filePath);

    // Update video path after saving
    dayEntry.videoPath = filePath;

    // @ts-ignore - electron-store types are not properly exposed
    const currentDays = daysStore.get('days') ?? [];
    // @ts-ignore - electron-store types are not properly exposed
    daysStore.set('days', [...currentDays, dayEntry]);
    log.info('Days updated in store');

    // Only show dialog for manual exports
    if (!filePath.includes(app.getPath('appData'))) {
      dialog.showMessageBox({
        type: 'info',
        message: 'Timelapse export completed',
        detail: 'Your replay has been saved to ' + filePath,
      });
    }

    // Restart app tracking interval if auto-recording is enabled
    if (isAutoRecordingEnabled && !appTrackingInterval) {
      appTrackingInterval = setInterval(trackAppChange, 1000);
      log.info('Restarted app tracking after export');
    }

  } catch (error) {
    log.error('Failed to export timelapse:', error);
    throw error;
  } finally {
    // Clean up the backup directory
    try {
      await fs.promises.rm(exportBackupDir, { recursive: true, force: true });
      log.info('Cleaned up export backup directory');
    } catch (cleanupError) {
      log.error('Error cleaning up export backup directory:', cleanupError);
    }
  }
}

export async function exportRecordingWithUserPath(tray: Tray, fps: number) {
  safelyPauseRecording();
  isRecording = false;
  isPaused = false;
  updateMenu();
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
    log.info('Export cancelled by user');
    return;
  }
  const exportDir = path.join(app.getPath('temp'), `DayReplay-export-${startDate}`);
  await exportRecordingToPath(filePath, fps, exportDir);
}

//--------------Utils--------------------------------

export function resolveHtmlPath(htmlFileName: string) {
  if (process.env.NODE_ENV === 'development') {
    const port = process.env.PORT || 1212;
    const url = new URL(`http://localhost:${port}`);
    url.pathname = htmlFileName;
    return url.href;
  }
  return `file://${path.resolve(__dirname, '../renderer/', htmlFileName)}`;
}

//--------------On App Start--------------------------------

// Add new function to resolve FFmpeg path
async function resolveFfmpegPath(): Promise<string> {
  if (cachedFfmpegPath && fs.existsSync(cachedFfmpegPath)) {
    return cachedFfmpegPath;
  }

  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  // Development path - check first if we're not packaged
  if (!app.isPackaged) {
    const devPath = path.join(__dirname, '../../ffmpeg', binaryName);
    if (fs.existsSync(devPath)) {
      cachedFfmpegPath = devPath;
      return devPath;
    }
  }

  // Production paths
  const possiblePaths = [
    path.join(process.resourcesPath, 'ffmpeg', binaryName),  // Try this first - simpler path
    path.join(process.resourcesPath, 'app.asar.unpacked', 'ffmpeg', binaryName),
    path.join(app.getAppPath(), '..', 'ffmpeg', binaryName),
    path.join(app.getPath('exe'), '..', 'ffmpeg', binaryName),
    // Add more paths if needed
  ];

  log.info('Checking possible FFmpeg paths:', possiblePaths);

  for (const ffmpegPath of possiblePaths) {
    log.info(`Checking FFmpeg path: ${ffmpegPath}`);
    if (fs.existsSync(ffmpegPath)) {
      log.info(`Found FFmpeg at: ${ffmpegPath}`);

      // Make executable if needed
      if (process.platform !== 'win32') {
        try {
          await fs.promises.chmod(ffmpegPath, '755');
          log.info('Made FFmpeg executable');
        } catch (error) {
          log.error('Error making FFmpeg executable:', error);
          continue;
        }
      }

      // Test the binary
      try {
        const testResult = require('child_process').spawnSync(ffmpegPath, ['-version']);
        if (!testResult.error) {
          log.info('FFmpeg test successful');
          cachedFfmpegPath = ffmpegPath;
          return ffmpegPath;
        }
      } catch (error) {
        log.error('FFmpeg test failed:', error);
        continue;
      }
    }
  }

  throw new Error('FFmpeg not found in any of the expected locations');
}

// Replace the startup FFmpeg check with an async initialization function
async function initializeFfmpeg() {
  try {
    const ffmpegPath = await resolveFfmpegPath();
    log.info('FFmpeg initialized successfully at:', ffmpegPath);
    ffmpeg.setFfmpegPath(ffmpegPath);
  } catch (error) {
    log.error('Failed to initialize FFmpeg:', error);
    dialog.showErrorBox(
      'Failed to initialize FFmpeg',
      'Timelapse will not work without FFmpeg. Please try reinstalling the app or contact support if the issue persists.'
    );
    throw error;
  }
}

// Call the initialization function
initializeFfmpeg().catch(error => {
  log.error('Failed to initialize FFmpeg:', error);
});

// Set the active tray
setTray(appTray);

// Queue management functions
async function addToExportQueue() {
  try {
    const currentQueue = (settingsStore as any).get('exportQueue') || [];

    log.info('Current export queue before adding:', currentQueue);

    // Create a backup directory for these screenshots
    const backupDir = path.join(app.getPath('temp'), `DayReplay-backup-${startDate}`);
    await fs.promises.mkdir(backupDir, { recursive: true });

    // Get list of files before copying
    const files = await fs.promises.readdir(tempDir);
    const screenshots = files.filter(file => file.endsWith('.jpg'));

    log.info(`Found ${screenshots.length} screenshots to backup`);

    // Copy all screenshots to backup directory
    for (const file of screenshots) {
      const sourcePath = path.join(tempDir, file);
      const destPath = path.join(backupDir, file);
      await fs.promises.copyFile(sourcePath, destPath);
    }

    // Verify files were copied successfully
    const backupFiles = await fs.promises.readdir(backupDir);
    log.info(`Successfully backed up ${backupFiles.length} files to ${backupDir}`);

    // Save app usage data
    const appUsageFile = path.join(backupDir, 'appUsage.json');
    await fs.promises.writeFile(appUsageFile, JSON.stringify(appUsageData));

    currentQueue.push({
      startDate,
      timestamp: Date.now(),
      backupDir,
      screenshotCount,
      interval: intervalInSeconds,
      resolution
    });
    (settingsStore as any).set('exportQueue', currentQueue);
    log.info('Added recording to export queue. New queue:', currentQueue);
  } catch (error) {
    log.error('Failed to add to export queue:', error);
  }
}

export async function processExportQueue() {
  if (isProcessingQueue) {
    log.info('Queue processing already in progress, skipping');
    return;
  }

  try {
    isProcessingQueue = true;
    const currentQueue = (settingsStore as any).get('exportQueue') || [];
    if (currentQueue.length === 0) {
      return;
    }

    log.info('[QUEUE PROCESS]: Processing export queue, items:', currentQueue);

    for (const item of currentQueue) {
      try {
        log.info('[QUEUE PROCESS]: Processing export for startDate:', item.startDate);

        // Check if backup exists
        if (item.backupDir && fs.existsSync(item.backupDir)) {
          // Verify backup files exist
          const backupFiles = await fs.promises.readdir(item.backupDir);
          const screenshots = backupFiles.filter(file => file.endsWith('.jpg'));

          log.info(`[QUEUE PROCESS]: Found ${screenshots.length} screenshots in backup`);

          if (screenshots.length === 0) {
            log.error('No screenshots found in backup directory');
            continue;
          }

          // Restore app usage data
          const appUsageFile = path.join(item.backupDir, 'appUsage.json');
          if (fs.existsSync(appUsageFile)) {
            log.info('Found app usage file:', appUsageFile);
            const appUsageContent = await fs.promises.readFile(appUsageFile, 'utf-8');
            appUsageData = JSON.parse(appUsageContent);
          }
          else{
            log.error('No app usage file found in backup directory');
            continue;
          }

          // Restore other necessary state
          startDate = item.startDate;
          screenshotCount = item.screenshotCount;
          intervalInSeconds = item.interval;
          resolution = item.resolution;

          try {
            // Create the export path
            const localDayDir = path.join(app.getPath('appData'), "DayReplays");
            if (!fs.existsSync(localDayDir)) {
              fs.mkdirSync(localDayDir, { recursive: true });
            }
            const filePath = path.join(localDayDir, `DayReplay-${startDate}.mp4`);

            // Export directly from backup directory
            await exportRecordingToPath(filePath, 30, item.backupDir);
            log.info('[QUEUE PROCESS]: Successfully processed queued export for startDate:', item.startDate);

            // Only clean up backup after successful export
            await fs.promises.rm(item.backupDir, { recursive: true, force: true });

            // Reset recording state
            isRecording = false;
            isPaused = false;
            screenshotCount = 0;
            startDate = Date.now();
            appUsageData = [];

            // Clear temp directory
            await clearTempDir();
            log.info('Cleared temp directory for fresh recording');

            // Clear this item from the queue
            const remainingQueue = ((settingsStore as any).get('exportQueue') || []).filter(
              (queueItem: any) => queueItem.startDate !== item.startDate
            );
            (settingsStore as any).set('exportQueue', remainingQueue);

            // Update menu to reflect new state
            updateMenu();

          } catch (exportError) {
            log.error('[QUEUE PROCESS]: Failed to process export:', exportError);
            // Don't remove from queue if export failed
            throw exportError;
          }
        } else {
          log.error('Backup directory not found:', item.backupDir);
        }
      } catch (error: any) {
        if (error.message?.includes('timeout')) {
          log.warn('Timeout during export, keeping item in queue:', item);
          continue; // Keep this item in queue
        }
        log.error('Failed to process queued export:', error);
      }
    }

    // After all items are processed, ensure everything is reset
    try {
      // Clear temp directory one final time
      await clearTempDir();

      // Reset all recording state
      safelyPauseRecording();
      isRecording = false;
      isPaused = false;
      screenshotCount = 0;
      startDate = Date.now();
      appUsageData = [];

      // Update menu to reflect final state
      updateMenu();

      log.info('Recording state reset and temp directory cleared for fresh recordings');
    } catch (cleanupError) {
      log.error('Error during final cleanup:', cleanupError);
    }

    // Clear any remaining items in the queue
    (settingsStore as any).set('exportQueue', []);
    log.info('Queue cleared after successful processing');
  } catch (error) {
    log.error('Failed to process export queue:', error);
  } finally {
    isProcessingQueue = false;
  }
}

// Queue management functions
async function clearExportQueue() {
  try {
    const currentQueue = (settingsStore as any).get('exportQueue') || [];

    // Clean up any existing backup directories
    for (const item of currentQueue) {
      if (item.backupDir && fs.existsSync(item.backupDir)) {
        try {
          await fs.promises.rm(item.backupDir, { recursive: true, force: true });
          log.info('Cleaned up backup directory:', item.backupDir);
        } catch (error) {
          log.error('Failed to clean up backup directory:', item.backupDir, error);
        }
      }
    }

    // Clear the queue
    (settingsStore as any).set('exportQueue', []);
    log.info('Export queue cleared');
  } catch (error) {
    log.error('Failed to clear export queue:', error);
  }
}

// Export it so we can use it in main.ts
export { clearExportQueue };


