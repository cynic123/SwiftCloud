#!/bin/bash

# Navigate to the service directory
cd "$(dirname "$0")"

# Install dependencies
npm install

# Start or restart the service using PM2
pm2 startOrRestart ecosystem.config.js --env production

echo "Popularity service deployed successfully"