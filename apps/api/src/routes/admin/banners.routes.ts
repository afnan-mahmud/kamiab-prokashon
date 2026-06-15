import { Router } from 'express';
import { z } from 'zod';
import { Banner } from '../../models/Banner.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const imageSchema = z.object({ url: z.string().url(), publicId: z.string() });

const bannerSchema = z.object({
  title: z.string().trim().optional(),
  desktopImage: imageSchema,
  mobileImage: imageSchema,
  link: z.string().trim().optional(),
  order: z.number().default(0),
  isActive: z.boolean().default(true),
});

router.get('/', requirePermission('banners.view'), async (_req, res, next) => {
  try {
    const banners = await Banner.find().sort({ order: 1, createdAt: -1 }).lean();
    sendSuccess(res, banners);
  } catch (err) {
    next(err);
  }
});

router.post('/', requirePermission('banners.create'), async (req, res, next) => {
  try {
    const data = bannerSchema.parse(req.body);
    const banner = await Banner.create(data);
    sendSuccess(res, banner, 201);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', requirePermission('banners.edit'), async (req, res, next) => {
  try {
    const banner = await Banner.findById(req.params['id']);
    if (!banner) {
      sendError(res, 'Banner not found', 404, 'NOT_FOUND');
      return;
    }
    const data = bannerSchema.partial().parse(req.body);
    Object.assign(banner, data);
    await banner.save();
    sendSuccess(res, banner);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', requirePermission('banners.delete'), async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params['id']);
    if (!banner) {
      sendError(res, 'Banner not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
