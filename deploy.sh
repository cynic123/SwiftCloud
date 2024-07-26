#!/bin/bash

services=("song-service" "popularity-service" "trend-service" "search-service" "swift-api")

# Navigate to the project root
cd "$(dirname "$0")"

# Function to deploy a service
deploy_service() {
    service=$1
    echo "Deploying $service"
    if [ "$service" == "swift-api" ]; then
        cd "./swift-api"
    else
        cd "./services/$service"
    fi
    npm install
    pm2 startOrRestart ecosystem.config.js --env production
    cd ../..
    echo "$service deployed successfully"
}

# Deploy each service
for service in "${services[@]}"
do
    deploy_service $service
done

echo "All services and Swift API deployed"

# List all running PM2 processes
pm2 list