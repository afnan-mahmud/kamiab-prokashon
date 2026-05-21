import { Router } from 'express';
import { Transaction } from '../../models/Transaction.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

function buildDateFilter(query: Record<string, unknown>) {
  const filter: Record<string, unknown> = {};
  if (query['from'] || query['to']) {
    const dateFilter: Record<string, Date> = {};
    if (query['from']) dateFilter['$gte'] = new Date(String(query['from']));
    if (query['to']) {
      const to = new Date(String(query['to']));
      to.setHours(23, 59, 59, 999);
      dateFilter['$lte'] = to;
    }
    filter['date'] = dateFilter;
  }
  return filter;
}

// GET /api/admin/accounts/summary?from=&to=
router.get('/summary', requirePermission('accounts.view'), async (req, res, next) => {
  try {
    const dateFilter = buildDateFilter(req.query as Record<string, unknown>);

    const [summary, incomeByMethod, expenseByCategory] = await Promise.all([
      Transaction.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'income' } },
        {
          $group: {
            _id: '$paymentMethod',
            total: { $sum: '$amount' },
          },
        },
      ]),
      Transaction.aggregate([
        { $match: { ...dateFilter, type: 'expense' } },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
          },
        },
      ]),
    ]);

    const totalIncome = summary.find((s) => s._id === 'income')?.total ?? 0;
    const totalExpense = summary.find((s) => s._id === 'expense')?.total ?? 0;

    // Cash in hand = cash income − cash expenses
    const [cashSummary] = await Transaction.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: null,
          cashIncome: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'income'] }, { $eq: ['$paymentMethod', 'cash'] }] },
                '$amount',
                0,
              ],
            },
          },
          cashExpense: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$type', 'expense'] }, { $eq: ['$paymentMethod', 'cash'] }] },
                '$amount',
                0,
              ],
            },
          },
        },
      },
    ]);

    sendSuccess(res, {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      cashInHand: (cashSummary?.cashIncome ?? 0) - (cashSummary?.cashExpense ?? 0),
      incomeByMethod: incomeByMethod.map((m) => ({ method: m._id, total: m.total })),
      expenseByCategory: expenseByCategory.map((e) => ({ category: e._id, total: e.total })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/accounts/monthly?year=2025
router.get('/monthly', requirePermission('accounts.view'), async (req, res, next) => {
  try {
    const year = Number(req.query['year'] ?? new Date().getFullYear());
    const from = new Date(`${year}-01-01`);
    const to = new Date(`${year}-12-31T23:59:59.999Z`);

    const rows = await Transaction.aggregate([
      { $match: { date: { $gte: from, $lte: to } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Reshape: [{ month: '2025-01', income: X, expense: Y }, ...]
    const map = new Map<string, { income: number; expense: number }>();
    for (const row of rows) {
      const key = `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
      if (!map.has(key)) map.set(key, { income: 0, expense: 0 });
      const entry = map.get(key)!;
      if (row._id.type === 'income') entry.income = row.total;
      else entry.expense = row.total;
    }

    const result = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, vals]) => ({ month, ...vals }));

    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
});

export default router;
