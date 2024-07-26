module.exports = {
  apps: [{
    name: "trend-service",
    script: "src/server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "development",
      PORT: 3004
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3004
    }
  }]
};