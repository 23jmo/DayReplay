# Firebase Authentication Guide for Day Replay

This guide provides detailed instructions on setting up and using Firebase Authentication in Day Replay.

## Table of Contents

1. [Setting Up Firebase](#setting-up-firebase)
2. [Configuring Day Replay](#configuring-day-replay)
3. [Using Authentication Features](#using-authentication-features)
4. [Troubleshooting](#troubleshooting)
5. [Security Best Practices](#security-best-practices)

## Setting Up Firebase

### Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" and follow the setup wizard
3. Give your project a name (e.g., "Day Replay")
4. Choose whether to enable Google Analytics (recommended)
5. Accept the terms and click "Create project"

### Enable Authentication Methods

1. In your Firebase project, navigate to "Authentication" in the left sidebar
2. Click on the "Sign-in method" tab
3. Enable "Email/Password" authentication by clicking on it and toggling the switch
4. Enable "Google" authentication by clicking on it and toggling the switch
   - You'll need to configure the OAuth consent screen in Google Cloud Console
   - Add your application domain to the authorized domains list
5. (Optional) Enable additional authentication methods as needed (GitHub, etc.)
6. Save your changes

### Get Your Firebase Configuration

1. In your Firebase project, click on the gear icon next to "Project Overview" and select "Project settings"
2. Scroll down to the "Your apps" section
3. If you haven't added an app yet, click on the web icon (</>) to add a web app
4. Register your app with a nickname (e.g., "Day Replay Web")
5. Copy the Firebase configuration object (it looks like this):

```javascript
const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
  measurementId: 'YOUR_MEASUREMENT_ID',
};
```

## Configuring Day Replay

### Run the Setup Script

The easiest way to configure Firebase in Day Replay is to use our setup script:

```bash
npm run setup:firebase
```

This script will:

1. Create a `.env` file if it doesn't exist
2. Prompt you to enter your Firebase configuration details
3. Save the configuration to your `.env` file

### Manual Configuration

Alternatively, you can manually configure Firebase:

1. Copy the example environment file:

```bash
cp .env.example .env
```

2. Open the `.env` file in your preferred text editor
3. Fill in your Firebase configuration values:

```
# Firebase Configuration
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
FIREBASE_APP_ID=your_app_id
FIREBASE_MEASUREMENT_ID=your_measurement_id
```

## Using Authentication Features

### Signing Up

1. Launch Day Replay
2. Click on the "Login" button in the sidebar
3. On the login page, click "Sign Up"
4. Enter your email and password
5. Click "Sign Up" to create your account

### Logging In

1. Launch Day Replay
2. Click on the "Login" button in the sidebar
3. Enter your email and password
4. Click "Login" to access your account

### Logging In with Google

1. Launch Day Replay
2. Click on the "Login" button in the sidebar
3. On the login page, click "Sign in with Google"
4. Select your Google account from the popup
5. You'll be automatically redirected to the home page after successful authentication

### Logging Out

1. Click on your profile in the sidebar
2. Select "Logout" from the dropdown menu

### Password Reset

1. On the login page, click "Forgot Password?"
2. Enter your email address
3. Click "Reset Password"
4. Check your email for a password reset link

## Troubleshooting

### Common Issues

#### "Firebase configuration not found"

This error occurs when the application cannot find your Firebase configuration. Make sure:

- You've created a `.env` file with your Firebase configuration
- The environment variables are correctly formatted
- You've restarted the application after making changes

#### "Invalid email/password"

This error occurs when your login credentials are incorrect. Make sure:

- You're using the correct email address
- Your password is correct
- Caps Lock is not enabled

#### "Network error"

This error occurs when the application cannot connect to Firebase. Make sure:

- You have an active internet connection
- Your firewall is not blocking the connection
- Firebase services are not experiencing downtime

## Security Best Practices

### Protecting Your Firebase Configuration

- Never commit your `.env` file to version control
- Restrict your Firebase API key in the Firebase Console
- Use Firebase Security Rules to protect your data

### Secure Authentication

- Use strong passwords
- Enable multi-factor authentication if available
- Log out when using shared computers

### Data Privacy

- Only store necessary user information
- Be transparent about data collection
- Provide options for users to delete their data

---

For additional help, please refer to the [Firebase Documentation](https://firebase.google.com/docs) or contact our support team.
