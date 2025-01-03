const fs = require('fs');
const path = require('path');
const log = require('electron-log');

function copyFFmpeg() {
  const ffmpegPath = require('ffmpeg-static');

  // Create base directories if they don't exist
  const baseDir = path.join(__dirname, '../../');
  const ffmpegDir = path.join(baseDir, 'ffmpeg');
  if (!fs.existsSync(ffmpegDir)) {
    fs.mkdirSync(ffmpegDir, { recursive: true });
  }

  // Binary name based on platform
  const binaryName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';

  // Copy to app root ffmpeg directory
  const targetPath = path.join(ffmpegDir, binaryName);

  try {
    fs.copyFileSync(ffmpegPath, targetPath);
    // Make executable on Unix systems
    if (process.platform !== 'win32') {
      fs.chmodSync(targetPath, '755');
    }
    log.info('FFmpeg binary copied successfully to:', targetPath);
  } catch (error) {
    log.error('Failed to copy FFmpeg binary:', error);
    process.exit(1);
  }
}

copyFFmpeg();
