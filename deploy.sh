#!/bin/bash

declare -A services

# Service directories and their respective deploy scripts
services=(
    ["popularity-service"]="./services/popularity-service/deploy.sh"
    ["search-service"]="./services/search-service/deploy.sh"
    ["songs-service"]="./services/songs-service/deploy.sh"
    ["trends-service"]="./services/trends-service/deploy.sh"
    ["swift-api"]="./swift-api/deploy.sh"
)

# Navigate to the project root
cd "$(dirname "$0")"

deploy_service() {
    service=$1
    script=$2
    
    echo "Deploying $service"
    if [ -x "$script" ]; then
        $script
    else
        echo "Deploy script not found or not executable for $service"
    fi
}

for service in "${!services[@]}"
do
    deploy_service $service ${services[$service]}
done

echo "All services and Swift API deployed"
pm2 list