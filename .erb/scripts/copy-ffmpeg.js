const fs = require('fs');
const path = require('path');
const log = require('electron-log');
const { execSync } = require('child_process');

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

      // Sign the binary on macOS if we're in a signing build
      if (
        process.platform === 'darwin' &&
        (process.env.CSC_NAME || process.env.APPLE_TEAM_ID)
      ) {
        try {
          // Use CSC_NAME if available, otherwise fall back to APPLE_TEAM_ID
          const identity = process.env.CSC_NAME || process.env.APPLE_TEAM_ID;
          log.info('Signing FFmpeg binary with identity:', identity);
          execSync(
            `codesign --force --options runtime --sign "${identity}" "${targetPath}"`,
          );
          log.info('FFmpeg binary signed successfully');
        } catch (signingError) {
          log.error('Failed to sign FFmpeg binary:', signingError);
          // Don't exit the process, just log the error and continue
        }
      }
    }
    log.info('FFmpeg binary copied successfully to:', targetPath);
  } catch (error) {
    log.error('Failed to copy FFmpeg binary:', error);
    process.exit(1);
  }
}

copyFFmpeg();
