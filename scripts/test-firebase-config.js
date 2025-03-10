#!/usr/bin/env node

/**
 * Firebase Configuration Test Script
 *
 * This script tests that the secure configuration is working correctly.
 * It should be run after building the app to verify that the configuration
 * is properly stored and can be retrieved.
 */

const { app } = require('electron');
const crypto = require('crypto');
const path = require('path');

// This needs to be run with electron
if (!app) {
  console.error('This script must be run with electron:');
  console.error('npx electron scripts/test-firebase-config.js');
  process.exit(1);
}

// Wait for app to be ready
app.whenReady().then(async () => {
  console.log('Testing Firebase configuration storage and retrieval...');

  try {
    // Dynamically import electron-store (ES module)
    const { default: Store } = await import('electron-store');

    // Generate encryption key (same as in secureConfig.ts)
    const generateEncryptionKey = () => {
      const userDataPath = app.getPath('userData');
      return crypto
        .createHash('sha256')
        .update(userDataPath)
        .digest('hex')
        .substring(0, 32);
    };

    const encryptionKey = generateEncryptionKey();

    // Create store with same settings as in secureConfig.ts
    const secureStore = new Store({
      name: 'secure-config',
      encryptionKey,
      encryption: process.env.NODE_ENV === 'production',
    });

    // Check if Firebase config exists
    const firebaseConfig = secureStore.get('firebase');

    if (firebaseConfig) {
      console.log('✅ Firebase configuration found in secure storage:');

      // Print config with API key partially masked for security
      const maskedConfig = { ...firebaseConfig };
      if (maskedConfig.apiKey) {
        maskedConfig.apiKey =
          maskedConfig.apiKey.substring(0, 4) +
          '...' +
          maskedConfig.apiKey.substring(maskedConfig.apiKey.length - 4);
      }

      console.log(JSON.stringify(maskedConfig, null, 2));

      // Verify that required fields are present
      const requiredFields = [
        'apiKey',
        'authDomain',
        'projectId',
        'storageBucket',
        'messagingSenderId',
        'appId',
      ];

      const missingFields = requiredFields.filter(
        (field) => !firebaseConfig[field],
      );

      if (missingFields.length > 0) {
        console.warn('⚠️ Warning: The following required fields are missing:');
        console.warn(missingFields.join(', '));
        console.warn(
          'You may need to run the setup script again: npm run setup:firebase',
        );
      } else {
        console.log('✅ All required fields are present.');
      }
    } else {
      console.error('❌ No Firebase configuration found in secure storage.');
      console.error(
        'You may need to run the setup script: npm run setup:firebase',
      );
      console.error(
        'Or the app needs to be run at least once to initialize the configuration.',
      );
    }
  } catch (error) {
    console.error('Error testing Firebase configuration:', error);
  }

  // Exit the app
  app.quit();
});
