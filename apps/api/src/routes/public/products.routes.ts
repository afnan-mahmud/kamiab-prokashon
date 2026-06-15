import { Router } from 'express';
import { isValidObjectId } from 'mongoose';
import { Product } from '../../models/Product.js';
import { Category } from '../../models/Category.js';
import { sendSuccess, sendError, sendPaginated } from '../../utils/api-response.js';

const router: Router = Router();

// GET /api/products
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(1, Number(req.query['page'] ?? 1));
    const limit = Math.min(48, Math.max(1, Number(req.query['limit'] ?? 12)));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = { isActive: true, deletedAt: null };
    if (req.query['search']) filter['$text'] = { $search: String(req.query['search']) };

    if (req.query['category']) {
      const slug = String(req.query['category']);
      const cats = await Category.find({ isActive: true, deletedAt: null })
        .select('slug parent _id')
        .lean();
      const match = cats.find((c) => c.slug === slug);
      if (match) {
        const childrenByParent = new Map<string, typeof cats>();
        cats.forEach((c) => {
          const key = c.parent ? String(c.parent) : 'root';
          const arr = childrenByParent.get(key) ?? [];
          arr.push(c);
          childrenByParent.set(key, arr);
        });
        const slugs: string[] = [];
        const visited = new Set<string>();
        const stack = [match];
        while (stack.length) {
          const cur = stack.pop()!;
          const curId = String(cur._id);
          if (visited.has(curId)) continue;
          visited.add(curId);
          slugs.push(cur.slug);
          (childrenByParent.get(curId) ?? []).forEach((ch) => stack.push(ch));
        }
        filter['category'] = { $in: slugs };
      } else {
        filter['category'] = slug;
      }
    }

    const minPrice = req.query['minPrice'] ? Number(req.query['minPrice']) : undefined;
    const maxPrice = req.query['maxPrice'] ? Number(req.query['maxPrice']) : undefined;
    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceCond: Record<string, number> = {};
      if (minPrice !== undefined) priceCond['$gte'] = minPrice;
      if (maxPrice !== undefined) priceCond['$lte'] = maxPrice;
      filter['variants'] = { $elemMatch: { price: priceCond } };
    }

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

// GET /api/products/suggested — best-selling products (most ordered)
router.get('/suggested', async (req, res, next) => {
  try {
    const limit = Math.min(10, Math.max(1, Number(req.query['limit'] ?? 5)));
    const filter: Record<string, unknown> = { isActive: true, deletedAt: null };

    // Exclude the current product (accepts id or slug)
    const exclude = req.query['exclude'] as string | undefined;
    if (exclude) {
      filter[isValidObjectId(exclude) ? '_id' : 'slug'] = { $ne: exclude };
    }

    const products = await Product.find(filter)
      .sort('-totalSold')
      .limit(limit)
      .lean();

    sendSuccess(res, products);
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
