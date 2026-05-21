import { Router } from 'express';
import { Product } from '../../models/Product.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(48, Math.max(1, Number(req.query['limit'] ?? 12)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isActive: true, deletedAt: null };
    if (req.query['search']) filter['$text'] = { $search: req.query['search'] };
    if (req.query['category']) filter['category'] = req.query['category'];

    const sortMap: Record<string, string> = {
      newest: '-createdAt',
      oldest: 'createdAt',
      price_asc: 'variants.0.price',
      price_desc: '-variants.0.price',
      popular: '-totalSold',
    };
    const sort = sortMap[req.query['sort'] as string] ?? '-createdAt';

    const [products, total] = await Promise.all([
      Product.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
    ]);

    sendPaginated(res, products, { page, limit, total });
  } catch (err) {
    next(err);
  }
});

// GET /api/products/categories
router.get('/categories', async (_req, res, next) => {
  try {
    const categories = await Product.distinct('category', { isActive: true, deletedAt: null });
    sendSuccess(res, categories);
  } catch (err) {
    next(err);
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params['slug'],
      isActive: true,
      deletedAt: null,
    }).lean();
    if (!product) {
      sendError(res, 'Product not found', 404, 'NOT_FOUND');
      return;
    }
    sendSuccess(res, product);
  } catch (err) {
    next(err);
  }
});

export default router;
