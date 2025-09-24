// PM2 ecosystem file for production deployment
module.exports = {
  apps: [
    {
      name: 'adms4-next-app',
      script: 'npm',
      args: 'start',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3033
      },
      error_file: './logs/app-error.log',
      out_file: './logs/app-out.log',
      log_file: './logs/app-combined.log',
      time: true
    },
    {
      name: 'adms4-socket-server',
      script: 'socket-server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        SOCKET_PORT: 4000,
        ALLOWED_ORIGINS: 'http://localhost:3033,https://your-domain.com',
        NOTIFICATION_INTERVAL: 30000,
        SERVER_ID: 'socket-server-prod'
      },
      error_file: './logs/socket-error.log',
      out_file: './logs/socket-out.log',
      log_file: './logs/socket-combined.log',
      time: true
    }
  ]
};