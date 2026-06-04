// PM2 ecosystem file — production process manager config (CloudPanel / shared VPS)
// Usage:  pm2 start ecosystem.config.cjs --env production
// Reload: pm2 reload ecosystem.config.cjs --env production
//
// Ports (this VPS hosts other sites too — these are Shukhi Life's dedicated ports):
//   web (Next.js)  -> 3010   (CloudPanel reverse-proxies shukhilife.com -> 3010)
//   api (Express)  -> 3011   (exposed at shukhilife.com/api via CloudPanel Vhost)
//
// cwd is derived from this file's location (__dirname), so it works no matter
// where the repo is cloned (e.g. /home/<site-user>/htdocs/shukhilife.com).

const path = require('path');
const root = __dirname;

module.exports = {
  apps: [
    {
      name: 'shukhilife-api',
      // cwd = apps/api so `dotenv/config` finds apps/api/.env and uploads/ resolves correctly
      script: './dist/index.js',
      cwd: path.join(root, 'apps/api'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3011,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3011,
      },
      restart_delay: 3000,
      max_restarts: 10,
      max_memory_restart: '400M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Logs default to ~/.pm2/logs (writable by the CloudPanel site user).
      // View with: pm2 logs shukhilife-api
    },
    {
      name: 'shukhilife-web',
      // Point at Next's real JS CLI (not the .bin/ shell shim — PM2 runs scripts via node)
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
      cwd: path.join(root, 'apps/web'),
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'development',
        PORT: 3010,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3010,
      },
      max_memory_restart: '600M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
    },
  ],
};
