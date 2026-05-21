import { Router } from 'express';
import { Order } from '../../models/Order.js';
import { Customer } from '../../models/Customer.js';
import { Transaction } from '../../models/Transaction.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

function parseDateRange(query: Record<string, unknown>) {
  const filter: Record<string, Date> = {};
  if (query['from']) filter['$gte'] = new Date(String(query['from']));
  if (query['to']) {
    const to = new Date(String(query['to']));
    to.setHours(23, 59, 59, 999);
    filter['$lte'] = to;
  }
  return Object.keys(filter).length ? filter : null;
}

// GET /api/admin/dashboard
router.get('/', requirePermission('dashboard.view'), async (req, res, next) => {
  try {
    const dateFilter = parseDateRange(req.query as Record<string, unknown>);
    const createdAtFilter = dateFilter ? { createdAt: dateFilter } : {};

    const [
      totalOrders,
      pendingOrders,
      totalCustomers,
      revenueTx,
      recentOrders,
      ordersByStatus,
      topProducts,
      revenueChart,
    ] = await Promise.all([
      Order.countDocuments(createdAtFilter),

      Order.countDocuments({ status: 'Pending', ...createdAtFilter }),

      Customer.countDocuments({ deletedAt: null }),

      Transaction.aggregate([
        { $match: { type: 'income', ...(dateFilter ? { date: dateFilter } : {}) } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),

      Order.find(createdAtFilter)
        .sort('-createdAt')
        .limit(10)
        .select('orderNumber customerSnapshot.name customerSnapshot.phone total status createdAt')
        .lean(),

      Order.aggregate([
        { $match: createdAtFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      Order.aggregate([
        { $match: createdAtFilter },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            productName: { $first: '$items.productName' },
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: '$items.subtotal' },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),

      Order.aggregate([
        { $match: createdAtFilter },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' },
            },
            revenue: { $sum: '$total' },
            orders: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
        { $limit: 90 },
      ]),
    ]);

    sendSuccess(res, {
      stats: {
        totalOrders,
        totalRevenue: revenueTx[0]?.total ?? 0,
        pendingOrders,
        totalCustomers,
      },
      revenueChart: revenueChart.map((r) => ({
        date: `${r._id.year}-${String(r._id.month).padStart(2, '0')}-${String(r._id.day).padStart(2, '0')}`,
        revenue: r.revenue,
        orders: r.orders,
      })),
      topProducts: topProducts.map((p) => ({
        productId: String(p._id),
        productName: p.productName,
        totalSold: p.totalSold,
        revenue: p.revenue,
      })),
      ordersByStatus: ordersByStatus.map((o) => ({ status: o._id, count: o.count })),
      recentOrders: recentOrders.map((o) => ({
        _id: String(o._id),
        orderNumber: o.orderNumber,
        customerName: o.customerSnapshot.name,
        customerPhone: o.customerSnapshot.phone,
        total: o.total,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
