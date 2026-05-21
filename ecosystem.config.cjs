// PM2 ecosystem file — production process manager config
// Usage: pm2 start ecosystem.config.cjs
// Deploy: pm2 start ecosystem.config.cjs --env production

module.exports = {
  apps: [
    {
      name: 'cholonbil-api',
      script: './apps/api/dist/index.js',
      cwd: '/var/www/cholonbil',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'development',
        PORT: 4000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      // Auto-restart on crash
      restart_delay: 3000,
      max_restarts: 10,
      // Memory limit — restart if API leaks above 500MB
      max_memory_restart: '500M',
      // Logs
      out_file: '/var/log/pm2/cholonbil-api-out.log',
      error_file: '/var/log/pm2/cholonbil-api-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Zero-downtime reload
      wait_ready: true,
      listen_timeout: 10000,
      kill_timeout: 5000,
    },
    {
      name: 'cholonbil-web',
      script: 'node_modules/.bin/next',
      args: 'start',
      cwd: '/var/www/cholonbil/apps/web',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      out_file: '/var/log/pm2/cholonbil-web-out.log',
      error_file: '/var/log/pm2/cholonbil-web-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
