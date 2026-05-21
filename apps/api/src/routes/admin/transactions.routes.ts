import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { Transaction } from '../../models/Transaction.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/admin/transactions
router.get('/', requirePermission('accounts.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(200, Math.max(1, Number(req.query['limit'] ?? 50)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (req.query['type']) filter['type'] = req.query['type'];
    if (req.query['category']) filter['category'] = req.query['category'];
    if (req.query['paymentMethod']) filter['paymentMethod'] = req.query['paymentMethod'];

    if (req.query['from'] || req.query['to']) {
      const dateFilter: Record<string, Date> = {};
      if (req.query['from']) dateFilter['$gte'] = new Date(String(req.query['from']));
      if (req.query['to']) {
        const to = new Date(String(req.query['to']));
        to.setHours(23, 59, 59, 999);
        dateFilter['$lte'] = to;
      }
      filter['date'] = dateFilter;
    }

    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort('-date').skip(skip).limit(limit).lean(),
      Transaction.countDocuments(filter),
    ]);

    sendPaginated(res, transactions, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/transactions — create expense (income is auto-created from orders)
const createExpenseSchema = z.object({
  category: z.enum(['rent', 'salary', 'marketing', 'inventory', 'delivery', 'utility', 'other']),
  amount: z.number().min(0.01),
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  description: z.string().default(''),
  paymentMethod: z.enum(['cash', 'bkash', 'card', 'bank']),
  attachments: z
    .array(z.object({ url: z.string().url(), publicId: z.string() }))
    .default([]),
});

router.post('/', requirePermission('accounts.expense.create'), async (req, res, next) => {
  try {
    if (!req.user) {
      sendError(res, 'Unauthorized', 401, 'UNAUTHORIZED');
      return;
    }

    const data = createExpenseSchema.parse(req.body);
    const transaction = await Transaction.create({
      type: 'expense',
      category: data.category,
      amount: data.amount,
      date: new Date(data.date),
      reference: { type: 'manual' },
      description: data.description,
      paymentMethod: data.paymentMethod,
      attachments: data.attachments,
      createdBy: new mongoose.Types.ObjectId(req.user._id),
    });

    sendSuccess(res, transaction, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/transactions/:id
const updateExpenseSchema = z.object({
  category: z
    .enum(['rent', 'salary', 'marketing', 'inventory', 'delivery', 'utility', 'other'])
    .optional(),
  amount: z.number().min(0.01).optional(),
  date: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), 'Invalid date')
    .optional(),
  description: z.string().optional(),
  paymentMethod: z.enum(['cash', 'bkash', 'card', 'bank']).optional(),
});

router.patch('/:id', requirePermission('accounts.expense.create'), async (req, res, next) => {
  try {
    const tx = await Transaction.findById(req.params['id']);
    if (!tx) {
      sendError(res, 'Transaction not found', 404, 'NOT_FOUND');
      return;
    }
    if (tx.type !== 'expense') {
      sendError(res, 'Only expense transactions can be edited', 403, 'FORBIDDEN');
      return;
    }

    const data = updateExpenseSchema.parse(req.body);
    if (data.category !== undefined) tx.category = data.category;
    if (data.amount !== undefined) tx.amount = data.amount;
    if (data.date !== undefined) tx.date = new Date(data.date);
    if (data.description !== undefined) tx.description = data.description;
    if (data.paymentMethod !== undefined) tx.paymentMethod = data.paymentMethod;

    await tx.save();
    sendSuccess(res, tx);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/transactions/:id — expenses only
router.delete('/:id', requirePermission('accounts.expense.create'), async (req, res, next) => {
  try {
    const tx = await Transaction.findById(req.params['id']);
    if (!tx) {
      sendError(res, 'Transaction not found', 404, 'NOT_FOUND');
      return;
    }
    if (tx.type !== 'expense') {
      sendError(res, 'Only expense transactions can be deleted', 403, 'FORBIDDEN');
      return;
    }
    await tx.deleteOne();
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/transactions/export — CSV download
router.get('/export', requirePermission('accounts.view'), async (req, res, next) => {
  try {
    const filter: Record<string, unknown> = {};
    if (req.query['type']) filter['type'] = req.query['type'];
    if (req.query['from'] || req.query['to']) {
      const dateFilter: Record<string, Date> = {};
      if (req.query['from']) dateFilter['$gte'] = new Date(String(req.query['from']));
      if (req.query['to']) {
        const to = new Date(String(req.query['to']));
        to.setHours(23, 59, 59, 999);
        dateFilter['$lte'] = to;
      }
      filter['date'] = dateFilter;
    }

    const transactions = await Transaction.find(filter).sort('-date').limit(5000).lean();

    const header = 'Date,Type,Category,Amount,Payment Method,Description\n';
    const rows = transactions
      .map((t) =>
        [
          new Date(t.date).toLocaleDateString('en-BD'),
          t.type,
          t.category,
          t.amount,
          t.paymentMethod,
          `"${(t.description ?? '').replace(/"/g, '""')}"`,
        ].join(','),
      )
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
    res.send(header + rows);
  } catch (err) {
    next(err);
  }
});

export default router;
