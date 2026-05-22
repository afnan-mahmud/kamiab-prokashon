import { Router } from 'express';
import { z } from 'zod';
import { AbandonedOrder } from '../../models/AbandonedOrder.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const upsertSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Invalid phone'),
  name: z.string().trim().optional(),
  address: z.string().trim().optional(),
  source: z.enum(['landing_page', 'checkout']),
  landingPageSlug: z.string().optional(),
});

// POST /api/abandoned — upsert by phone
router.post('/', async (req, res, next) => {
  try {
    const result = upsertSchema.safeParse(req.body);
    if (!result.success) {
      sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR');
      return;
    }
    const { phone, name, address, source, landingPageSlug } = result.data;

    const update: Record<string, unknown> = { source };
    if (landingPageSlug) update['landingPageSlug'] = landingPageSlug;
    if (name) update['name'] = name;
    if (address) update['address'] = address;

    await AbandonedOrder.findOneAndUpdate(
      { phone },
      { $set: update, $setOnInsert: { phone, status: 'active' } },
      { upsert: true, new: true },
    );

    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/abandoned?phone=... — remove on successful order
router.delete('/', async (req, res, next) => {
  try {
    const phone = req.query['phone'] as string;
    if (!phone) {
      sendError(res, 'phone required', 400, 'BAD_REQUEST');
      return;
    }
    await AbandonedOrder.deleteOne({ phone });
    sendSuccess(res, { ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
