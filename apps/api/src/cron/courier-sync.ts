import cron from 'node-cron';
import { Order } from '../models/Order.js';
import { getSteadfastStatus } from '../services/steadfast.service.js';
import { logger } from '../utils/logger.js';

const TERMINAL_STATUSES = new Set(['delivered', 'cancelled', 'returned', 'partial_delivered']);

async function syncCourierStatuses(): Promise<void> {
  const orders = await Order.find({
    status: 'Hand over to Courier',
    'courier.consignmentId': { $exists: true, $ne: '' },
  }).select('courier orderNumber').lean();

  const active = orders.filter(
    (o) => !o.courier?.status || !TERMINAL_STATUSES.has(o.courier.status),
  );

  if (active.length === 0) return;

  logger.info(`Courier sync: checking ${active.length} active shipments`);

  const results = await Promise.allSettled(
    active.map(async (order) => {
      const result = await getSteadfastStatus(order.courier!.consignmentId!);
      await Order.updateOne(
        { _id: order._id },
        { $set: { 'courier.status': result.delivery_status, 'courier.lastSyncedAt': new Date() } },
      );
      return { orderNumber: order.orderNumber, status: result.delivery_status };
    }),
  );

  const synced = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;
  logger.info(`Courier sync complete: ${synced} synced, ${failed} failed`);
}

export function startCourierSyncCron(): void {
  // Every 30 minutes
  cron.schedule('*/30 * * * *', () => {
    syncCourierStatuses().catch((err) => {
      logger.error('Courier sync cron error', { err });
    });
  });

  logger.info('Courier sync cron started (every 30 minutes)');
}
