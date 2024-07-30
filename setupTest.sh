#!/bin/bash

# Function to create directory if it doesn't exist
create_dir_if_not_exists() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        echo "Created directory: $1"
    else
        echo "Directory already exists: $1"
    fi
}

# Function to create file if it doesn't exist
create_file_if_not_exists() {
    if [ ! -f "$1" ]; then
        touch "$1"
        echo "Created file: $1"
    else
        echo "File already exists: $1"
    fi
}

# Create root level jest config if it doesn't exist
create_file_if_not_exists "jest.config.js"

# Create utils test directory and file
create_dir_if_not_exists "utils/tests"
create_file_if_not_exists "utils/tests/commonUtils.test.js"

# Function to set up test structure for a service
setup_service_tests() {
    local service_name=$1
    create_dir_if_not_exists "services/$service_name/tests"
    create_file_if_not_exists "services/$service_name/jest.config.js"
    create_file_if_not_exists "services/$service_name/tests/${service_name}.test.js"
}

# Set up test structure for each service
setup_service_tests "search-service"
setup_service_tests "songs-service"
setup_service_tests "popularity-service"
setup_service_tests "trends-service"

# Set up swift-api test structure
create_dir_if_not_exists "swift-api/tests/unit"
create_dir_if_not_exists "swift-api/tests/integration"
create_file_if_not_exists "swift-api/jest.config.js"
create_file_if_not_exists "swift-api/tests/unit/routes.test.js"
create_file_if_not_exists "swift-api/tests/integration/api.test.js"

echo "Revised test structure setup completed!"