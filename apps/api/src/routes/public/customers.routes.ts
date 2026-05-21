import { Router } from 'express';
import { z } from 'zod';
import { Customer } from '../../models/Customer.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/customers/lookup?phone=
router.get('/lookup', async (req, res, next) => {
  try {
    const { phone } = z.object({ phone: z.string().min(1) }).parse(req.query);

    const customer = await Customer.findOne({ phone, deletedAt: null })
      .select('name addresses')
      .lean();

    if (!customer) {
      sendError(res, 'Customer not found', 404, 'NOT_FOUND');
      return;
    }

    const defaultAddr = customer.addresses.find((a) => a.isDefault) ?? customer.addresses[0];

    sendSuccess(res, {
      name: customer.name,
      address: defaultAddr?.address ?? '',
      city: defaultAddr?.city ?? '',
      area: defaultAddr?.area ?? '',
    });
  } catch (err) {
    next(err);
  }
});

export default router;
