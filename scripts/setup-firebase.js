#!/usr/bin/env node

/**
 * Firebase Configuration Setup Script
 *
 * This script helps users set up their Firebase configuration by:
 * 1. Creating a .env file if it doesn't exist
 * 2. Prompting for Firebase configuration details
 * 3. Saving the configuration to the .env file
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Path to the .env file
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

// Firebase configuration fields
const firebaseFields = [
  { key: 'FIREBASE_API_KEY', name: 'API Key' },
  { key: 'FIREBASE_AUTH_DOMAIN', name: 'Auth Domain' },
  { key: 'FIREBASE_PROJECT_ID', name: 'Project ID' },
  { key: 'FIREBASE_STORAGE_BUCKET', name: 'Storage Bucket' },
  { key: 'FIREBASE_MESSAGING_SENDER_ID', name: 'Messaging Sender ID' },
  { key: 'FIREBASE_APP_ID', name: 'App ID' },
  { key: 'FIREBASE_MEASUREMENT_ID', name: 'Measurement ID (optional)' },
];

// Check if .env file exists
const envExists = fs.existsSync(envPath);

// If .env doesn't exist, create it from .env.example
if (!envExists) {
  try {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath);
      console.log('Created .env file from .env.example');
    } else {
      // Create empty .env file
      fs.writeFileSync(envPath, '# Firebase Configuration\n\n');
      console.log('Created empty .env file');
    }
  } catch (error) {
    console.error('Error creating .env file:', error);
    process.exit(1);
  }
}

// Read existing .env file
let envContent = '';
try {
  envContent = fs.readFileSync(envPath, 'utf8');
} catch (error) {
  console.error('Error reading .env file:', error);
  process.exit(1);
}

// Parse existing environment variables
const existingEnv = {};
envContent.split('\n').forEach((line) => {
  if (line.trim() && !line.startsWith('#')) {
    const [key, value] = line.split('=');
    if (key && value) {
      existingEnv[key.trim()] = value.trim();
    }
  }
});

console.log('\n=== Firebase Configuration Setup ===\n');
console.log('This script will help you set up your Firebase configuration.');
console.log(
  'You can find your Firebase configuration in the Firebase console:',
);
console.log('1. Go to https://console.firebase.google.com/');
console.log('2. Select your project');
console.log('3. Click on the gear icon (⚙️) next to "Project Overview"');
console.log('4. Select "Project settings"');
console.log('5. Scroll down to "Your apps" section and select your web app');
console.log('6. Copy the configuration values from the Firebase SDK snippet\n');

// Prompt for Firebase configuration
const promptForConfig = async () => {
  const config = {};

  for (const field of firebaseFields) {
    const defaultValue = existingEnv[field.key] || '';
    const isOptional = field.name.includes('optional');

    await new Promise((resolve) => {
      const promptText = `Enter your Firebase ${field.name}${defaultValue ? ` (current: ${defaultValue})` : ''}${isOptional ? ' (press Enter to skip)' : ''}: `;

      rl.question(promptText, (answer) => {
        // Use existing value if user just presses Enter
        const value = answer.trim() || defaultValue;

        if (!value && !isOptional) {
          console.log(`${field.name} is required. Please enter a value.`);
          // Ask again for this field
          rl.question(promptText, (secondAnswer) => {
            config[field.key] = secondAnswer.trim() || defaultValue;
            resolve();
          });
        } else {
          config[field.key] = value;
          resolve();
        }
      });
    });
  }

  return config;
};

// Main function
const main = async () => {
  try {
    const config = await promptForConfig();

    // Update .env content with new configuration
    let newEnvContent = '# Firebase Configuration\n';
    for (const field of firebaseFields) {
      if (config[field.key]) {
        newEnvContent += `${field.key}=${config[field.key]}\n`;
      }
    }

    // Preserve other environment variables
    envContent.split('\n').forEach((line) => {
      if (
        line.trim() &&
        !line.startsWith('#') &&
        !line.startsWith('FIREBASE_')
      ) {
        const [key] = line.split('=');
        if (key && key.trim()) {
          newEnvContent += `${line}\n`;
        }
      }
    });

    // Write updated .env file
    fs.writeFileSync(envPath, newEnvContent);

    console.log('\nFirebase configuration has been saved to .env file.');
    console.log(
      'You can now run the application with your Firebase configuration.',
    );

    rl.close();
  } catch (error) {
    console.error('Error setting up Firebase configuration:', error);
    rl.close();
    process.exit(1);
  }
};

// Run the main function
main();
