import { Router } from 'express';
import { Banner } from '../../models/Banner.js';
import { sendSuccess } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/banners — active banners, ordered
router.get('/', async (_req, res, next) => {
  try {
    const banners = await Banner.find({ isActive: true }).sort({ order: 1 }).lean();
    sendSuccess(res, banners);
  } catch (err) {
    next(err);
  }
});

export default router;
