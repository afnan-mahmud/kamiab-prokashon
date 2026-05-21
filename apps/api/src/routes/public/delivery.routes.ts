import { Router } from 'express';
import { DeliverySettings } from '../../models/DeliverySettings.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/delivery/charges — public, returns only charge config (no API keys)
router.get('/charges', async (_req, res, next) => {
  try {
    const settings = await DeliverySettings.findOne().select('charges').lean();
    const charges = settings?.charges ?? {
      insideDhaka: 60,
      outsideDhaka: 120,
      extraPerKg: 20,
      baseWeightKg: 1,
    };
    sendSuccess(res, charges);
  } catch (err) {
    next(err);
  }
});

export default router;
