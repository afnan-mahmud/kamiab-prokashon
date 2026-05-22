import { Router } from 'express';
import { AbandonedOrder } from '../../models/AbandonedOrder.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/admin/abandoned-orders
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page']) || 1);
    const limit = 20;
    const skip = (page - 1) * limit;

    const statusFilter = req.query['status'] as string | undefined;
    const filter: Record<string, unknown> = {};
    if (statusFilter && ['active', 'fake'].includes(statusFilter)) {
      filter['status'] = statusFilter;
    }

    const [items, total] = await Promise.all([
      AbandonedOrder.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      AbandonedOrder.countDocuments(filter),
    ]);

    sendSuccess(res, { items, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/abandoned-orders/:id/fake — toggle fake status
router.patch('/:id/fake', async (req, res, next) => {
  try {
    const record = await AbandonedOrder.findById(req.params['id']);
    if (!record) {
      sendError(res, 'Not found', 404, 'NOT_FOUND');
      return;
    }
    record.status = record.status === 'fake' ? 'active' : 'fake';
    await record.save();
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/abandoned-orders/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await AbandonedOrder.findByIdAndDelete(req.params['id']);
    if (!deleted) {
      sendError(res, 'Not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
