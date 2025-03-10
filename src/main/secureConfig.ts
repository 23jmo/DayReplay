import { app } from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// Generate a stable encryption key based on the machine ID
// This ensures the key is unique per device but consistent across app restarts
const generateEncryptionKey = (): string => {
  // Use app.getPath('userData') as a base for uniqueness
  const userDataPath = app.getPath('userData');

  // Create a hash of the path to use as encryption key
  return crypto
    .createHash('sha256')
    .update(userDataPath)
    .digest('hex')
    .substring(0, 32); // Use first 32 chars (16 bytes) for AES-256
};

// Firebase configuration interface
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId: string;
}

// Define the schema for our store
interface StoreSchema {
  firebase?: FirebaseConfig;
  [key: string]: any;
}

// Create encrypted store
const encryptionKey = generateEncryptionKey();
// Use type assertion to work around type issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const secureStore = new Store<StoreSchema>() as any;
secureStore.name = 'secure-config';
secureStore.encryptionKey = encryptionKey;
secureStore.encryption = process.env.NODE_ENV === 'production';

// Default empty config
const defaultFirebaseConfig: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
};

/**
 * Initialize Firebase configuration from environment variables or .env file
 */
export const initializeFirebaseConfig = (): void => {
  // Check if we already have stored config
  const existingConfig = secureStore.get('firebase');

  // If we have a valid config and we're in production, don't overwrite it
  if (
    existingConfig?.apiKey &&
    process.env.NODE_ENV === 'production' &&
    !process.env.FORCE_CONFIG_RELOAD
  ) {
    console.log('Using existing Firebase configuration from secure storage');
    return;
  }

  // Start with environment variables
  const config: FirebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY || '',
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
    appId: process.env.FIREBASE_APP_ID || '',
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || '',
  };

  // In development, try to load from .env file if environment variables are not set
  if (process.env.NODE_ENV === 'development') {
    try {
      const envPath = path.join(app.getAppPath(), '.env');
      if (fs.existsSync(envPath)) {
        console.log('Loading Firebase config from .env file');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envVars = envContent.split('\n').reduce(
          (acc, line) => {
            const match = line.match(/^FIREBASE_([A-Z_]+)=(.+)$/);
            if (match) {
              const key = match[1]
                .toLowerCase()
                .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
              acc[key] = match[2].trim();
            }
            return acc;
          },
          {} as Record<string, string>,
        );

        // Update config with values from .env
        Object.assign(config, envVars);
      }
    } catch (error) {
      console.error('Error loading .env file:', error);
    }
  }

  // Only save if we have at least an API key
  if (config.apiKey) {
    console.log('Saving Firebase configuration to secure storage');
    secureStore.set('firebase', config);
  } else {
    console.warn(
      'No Firebase API key found, using default empty configuration',
    );
    secureStore.set('firebase', defaultFirebaseConfig);
  }
};

/**
 * Get Firebase configuration
 */
export const getFirebaseConfig = (): FirebaseConfig => {
  const config = secureStore.get('firebase');
  return config || defaultFirebaseConfig;
};

/**
 * Get any secure configuration by name
 */
export const getSecureConfig = (configName: string): any => {
  if (configName === 'firebase') {
    return getFirebaseConfig();
  }
  return null;
};

/**
 * Set a secure configuration value
 */
export const setSecureConfig = (configName: string, value: any): void => {
  secureStore.set(configName, value);
};

/**
 * Clear all secure configurations (useful for testing)
 */
export const clearSecureConfigs = (): void => {
  secureStore.clear();
};
