#!/usr/bin/env node

/**
 * Firebase Configuration Setup Script
 *
 * This script helps users set up their Firebase configuration by:
 * 1. Checking if a .env file exists
 * 2. If not, creating one from .env.example
 * 3. Prompting the user to enter their Firebase configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envExamplePath = path.join(rootDir, '.env.example');

// Check if .env file exists
if (fs.existsSync(envPath)) {
  console.log('A .env file already exists. Do you want to overwrite it? (y/n)');
  rl.question('', (answer) => {
    if (answer.toLowerCase() === 'y') {
      createEnvFile();
    } else {
      console.log('Setup cancelled. Your existing .env file was not modified.');
      rl.close();
    }
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  // Read the example file
  if (!fs.existsSync(envExamplePath)) {
    console.error('.env.example file not found. Please create it first.');
    rl.close();
    return;
  }

  const exampleContent = fs.readFileSync(envExamplePath, 'utf8');

  console.log('\n=== Firebase Configuration Setup ===');
  console.log('Please enter your Firebase configuration details:');

  // Extract Firebase variables from the example file
  const firebaseVars = exampleContent.match(/FIREBASE_[A-Z_]+=.*/g) || [];
  const varNames = firebaseVars.map((v) => v.split('=')[0]);

  let envContent = exampleContent;
  let currentVarIndex = 0;

  const promptNextVar = () => {
    if (currentVarIndex >= varNames.length) {
      // All variables have been processed
      fs.writeFileSync(envPath, envContent);
      console.log('\n✅ Firebase configuration has been saved to .env file');
      console.log('You can edit this file manually at any time.');
      rl.close();
      return;
    }

    const varName = varNames[currentVarIndex];
    rl.question(`${varName}: `, (value) => {
      // Replace the placeholder with the actual value
      envContent = envContent.replace(
        new RegExp(`${varName}=.*`),
        `${varName}=${value}`,
      );
      currentVarIndex++;
      promptNextVar();
    });
  };

  promptNextVar();
}

rl.on('close', () => {
  console.log('\nSetup complete!');
  process.exit(0);
});
