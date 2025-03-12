#!/bin/bash

# Script to package and sign the macOS app

# Export signing environment variables
export APPLE_ID=jomo.epicness@icloud.com
export APPLE_TEAM_ID=BJLT45779D
export CSC_LINK=./certificate.p12
export CSC_KEY_PASSWORD=dcmv8u2d
export APPLE_APP_SPECIFIC_PASSWORD=ajtr-acla-mlse-aidu

# Package the application - now the build process will handle signing the FFmpeg binary
npm run package
