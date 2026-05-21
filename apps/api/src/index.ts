import 'dotenv/config';
import { env } from './config/env.js';
import { connectDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { startCourierSyncCron } from './cron/courier-sync.js';
import app from './app.js';

async function main() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API running on http://localhost:${env.PORT}`);
  });

  startCourierSyncCron();

  const shutdown = (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error('Fatal startup error', { err });
  process.exit(1);
});
