module.exports = {
  apps: [{
    name: "search-service",
    script: "src/server.js",
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: "development",
      PORT: 3002
    },
    env_production: {
      NODE_ENV: "production",
      PORT: 3002
    }
  }]
};