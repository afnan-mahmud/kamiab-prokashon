import { Router } from 'express';
import { z } from 'zod';
import { LandingPage } from '../../models/LandingPage.js';
import { requirePermission } from '../../middleware/require-permission.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';

const router: Router = Router();

const contentSectionSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('text'), content: z.string() }),
  z.object({ type: z.literal('image'), url: z.string(), alt: z.string().default('') }),
  z.object({ type: z.literal('video'), embedUrl: z.string() }),
  z.object({
    type: z.literal('features'),
    items: z.array(z.object({ icon: z.string(), title: z.string(), desc: z.string() })),
  }),
  z.object({
    type: z.literal('testimonial'),
    items: z.array(z.object({ name: z.string(), text: z.string(), rating: z.number().optional() })),
  }),
  z.object({
    type: z.literal('faq'),
    items: z.array(z.object({ q: z.string(), a: z.string() })),
  }),
  z.object({ type: z.literal('why_product'), items: z.array(z.string()) }),
  z.object({ type: z.literal('why_us'), items: z.array(z.string()) }),
]);

const contentSchema = z.object({
  heroImage: z.object({ url: z.string(), publicId: z.string() }).optional(),
  heroTitle: z.string().default(''),
  heroSubtitle: z.string().default(''),
  sections: z.array(contentSectionSchema).default([]),
  colors: z
    .object({
      primary: z.string(),
      accent: z.string(),
      background: z.string(),
    })
    .optional(),
  ctaText: z.string().default('অর্ডার করুন'),
});

const createLandingPageSchema = z.object({
  name: z.string().min(1).trim(),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens'),
  template: z.enum(['template1', 'template2', 'template3', 'template4']),
  product: z.string().min(1),
  selectedVariants: z.array(z.string()).default([]),
  content: contentSchema.optional(),
  isActive: z.boolean().default(true),
});

const updateLandingPageSchema = createLandingPageSchema.partial();

// GET /api/admin/landing-pages
router.get('/', requirePermission('landing.view'), async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20)));
    const skip = (page - 1) * limit;

    const [pages, total] = await Promise.all([
      LandingPage.find()
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .populate('product', 'name images')
        .lean(),
      LandingPage.countDocuments(),
    ]);

    sendPaginated(res, pages, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/landing-pages/:id
router.get('/:id', requirePermission('landing.view'), async (req, res, next) => {
  try {
    const page = await LandingPage.findById(req.params['id'])
      .populate('product', 'name images variants')
      .lean();
    if (!page) {
      sendError(res, 'Landing page not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, page);
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/landing-pages
router.post('/', requirePermission('landing.create'), async (req, res, next) => {
  try {
    const data = createLandingPageSchema.parse(req.body);
    const exists = await LandingPage.findOne({ slug: data.slug });
    if (exists) {
      sendError(res, 'Slug already in use', 409, 'CONFLICT');
      return;
    }
    const lp = await LandingPage.create(data);
    sendSuccess(res, lp, 201);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/landing-pages/:id
router.patch('/:id', requirePermission('landing.edit'), async (req, res, next) => {
  try {
    const data = updateLandingPageSchema.parse(req.body);

    if (data.slug) {
      const exists = await LandingPage.findOne({ slug: data.slug, _id: { $ne: req.params['id'] } });
      if (exists) {
        sendError(res, 'Slug already in use', 409, 'CONFLICT');
        return;
      }
    }

    const lp = await LandingPage.findByIdAndUpdate(req.params['id'], { $set: data }, { new: true });
    if (!lp) {
      sendError(res, 'Landing page not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, lp);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/admin/landing-pages/:id
router.delete('/:id', requirePermission('landing.delete'), async (req, res, next) => {
  try {
    const lp = await LandingPage.findByIdAndDelete(req.params['id']);
    if (!lp) {
      sendError(res, 'Landing page not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, { deleted: true });
  } catch (err) {
    next(err);
  }
});

export default router;
