import { Router } from 'express';
import { Publisher } from '../../models/Publisher.js';
import { Product } from '../../models/Product.js';
import { sendSuccess, sendError } from '../../utils/api-response.js';

const router: Router = Router();

const nameRegex = (name: string) => new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');

// GET /api/publishers/:name — public publisher detail + their books
router.get('/:name', async (req, res, next) => {
  try {
    const name = String(req.params['name'] ?? '').trim();
    if (!name) {
      sendError(res, 'Publisher not found', 404, 'NOT_FOUND');
      return;
    }

    const publisher = await Publisher.findOne({
      name: nameRegex(name),
      isActive: true,
      deletedAt: null,
    }).lean();

    const canonicalName = publisher?.name ?? name;
    const products = await Product.find({
      publisher: nameRegex(canonicalName),
      isActive: true,
      deletedAt: null,
    })
      .sort('-createdAt')
      .lean();

    if (!publisher && products.length === 0) {
      sendError(res, 'Publisher not found', 404, 'NOT_FOUND');
      return;
    }

    sendSuccess(res, {
      publisher: publisher
        ? { _id: publisher._id, name: publisher.name, bio: publisher.bio ?? '', image: publisher.image ?? null }
        : { name: canonicalName },
      products,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
